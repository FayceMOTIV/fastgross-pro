/**
 * Service Stripe pour les paiements
 * Gestion des paiements de factures et abonnements B2B
 */

import Stripe from 'stripe';

// ============================================
// CONFIGURATION
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fastgross.pro';

// Client Stripe (lazy init)
let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET_KEY) {
    console.warn('⚠️ Stripe non configuré - Paiements désactivés');
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    });
  }

  return stripeClient;
}

/**
 * Vérifie si Stripe est configuré
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}

// ============================================
// TYPES
// ============================================

export interface PaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface CustomerResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

export interface InvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // en euros
  customerEmail: string;
  customerName: string;
  description?: string;
}

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

export const stripeService = {
  /**
   * Crée un Payment Intent pour une facture
   */
  createInvoicePaymentIntent: async (data: InvoiceData): Promise<PaymentIntentResult> => {
    const stripe = getStripe();

    if (!stripe) {
      // Mode mock pour développement
      console.log('💳 [STRIPE MOCK] PaymentIntent:', data);
      return {
        success: true,
        clientSecret: `mock_secret_${Date.now()}`,
        paymentIntentId: `mock_pi_${Date.now()}`,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convertir en centimes
        currency: 'eur',
        receipt_email: data.customerEmail,
        description: data.description || `Paiement facture ${data.invoiceNumber}`,
        metadata: {
          invoiceId: data.invoiceId,
          invoiceNumber: data.invoiceNumber,
          customerName: data.customerName,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('❌ Erreur Stripe PaymentIntent:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du paiement',
      };
    }
  },

  /**
   * Crée une session Checkout pour payer une facture
   */
  createCheckoutSession: async (data: InvoiceData): Promise<CheckoutSessionResult> => {
    const stripe = getStripe();

    if (!stripe) {
      console.log('💳 [STRIPE MOCK] CheckoutSession:', data);
      return {
        success: true,
        sessionId: `mock_session_${Date.now()}`,
        url: `${APP_URL}/portail/factures?mock_payment=success`,
      };
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'sepa_debit'],
        mode: 'payment',
        customer_email: data.customerEmail,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Facture ${data.invoiceNumber}`,
                description: data.description || `Paiement facture ${data.invoiceNumber} - ${data.customerName}`,
              },
              unit_amount: Math.round(data.amount * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoiceId: data.invoiceId,
          invoiceNumber: data.invoiceNumber,
          customerName: data.customerName,
        },
        success_url: `${APP_URL}/portail/factures/${data.invoiceId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/portail/factures/${data.invoiceId}?payment=cancelled`,
        locale: 'fr',
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url || undefined,
      };
    } catch (error: any) {
      console.error('❌ Erreur Stripe CheckoutSession:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création de la session de paiement',
      };
    }
  },

  /**
   * Crée ou récupère un client Stripe
   */
  getOrCreateCustomer: async (
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<CustomerResult> => {
    const stripe = getStripe();

    if (!stripe) {
      return {
        success: true,
        customerId: `mock_cus_${Date.now()}`,
      };
    }

    try {
      // Chercher un client existant
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return {
          success: true,
          customerId: existingCustomers.data[0].id,
        };
      }

      // Créer un nouveau client
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          source: 'fastgross-pro',
        },
      });

      return {
        success: true,
        customerId: customer.id,
      };
    } catch (error: any) {
      console.error('❌ Erreur Stripe Customer:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Crée un lien vers le portail client Stripe
   */
  createCustomerPortalSession: async (customerId: string): Promise<CheckoutSessionResult> => {
    const stripe = getStripe();

    if (!stripe) {
      return {
        success: true,
        url: `${APP_URL}/portail/factures?mock_portal=true`,
      };
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/portail/factures`,
      });

      return {
        success: true,
        url: session.url,
      };
    } catch (error: any) {
      console.error('❌ Erreur Stripe Portal:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère le statut d'un Payment Intent
   */
  getPaymentIntentStatus: async (paymentIntentId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    error?: string;
  }> => {
    const stripe = getStripe();

    if (!stripe) {
      return {
        success: true,
        status: 'succeeded',
        amount: 100,
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Vérifie la signature d'un webhook Stripe
   */
  verifyWebhookSignature: (
    payload: string | Buffer,
    signature: string
  ): { success: boolean; event?: Stripe.Event; error?: string } => {
    const stripe = getStripe();

    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      return {
        success: false,
        error: 'Stripe ou webhook secret non configuré',
      };
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_WEBHOOK_SECRET
      );

      return {
        success: true,
        event,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Génère un lien de paiement
   */
  createPaymentLink: async (
    invoiceNumber: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    const stripe = getStripe();

    if (!stripe) {
      return {
        success: true,
        url: `${APP_URL}/pay?mock=true&amount=${amount}`,
      };
    }

    try {
      // Créer un produit temporaire
      const product = await stripe.products.create({
        name: `Facture ${invoiceNumber}`,
        description: description || `Paiement de la facture ${invoiceNumber}`,
      });

      // Créer un prix
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(amount * 100),
        currency: 'eur',
      });

      // Créer le lien de paiement
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          invoiceNumber,
        },
      });

      return {
        success: true,
        url: paymentLink.url,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// ============================================
// WEBHOOKS HANDLERS
// ============================================

export const stripeWebhooks = {
  /**
   * Gère les événements de paiement réussi
   */
  handlePaymentSucceeded: async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
    const { invoiceId, invoiceNumber } = paymentIntent.metadata;

    console.log('✅ Paiement réussi:', {
      paymentIntentId: paymentIntent.id,
      invoiceId,
      invoiceNumber,
      amount: paymentIntent.amount / 100,
    });

    // TODO: Mettre à jour la facture dans Firestore
    // TODO: Envoyer un email de confirmation
    // TODO: Mettre à jour le solde client
  },

  /**
   * Gère les événements de paiement échoué
   */
  handlePaymentFailed: async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
    const { invoiceId, invoiceNumber } = paymentIntent.metadata;

    console.log('❌ Paiement échoué:', {
      paymentIntentId: paymentIntent.id,
      invoiceId,
      invoiceNumber,
      error: paymentIntent.last_payment_error?.message,
    });

    // TODO: Notifier le client
    // TODO: Mettre à jour la facture
  },
};

export default stripeService;
