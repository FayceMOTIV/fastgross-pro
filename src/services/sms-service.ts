/**
 * SMS Service - SMS & WhatsApp Marketing + Twilio Integration
 * Provides SMS campaign management, templates, and transactional SMS
 */

import twilio from 'twilio';
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

// ============================================
// TWILIO CONFIGURATION
// ============================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+33700000000';

// Twilio client (lazy init)
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio non configuré - SMS transactionnels désactivés');
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

/**
 * Vérifie si Twilio est configuré
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
}

// ============================================
// TWILIO TRANSACTIONAL SMS
// ============================================

interface TwilioSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envoie un SMS via Twilio
 */
async function sendTwilioSMS(to: string, body: string): Promise<TwilioSMSResult> {
  const client = getTwilioClient();

  if (!client) {
    // Mode développement: simuler l'envoi
    console.log('📱 [SMS MOCK]', { to, body });
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  try {
    // Formater le numéro français pour Twilio
    let formattedTo = to.replace(/[\s.-]/g, '');
    if (formattedTo.startsWith('0')) {
      formattedTo = '+33' + formattedTo.substring(1);
    }
    if (!formattedTo.startsWith('+')) {
      formattedTo = '+33' + formattedTo;
    }

    const message = await client.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to: formattedTo,
    });

    console.log('✅ SMS Twilio envoyé:', message.sid);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error('❌ Erreur SMS Twilio:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
}

/**
 * Service SMS transactionnels Twilio
 */
export const twilioSMS = {
  /**
   * Notification de livraison en cours
   */
  sendDeliveryNotification: async (
    to: string,
    orderNumber: string,
    eta: string,
    driverName?: string
  ): Promise<TwilioSMSResult> => {
    const driverInfo = driverName ? ` par ${driverName}` : '';
    const body = `🚚 DISTRAM: Votre commande ${orderNumber} est en cours de livraison${driverInfo}. Arrivée estimée: ${eta}`;
    return sendTwilioSMS(to, body);
  },

  /**
   * Confirmation de commande
   */
  sendOrderConfirmation: async (
    to: string,
    orderNumber: string,
    totalTTC: number,
    clientName: string
  ): Promise<TwilioSMSResult> => {
    const body = `✅ DISTRAM: Bonjour ${clientName}, commande ${orderNumber} confirmée (${totalTTC.toFixed(2)}€ TTC). Livraison sous 24h.`;
    return sendTwilioSMS(to, body);
  },

  /**
   * Commande expédiée
   */
  sendOrderShipped: async (to: string, orderNumber: string): Promise<TwilioSMSResult> => {
    const body = `📦 DISTRAM: Commande ${orderNumber} expédiée ! Livraison dans les prochaines heures.`;
    return sendTwilioSMS(to, body);
  },

  /**
   * Commande livrée
   */
  sendOrderDelivered: async (to: string, orderNumber: string): Promise<TwilioSMSResult> => {
    const body = `✅ DISTRAM: Commande ${orderNumber} livrée avec succès. Merci de votre confiance !`;
    return sendTwilioSMS(to, body);
  },

  /**
   * Alerte stock faible (pour managers)
   */
  sendStockAlert: async (
    to: string,
    productName: string,
    currentStock: number,
    depot: string
  ): Promise<TwilioSMSResult> => {
    const body = `⚠️ ALERTE STOCK ${depot.toUpperCase()}: ${productName} - Stock: ${currentStock}. Réappro urgente requise.`;
    return sendTwilioSMS(to, body);
  },

  /**
   * Nouveau prospect (notification commercial)
   */
  sendNewProspectNotification: async (
    commercialPhone: string,
    clientName: string,
    restaurantType: string,
    ville: string
  ): Promise<TwilioSMSResult> => {
    const body = `🆕 DISTRAM: Nouveau prospect ! ${clientName} (${restaurantType}) à ${ville}. Contactez-le rapidement !`;
    return sendTwilioSMS(commercialPhone, body);
  },

  /**
   * Code de vérification
   */
  sendVerificationCode: async (to: string, code: string): Promise<TwilioSMSResult> => {
    const body = `🔐 DISTRAM: Votre code de vérification est ${code}. Valide 5 minutes.`;
    return sendTwilioSMS(to, body);
  },

  /**
   * SMS personnalisé
   */
  sendCustom: async (to: string, message: string): Promise<TwilioSMSResult> => {
    const body = message.startsWith('DISTRAM') ? message : `DISTRAM: ${message}`;
    return sendTwilioSMS(to, body);
  },
};

// Types
export interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  audience: string[];
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledAt?: Date;
  sentAt?: Date;
  stats: {
    sent: number;
    delivered: number;
    clicked: number;
    failed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SMSTemplate {
  id: string;
  name: string;
  message: string;
  category: string;
  variables: string[];
}

export interface WhatsAppMessage {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  templateName: string;
  templateData: Record<string, string>;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

// SMS Templates
export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: "sms_rdv",
    name: "Rappel RDV",
    message: "RDV demain {{heure}} avec {{commercial}}. Questions? {{phone}}",
    category: "Rappels",
    variables: ["heure", "commercial", "phone"],
  },
  {
    id: "sms_promo",
    name: "Promo Flash",
    message: "🔥 -{{pourcentage}}% aujourd'hui sur {{produit}}! Commandez: {{link}}",
    category: "Promotions",
    variables: ["pourcentage", "produit", "link"],
  },
  {
    id: "sms_welcome",
    name: "Bienvenue",
    message: "Bienvenue chez FastGross {{prenom}}! Votre code -10%: {{code}}. Catalogue: {{link}}",
    category: "Onboarding",
    variables: ["prenom", "code", "link"],
  },
  {
    id: "sms_delivery",
    name: "Suivi livraison",
    message: "Votre commande #{{numero}} est en route! Arrivée estimée: {{heure}}. Suivi: {{link}}",
    category: "Livraison",
    variables: ["numero", "heure", "link"],
  },
  {
    id: "sms_relance",
    name: "Relance douce",
    message: "{{prenom}}, ça fait un moment! -15% sur votre prochaine commande avec RETOUR15. {{link}}",
    category: "Relance",
    variables: ["prenom", "link"],
  },
  {
    id: "sms_feedback",
    name: "Demande avis",
    message: "Merci {{prenom}}! Comment s'est passée votre livraison? Notez-nous: {{link}}",
    category: "Feedback",
    variables: ["prenom", "link"],
  },
  {
    id: "sms_stock",
    name: "Alerte stock",
    message: "{{produit}} de nouveau disponible! Stock limité. Commandez vite: {{link}}",
    category: "Stock",
    variables: ["produit", "link"],
  },
  {
    id: "sms_anniversaire",
    name: "Anniversaire",
    message: "Joyeux anniversaire {{prenom}}! 🎂 Cadeau: -20% avec ANNIV{{annee}}. Valable 7j!",
    category: "Fidélité",
    variables: ["prenom", "annee"],
  },
];

// WhatsApp Templates (Meta Business API format)
export const WHATSAPP_TEMPLATES = [
  {
    name: "order_confirmation",
    language: "fr",
    category: "TRANSACTIONAL",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Confirmation de commande",
      },
      {
        type: "BODY",
        text: "Bonjour {{1}}! Votre commande #{{2}} a bien été enregistrée. Montant: {{3}}€. Livraison prévue: {{4}}.",
      },
      {
        type: "FOOTER",
        text: "FastGross Pro",
      },
    ],
  },
  {
    name: "delivery_update",
    language: "fr",
    category: "TRANSACTIONAL",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "📦 Mise à jour livraison",
      },
      {
        type: "BODY",
        text: "Votre commande #{{1}} est {{2}}. {{3}}",
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "URL", text: "Suivre ma commande", url: "{{1}}" },
        ],
      },
    ],
  },
];

// Character count for SMS (considering GSM-7 encoding)
export function countSMSCharacters(message: string): {
  characters: number;
  segments: number;
  encoding: "GSM-7" | "Unicode";
} {
  // GSM-7 characters
  const gsm7Chars = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const gsm7Extended = "^{}\\[~]|€";

  let charCount = 0;
  let isGSM7 = true;

  for (const char of message) {
    if (gsm7Chars.includes(char)) {
      charCount += 1;
    } else if (gsm7Extended.includes(char)) {
      charCount += 2; // Extended characters count as 2
    } else {
      isGSM7 = false;
      break;
    }
  }

  if (!isGSM7) {
    charCount = message.length;
  }

  const encoding = isGSM7 ? "GSM-7" : "Unicode";
  const maxChars = isGSM7 ? 160 : 70;
  const maxCharsConcat = isGSM7 ? 153 : 67;

  let segments: number;
  if (charCount <= maxChars) {
    segments = 1;
  } else {
    segments = Math.ceil(charCount / maxCharsConcat);
  }

  return { characters: charCount, segments, encoding };
}

// Replace template variables
export function replaceVariables(
  template: string,
  data: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// Generate short link for SMS tracking
export function generateShortLink(
  originalUrl: string,
  campaignId: string,
  recipientId?: string
): string {
  // In production, use a URL shortener service
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fastgross.pro";
  const params = new URLSearchParams({
    url: originalUrl,
    c: campaignId,
    ...(recipientId && { r: recipientId }),
  });
  return `${baseUrl}/l?${params.toString()}`;
}

/**
 * Create SMS campaign
 */
export async function createSMSCampaign(
  campaign: Omit<SMSCampaign, "id" | "stats" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "sms_campaigns"), {
    ...campaign,
    stats: { sent: 0, delivered: 0, clicked: 0, failed: 0 },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

/**
 * Send SMS campaign
 * In production, integrate with SMS provider (Twilio, MessageBird, etc.)
 */
export async function sendSMSCampaign(campaignId: string): Promise<{
  success: boolean;
  sent: number;
  failed: number;
}> {
  // Simulate sending
  await new Promise((r) => setTimeout(r, 2000));

  // In production:
  // 1. Fetch campaign details
  // 2. Get audience phone numbers
  // 3. Call SMS provider API
  // 4. Update campaign stats

  const mockSent = Math.floor(Math.random() * 100) + 50;
  const mockFailed = Math.floor(Math.random() * 5);

  await updateDoc(doc(db, "sms_campaigns", campaignId), {
    status: "sent",
    sentAt: Timestamp.now(),
    "stats.sent": mockSent,
    "stats.failed": mockFailed,
    updatedAt: Timestamp.now(),
  });

  return {
    success: true,
    sent: mockSent,
    failed: mockFailed,
  };
}

/**
 * Schedule SMS campaign
 */
export async function scheduleSMSCampaign(
  campaignId: string,
  scheduledAt: Date
): Promise<void> {
  await updateDoc(doc(db, "sms_campaigns", campaignId), {
    status: "scheduled",
    scheduledAt: Timestamp.fromDate(scheduledAt),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get all SMS campaigns
 */
export async function getSMSCampaigns(): Promise<SMSCampaign[]> {
  const q = query(collection(db, "sms_campaigns"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    scheduledAt: doc.data().scheduledAt?.toDate(),
    sentAt: doc.data().sentAt?.toDate(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as SMSCampaign[];
}

/**
 * Send WhatsApp message
 * In production, integrate with Meta Business API
 */
export async function sendWhatsAppMessage(
  _recipientPhone: string,
  _templateName: string,
  _templateData: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Simulate API call
  await new Promise((r) => setTimeout(r, 1000));

  // In production:
  // const response = await fetch('https://graph.facebook.com/v17.0/{phone-number-id}/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     messaging_product: 'whatsapp',
  //     to: recipientPhone,
  //     type: 'template',
  //     template: {
  //       name: templateName,
  //       language: { code: 'fr' },
  //       components: [...]
  //     }
  //   })
  // });

  return {
    success: true,
    messageId: `wa_${Date.now()}`,
  };
}

/**
 * Send bulk WhatsApp messages
 */
export async function sendBulkWhatsApp(
  recipients: { phone: string; data: Record<string, string> }[],
  templateName: string,
  _onProgress?: (sent: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i++) {
    const result = await sendWhatsAppMessage(
      recipients[i].phone,
      templateName,
      recipients[i].data
    );

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    _onProgress?.(i + 1, recipients.length);

    // Rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return { success, failed };
}

/**
 * Validate phone number (French format)
 */
export function validateFrenchPhone(phone: string): {
  valid: boolean;
  formatted: string;
  international: string;
} {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Check French formats
  if (digits.length === 10 && digits.startsWith("0")) {
    // 0612345678 format
    return {
      valid: true,
      formatted: digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"),
      international: `+33${digits.substring(1)}`,
    };
  } else if (digits.length === 11 && digits.startsWith("33")) {
    // 33612345678 format
    return {
      valid: true,
      formatted: `0${digits.substring(2)}`.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"),
      international: `+${digits}`,
    };
  } else if (digits.length === 12 && digits.startsWith("330")) {
    // 330612345678 format
    return {
      valid: true,
      formatted: digits.substring(2).replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"),
      international: `+33${digits.substring(3)}`,
    };
  }

  return {
    valid: false,
    formatted: phone,
    international: phone,
  };
}

/**
 * Estimate SMS cost
 */
export function estimateSMSCost(
  recipientCount: number,
  messageLength: number,
  isGSM7 = true
): { segments: number; totalSMS: number; estimatedCost: number } {
  const maxChars = isGSM7 ? 160 : 70;
  const maxCharsConcat = isGSM7 ? 153 : 67;

  const segments = messageLength <= maxChars ? 1 : Math.ceil(messageLength / maxCharsConcat);
  const totalSMS = recipientCount * segments;

  // Approximate cost per SMS in France (varies by provider)
  const costPerSMS = 0.045; // €0.045 per segment
  const estimatedCost = totalSMS * costPerSMS;

  return {
    segments,
    totalSMS,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
  };
}

/**
 * Get SMS campaign stats
 */
export async function getSMSStats(_period: "7d" | "30d" | "90d" = "30d"): Promise<{
  totalSent: number;
  deliveryRate: number;
  clickRate: number;
  campaigns: number;
}> {
  // In production, aggregate from Firestore
  return {
    totalSent: 4520,
    deliveryRate: 97.2,
    clickRate: 12.8,
    campaigns: 15,
  };
}
