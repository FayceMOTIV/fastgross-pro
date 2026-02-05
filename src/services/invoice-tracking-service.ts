/**
 * Invoice Tracking Service - Track invoices and automatic reminders
 * Manages payment follow-ups and escalation
 */

// Types
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: Date;
  method: "bank_transfer" | "check" | "card" | "cash";
  reference?: string;
}

export interface InvoiceReminder {
  id: string;
  invoiceId: string;
  type: "email" | "sms" | "call" | "letter";
  sentAt: Date;
  template: string;
  sentBy: string;
  response?: string;
  responseDate?: Date;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  orderId: string;
  amount: number;
  issueDate: Date;
  dueDate: Date;
  status: "pending" | "sent" | "overdue" | "partially_paid" | "paid" | "disputed";
  amountPaid: number;
  amountDue: number;
  reminders: InvoiceReminder[];
  paymentHistory: Payment[];
  notes?: string;
  paymentPromiseDate?: Date;
  disputeReason?: string;
}

export interface InvoiceAlert {
  id: string;
  type: "due_soon" | "overdue" | "long_overdue" | "payment_promise_broken" | "dispute";
  severity: "info" | "warning" | "critical";
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  daysOverdue: number;
  description: string;
  suggestedAction: string;
  nextReminderDate?: Date;
  reminderLevel: number;
  detectedAt: Date;
}

export interface ReminderTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: "email" | "email+sms" | "email+letter";
  daysAfterDue: number;
  level: number;
}

// Reminder templates
export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    id: "reminder_1",
    name: "Premier rappel",
    subject: "Rappel : Facture {{numero}} en attente de paiement",
    body: `Bonjour {{contact}},

Sauf erreur de notre part, la facture n°{{numero}} d'un montant de {{montant}}€, arrivée à échéance le {{date_echeance}}, reste impayée à ce jour.

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Si vous avez déjà effectué ce paiement, merci de ne pas tenir compte de ce message et de nous en informer.

Cordialement,
L'équipe comptabilité FastGross Pro

---
Détails de la facture :
- Numéro : {{numero}}
- Montant : {{montant}}€
- Échéance : {{date_echeance}}
- Référence commande : {{ref_commande}}`,
    channel: "email",
    daysAfterDue: 3,
    level: 1,
  },
  {
    id: "reminder_2",
    name: "Second rappel",
    subject: "Second rappel : Facture {{numero}} - Échéance dépassée",
    body: `Bonjour {{contact}},

Malgré notre précédent rappel, nous constatons que la facture n°{{numero}} d'un montant de {{montant}}€ n'a toujours pas été réglée.

Cette facture est en retard de {{jours_retard}} jours.

Nous vous prions de bien vouloir régulariser cette situation dans les plus brefs délais afin d'éviter tout désagrément.

Si vous rencontrez des difficultés de paiement, n'hésitez pas à nous contacter pour convenir d'un arrangement.

Cordialement,
L'équipe comptabilité FastGross Pro`,
    channel: "email",
    daysAfterDue: 10,
    level: 2,
  },
  {
    id: "reminder_3",
    name: "Relance ferme",
    subject: "URGENT : Facture {{numero}} - Action requise",
    body: `Bonjour {{contact}},

Nous vous avons déjà contacté à plusieurs reprises concernant la facture n°{{numero}} d'un montant de {{montant}}€, échue depuis {{jours_retard}} jours.

Sans règlement de votre part sous 5 jours ouvrés, nous serons dans l'obligation de :
- Suspendre vos commandes en cours
- Transmettre votre dossier au service contentieux

Merci de nous contacter immédiatement pour régulariser cette situation.

Cordialement,
Direction commerciale - FastGross Pro
Tél : 04 91 00 00 00`,
    channel: "email+sms",
    daysAfterDue: 20,
    level: 3,
  },
  {
    id: "reminder_final",
    name: "Mise en demeure",
    subject: "MISE EN DEMEURE - Facture {{numero}}",
    body: `{{contact}},

Par la présente, nous vous mettons en demeure de régler sous 8 jours la somme de {{montant}}€ correspondant à la facture n°{{numero}} du {{date_facture}}, majorée des intérêts de retard prévus aux conditions générales de vente.

À défaut de règlement dans ce délai, nous transmettrons votre dossier à notre cabinet de recouvrement sans autre avis.

Cette mise en demeure vaut également notification de la suspension de votre compte client.

Direction générale - FastGross Pro`,
    channel: "email+letter",
    daysAfterDue: 30,
    level: 4,
  },
];

// Mock invoices data
function generateMockInvoices(): Invoice[] {
  const now = new Date();
  const invoices: Invoice[] = [
    {
      id: "inv_1",
      number: "F-2025-0892",
      clientId: "client_2",
      clientName: "Pizza Express",
      clientEmail: "compta@pizzaexpress.fr",
      clientPhone: "04 93 XX XX XX",
      orderId: "order_123",
      amount: 1250.0,
      issueDate: new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      status: "overdue",
      amountPaid: 0,
      amountDue: 1250.0,
      reminders: [
        {
          id: "rem_1",
          invoiceId: "inv_1",
          type: "email",
          sentAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
          template: "reminder_1",
          sentBy: "system",
        },
      ],
      paymentHistory: [],
    },
    {
      id: "inv_2",
      number: "F-2025-0915",
      clientId: "client_3",
      clientName: "Burger King Local",
      clientEmail: "contact@bklocal.fr",
      orderId: "order_456",
      amount: 2340.5,
      issueDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
      status: "overdue",
      amountPaid: 500,
      amountDue: 1840.5,
      reminders: [
        {
          id: "rem_2",
          invoiceId: "inv_2",
          type: "email",
          sentAt: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000),
          template: "reminder_1",
          sentBy: "system",
        },
        {
          id: "rem_3",
          invoiceId: "inv_2",
          type: "email",
          sentAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          template: "reminder_2",
          sentBy: "system",
        },
        {
          id: "rem_4",
          invoiceId: "inv_2",
          type: "email",
          sentAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          template: "reminder_3",
          sentBy: "Marie L.",
          response: "Promis paiement le 25/01",
          responseDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        },
      ],
      paymentHistory: [
        {
          id: "pay_1",
          invoiceId: "inv_2",
          amount: 500,
          date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          method: "bank_transfer",
          reference: "VIR-20250105",
        },
      ],
      paymentPromiseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Promise broken
    },
    {
      id: "inv_3",
      number: "F-2025-0923",
      clientId: "client_1",
      clientName: "Kebab du Coin",
      clientEmail: "kebabducoin@gmail.com",
      orderId: "order_789",
      amount: 890.0,
      issueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: "sent",
      amountPaid: 0,
      amountDue: 890.0,
      reminders: [],
      paymentHistory: [],
    },
    {
      id: "inv_4",
      number: "F-2025-0901",
      clientId: "client_4",
      clientName: "Tacos Master",
      clientEmail: "admin@tacosmaster.fr",
      orderId: "order_101",
      amount: 1560.0,
      issueDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
      status: "disputed",
      amountPaid: 0,
      amountDue: 1560.0,
      reminders: [
        {
          id: "rem_5",
          invoiceId: "inv_4",
          type: "email",
          sentAt: new Date(now.getTime() - 47 * 24 * 60 * 60 * 1000),
          template: "reminder_1",
          sentBy: "system",
          response: "Contestation: produits non conformes",
          responseDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        },
      ],
      paymentHistory: [],
      disputeReason: "Produits non conformes - demande avoir de 400€",
    },
    {
      id: "inv_5",
      number: "F-2025-0930",
      clientId: "client_5",
      clientName: "Snack Gourmet",
      clientEmail: "snackgourmet@orange.fr",
      orderId: "order_202",
      amount: 675.0,
      issueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: "sent",
      amountPaid: 0,
      amountDue: 675.0,
      reminders: [],
      paymentHistory: [],
    },
  ];

  return invoices;
}

// Get mock invoices
let mockInvoicesCache: Invoice[] | null = null;
function getMockInvoices(): Invoice[] {
  if (!mockInvoicesCache) {
    mockInvoicesCache = generateMockInvoices();
  }
  return mockInvoicesCache;
}

/**
 * Get all invoices
 */
export async function getAllInvoices(): Promise<Invoice[]> {
  return getMockInvoices();
}

/**
 * Get overdue invoices
 */
export async function getOverdueInvoices(): Promise<Invoice[]> {
  const invoices = getMockInvoices();
  const now = new Date();

  return invoices.filter(
    (inv) => inv.status !== "paid" && inv.dueDate < now && inv.amountDue > 0
  );
}

/**
 * Get invoices due soon (within X days)
 */
export async function getInvoicesDueSoon(withinDays = 7): Promise<Invoice[]> {
  const invoices = getMockInvoices();
  const now = new Date();
  const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return invoices.filter(
    (inv) =>
      inv.status !== "paid" &&
      inv.status !== "overdue" &&
      inv.dueDate > now &&
      inv.dueDate <= threshold
  );
}

/**
 * Generate invoice alerts
 */
export async function generateInvoiceAlerts(): Promise<InvoiceAlert[]> {
  const alerts: InvoiceAlert[] = [];
  const invoices = getMockInvoices();
  const now = new Date();

  for (const invoice of invoices) {
    if (invoice.status === "paid") continue;

    const daysOverdue = Math.floor(
      (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const reminderLevel = invoice.reminders.length;

    // Due soon (within 3 days)
    if (daysOverdue >= -3 && daysOverdue < 0) {
      alerts.push({
        id: `alert_duesoon_${invoice.id}`,
        type: "due_soon",
        severity: "info",
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        amount: invoice.amountDue,
        daysOverdue: 0,
        description: `Facture ${invoice.number} arrive à échéance dans ${Math.abs(daysOverdue)} jour(s)`,
        suggestedAction: "Envoyer un rappel préventif au client",
        reminderLevel: 0,
        detectedAt: now,
      });
    }

    // Disputed
    if (invoice.status === "disputed") {
      alerts.push({
        id: `alert_dispute_${invoice.id}`,
        type: "dispute",
        severity: "warning",
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        amount: invoice.amountDue,
        daysOverdue,
        description: `Facture ${invoice.number} contestée: ${invoice.disputeReason}`,
        suggestedAction: "Examiner le litige et proposer une résolution",
        reminderLevel,
        detectedAt: now,
      });
      continue;
    }

    // Overdue
    if (daysOverdue > 0) {
      // Check for broken payment promise
      if (invoice.paymentPromiseDate && invoice.paymentPromiseDate < now) {
        alerts.push({
          id: `alert_promise_${invoice.id}`,
          type: "payment_promise_broken",
          severity: "critical",
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          amount: invoice.amountDue,
          daysOverdue,
          description: `Promesse de paiement non tenue pour facture ${invoice.number}`,
          suggestedAction: "Appeler immédiatement le client",
          reminderLevel,
          detectedAt: now,
        });
        continue;
      }

      // Long overdue (> 30 days)
      if (daysOverdue > 30) {
        alerts.push({
          id: `alert_longoverdue_${invoice.id}`,
          type: "long_overdue",
          severity: "critical",
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          amount: invoice.amountDue,
          daysOverdue,
          description: `Facture ${invoice.number} impayée depuis ${daysOverdue} jours - Risque de créance douteuse`,
          suggestedAction: "Envoyer mise en demeure et suspendre le compte",
          nextReminderDate: new Date(),
          reminderLevel,
          detectedAt: now,
        });
      }
      // Overdue (7-30 days)
      else if (daysOverdue > 7) {
        const nextReminder = REMINDER_TEMPLATES.find((t) => t.level === reminderLevel + 1);
        alerts.push({
          id: `alert_overdue_${invoice.id}`,
          type: "overdue",
          severity: "warning",
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          amount: invoice.amountDue,
          daysOverdue,
          description: `Facture ${invoice.number} impayée - ${daysOverdue} jours de retard`,
          suggestedAction: nextReminder
            ? `Envoyer ${nextReminder.name}`
            : "Contacter le client par téléphone",
          nextReminderDate: nextReminder
            ? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
            : undefined,
          reminderLevel,
          detectedAt: now,
        });
      }
      // Just overdue (1-7 days)
      else {
        alerts.push({
          id: `alert_overdue_${invoice.id}`,
          type: "overdue",
          severity: "info",
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          amount: invoice.amountDue,
          daysOverdue,
          description: `Facture ${invoice.number} - Échéance dépassée de ${daysOverdue} jour(s)`,
          suggestedAction: "Premier rappel automatique prévu",
          nextReminderDate: new Date(
            invoice.dueDate.getTime() + 3 * 24 * 60 * 60 * 1000
          ),
          reminderLevel,
          detectedAt: now,
        });
      }
    }
  }

  // Sort by severity
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<{
  total: number;
  totalAmount: number;
  overdue: number;
  overdueAmount: number;
  dueSoon: number;
  dueSoonAmount: number;
  disputed: number;
  avgDaysOverdue: number;
}> {
  const invoices = getMockInvoices();
  const now = new Date();

  const unpaid = invoices.filter((i) => i.status !== "paid");
  const overdue = invoices.filter(
    (i) => i.status !== "paid" && i.dueDate < now && i.amountDue > 0
  );
  const dueSoon = await getInvoicesDueSoon(7);
  const disputed = invoices.filter((i) => i.status === "disputed");

  const overdueAmounts = overdue.map((i) => i.amountDue);
  const avgDaysOverdue =
    overdue.length > 0
      ? Math.round(
          overdue.reduce(
            (sum, i) => sum + (now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / overdue.length
        )
      : 0;

  return {
    total: unpaid.length,
    totalAmount: unpaid.reduce((sum, i) => sum + i.amountDue, 0),
    overdue: overdue.length,
    overdueAmount: overdueAmounts.reduce((a, b) => a + b, 0),
    dueSoon: dueSoon.length,
    dueSoonAmount: dueSoon.reduce((sum, i) => sum + i.amountDue, 0),
    disputed: disputed.length,
    avgDaysOverdue,
  };
}

/**
 * Schedule automatic reminders
 */
export async function scheduleReminders(): Promise<{
  scheduled: number;
  invoices: { invoiceId: string; reminderLevel: number; scheduledFor: Date }[];
}> {
  const invoices = await getOverdueInvoices();
  const now = new Date();
  const scheduled: { invoiceId: string; reminderLevel: number; scheduledFor: Date }[] = [];

  for (const invoice of invoices) {
    const daysOverdue = Math.floor(
      (now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentLevel = invoice.reminders.length;

    // Find next appropriate reminder
    const nextTemplate = REMINDER_TEMPLATES.find(
      (t) => t.level > currentLevel && daysOverdue >= t.daysAfterDue
    );

    if (nextTemplate) {
      // Check if enough time has passed since last reminder
      const lastReminder = invoice.reminders[invoice.reminders.length - 1];
      const daysSinceLastReminder = lastReminder
        ? Math.floor((now.getTime() - lastReminder.sentAt.getTime()) / (1000 * 60 * 60 * 1000))
        : Infinity;

      if (daysSinceLastReminder >= 3) {
        scheduled.push({
          invoiceId: invoice.id,
          reminderLevel: nextTemplate.level,
          scheduledFor: now,
        });
      }
    }
  }

  return { scheduled: scheduled.length, invoices: scheduled };
}

/**
 * Send reminder for an invoice
 */
export async function sendReminder(
  invoiceId: string,
  templateId: string,
  sentBy: string
): Promise<{ success: boolean; reminderId?: string; error?: string }> {
  const invoices = getMockInvoices();
  const invoice = invoices.find((i) => i.id === invoiceId);
  const template = REMINDER_TEMPLATES.find((t) => t.id === templateId);

  if (!invoice || !template) {
    return { success: false, error: "Invoice or template not found" };
  }

  // In production, send actual email/SMS
  const reminder: InvoiceReminder = {
    id: `rem_${Date.now()}`,
    invoiceId,
    type: template.channel.includes("sms") ? "sms" : "email",
    sentAt: new Date(),
    template: templateId,
    sentBy,
  };

  // Add to invoice
  invoice.reminders.push(reminder);

  console.log("Reminder sent:", { invoice: invoice.number, template: template.name });

  return { success: true, reminderId: reminder.id };
}

/**
 * Generate smart reminder with AI
 */
export async function generateSmartReminder(
  invoice: Invoice
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const daysOverdue = Math.floor(
    (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const reminderCount = invoice.reminders.length;
  const partialPayment = invoice.amountPaid > 0;

  // Default template based on context
  if (!OPENAI_API_KEY) {
    if (partialPayment) {
      return `Bonjour,

Nous avons bien reçu votre paiement partiel de ${invoice.amountPaid}€ et nous vous en remercions.

Cependant, un solde de ${invoice.amountDue}€ reste dû sur la facture ${invoice.number}.

Pourriez-vous nous indiquer quand nous pouvons espérer recevoir le règlement du solde ?

Cordialement,
L'équipe FastGross Pro`;
    }

    if (reminderCount >= 2) {
      return `Bonjour,

Malgré nos précédents rappels, la facture ${invoice.number} d'un montant de ${invoice.amount}€ reste impayée.

Nous comprenons que des difficultés peuvent survenir. Si c'est le cas, contactez-nous pour trouver une solution ensemble.

Sans nouvelles de votre part sous 48h, nous serons contraints d'appliquer notre procédure de recouvrement.

Cordialement,
Direction commerciale - FastGross Pro`;
    }

    return REMINDER_TEMPLATES[0].body
      .replace("{{numero}}", invoice.number)
      .replace("{{montant}}", invoice.amount.toFixed(2))
      .replace("{{contact}}", invoice.clientName)
      .replace("{{date_echeance}}", invoice.dueDate.toLocaleDateString("fr-FR"));
  }

  try {
    const context = {
      clientName: invoice.clientName,
      invoiceNumber: invoice.number,
      amount: invoice.amount,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      daysOverdue,
      reminderCount,
      hasPartialPayment: partialPayment,
      lastResponse: invoice.reminders[invoice.reminders.length - 1]?.response,
    };

    const prompt = `Tu es responsable recouvrement chez un grossiste alimentaire.
Génère un email de relance professionnel mais ferme pour cette situation :

${JSON.stringify(context, null, 2)}

L'email doit :
- Être poli mais ferme
- Adapter le ton selon le nombre de relances déjà envoyées
- Mentionner le paiement partiel si applicable
- Proposer une solution si difficultés
- Être en français

Génère uniquement le corps de l'email, sans objet.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es un expert en recouvrement de créances professionnel." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 512,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || REMINDER_TEMPLATES[0].body;
  } catch {
    return REMINDER_TEMPLATES[0].body;
  }
}

/**
 * Record payment
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: Payment["method"],
  reference?: string
): Promise<{ success: boolean; invoice?: Invoice }> {
  const invoices = getMockInvoices();
  const invoice = invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return { success: false };
  }

  const payment: Payment = {
    id: `pay_${Date.now()}`,
    invoiceId,
    amount,
    date: new Date(),
    method,
    reference,
  };

  invoice.paymentHistory.push(payment);
  invoice.amountPaid += amount;
  invoice.amountDue -= amount;

  if (invoice.amountDue <= 0) {
    invoice.status = "paid";
  } else if (invoice.amountPaid > 0) {
    invoice.status = "partially_paid";
  }

  return { success: true, invoice };
}

/**
 * Record payment promise
 */
export async function recordPaymentPromise(
  invoiceId: string,
  promiseDate: Date,
  _notes?: string
): Promise<{ success: boolean }> {
  const invoices = getMockInvoices();
  const invoice = invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return { success: false };
  }

  invoice.paymentPromiseDate = promiseDate;
  if (_notes) {
    invoice.notes = (invoice.notes || "") + `\n[${new Date().toLocaleDateString("fr-FR")}] Promesse: ${_notes}`;
  }

  return { success: true };
}

/**
 * Mark invoice as disputed
 */
export async function markAsDisputed(
  invoiceId: string,
  reason: string
): Promise<{ success: boolean }> {
  const invoices = getMockInvoices();
  const invoice = invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return { success: false };
  }

  invoice.status = "disputed";
  invoice.disputeReason = reason;

  return { success: true };
}

/**
 * Get client payment history summary
 */
export async function getClientPaymentHistory(clientId: string): Promise<{
  totalInvoices: number;
  totalPaid: number;
  totalOverdue: number;
  avgPaymentDelay: number;
  paymentBehavior: "excellent" | "good" | "average" | "poor";
}> {
  const invoices = getMockInvoices().filter((i) => i.clientId === clientId);

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" || i.status === "partially_paid"
  );

  // Calculate average payment delay (mock)
  const avgDelay = paidInvoices.length > 0 ? 5 : overdueInvoices.length > 0 ? 20 : 0;

  let behavior: "excellent" | "good" | "average" | "poor" = "good";
  if (avgDelay <= 3) behavior = "excellent";
  else if (avgDelay <= 10) behavior = "good";
  else if (avgDelay <= 20) behavior = "average";
  else behavior = "poor";

  return {
    totalInvoices: invoices.length,
    totalPaid: paidInvoices.reduce((sum, i) => sum + i.amount, 0),
    totalOverdue: overdueInvoices.reduce((sum, i) => sum + i.amountDue, 0),
    avgPaymentDelay: avgDelay,
    paymentBehavior: behavior,
  };
}
