/**
 * Alert Notification Service - Automatic notifications and task creation
 * Processes alerts and sends notifications to the right people
 */

import {
  getAllAnomalies,
  type BehaviorAnomaly,
} from "./behavior-analysis-service";
import {
  generateInvoiceAlerts,
  type InvoiceAlert,
} from "./invoice-tracking-service";

// Types
export type AlertType =
  | "product_missing"
  | "quantity_drop"
  | "frequency_change"
  | "stopped_ordering"
  | "unusual_order"
  | "invoice_overdue"
  | "invoice_due_soon"
  | "payment_promise_broken"
  | "dispute";

export interface AlertNotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerTypes: AlertType[];
  conditions: {
    severities?: ("critical" | "warning" | "info")[];
    minAmount?: number;
    clientTypes?: string[];
    commercialIds?: string[];
  };
  actions: {
    notifyCommercial: boolean;
    notifyManager: boolean;
    autoEmail: boolean;
    createTask: boolean;
    sendSMS: boolean;
  };
  schedule: "immediate" | "daily_digest" | "weekly_digest";
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  alertType: AlertType;
  recipientId: string;
  recipientType: "commercial" | "manager" | "client";
  channel: "push" | "email" | "sms" | "in_app";
  title: string;
  body: string;
  sentAt: Date;
  readAt?: Date;
  clickedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface FollowUpTask {
  id: string;
  alertId: string;
  alertType: AlertType;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  assignedTo?: string;
  assignedToName?: string;
  dueDate: Date;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
}

export interface DigestSummary {
  period: "daily" | "weekly";
  generatedAt: Date;
  stats: {
    newAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    pendingTasks: number;
  };
  topAlerts: (BehaviorAnomaly | InvoiceAlert)[];
  priorityActions: {
    clientId: string;
    clientName: string;
    action: string;
    urgency: "high" | "medium" | "low";
  }[];
}

// Default notification rules
export const DEFAULT_NOTIFICATION_RULES: AlertNotificationRule[] = [
  {
    id: "rule_critical",
    name: "Alertes critiques - Notification immédiate",
    enabled: true,
    triggerTypes: [
      "stopped_ordering",
      "payment_promise_broken",
      "quantity_drop",
    ],
    conditions: {
      severities: ["critical"],
    },
    actions: {
      notifyCommercial: true,
      notifyManager: true,
      autoEmail: false,
      createTask: true,
      sendSMS: true,
    },
    schedule: "immediate",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule_invoice_overdue",
    name: "Factures impayées > 7 jours",
    enabled: true,
    triggerTypes: ["invoice_overdue"],
    conditions: {
      severities: ["warning", "critical"],
      minAmount: 500,
    },
    actions: {
      notifyCommercial: true,
      notifyManager: false,
      autoEmail: true,
      createTask: true,
      sendSMS: false,
    },
    schedule: "immediate",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rule_behavior_warning",
    name: "Changements comportement - Digest quotidien",
    enabled: true,
    triggerTypes: ["product_missing", "frequency_change", "unusual_order"],
    conditions: {
      severities: ["warning", "info"],
    },
    actions: {
      notifyCommercial: true,
      notifyManager: false,
      autoEmail: false,
      createTask: false,
      sendSMS: false,
    },
    schedule: "daily_digest",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Mock commercials
const COMMERCIALS = [
  { id: "com_1", name: "Marie Lefebvre", email: "marie@fastgross.pro", phone: "06 12 34 56 78" },
  { id: "com_2", name: "Ahmed Benali", email: "ahmed@fastgross.pro", phone: "06 98 76 54 32" },
  { id: "com_3", name: "Sophie Martin", email: "sophie@fastgross.pro", phone: "06 11 22 33 44" },
];

// Mock managers
const MANAGERS = [
  { id: "mgr_1", name: "Hamza Bouazza", email: "hamza@fastgross.pro", phone: "06 55 66 77 88" },
];

// Get assigned commercial for a client
function getAssignedCommercial(clientId: string): typeof COMMERCIALS[0] | undefined {
  // In production, fetch from client data
  const index = parseInt(clientId.replace("client_", "")) % COMMERCIALS.length;
  return COMMERCIALS[index];
}

/**
 * Process all alerts and send notifications
 */
export async function processAlerts(): Promise<{
  processed: number;
  notifications: number;
  tasks: number;
}> {
  const behaviorAnomalies = await getAllAnomalies();
  const invoiceAlerts = await generateInvoiceAlerts();
  const rules = DEFAULT_NOTIFICATION_RULES.filter((r) => r.enabled);

  let notificationCount = 0;
  let taskCount = 0;

  // Process behavior anomalies
  for (const anomaly of behaviorAnomalies) {
    for (const rule of rules) {
      if (!rule.triggerTypes.includes(anomaly.type as AlertType)) continue;
      if (rule.conditions.severities && !rule.conditions.severities.includes(anomaly.severity)) continue;

      if (rule.schedule === "immediate") {
        // Notify commercial
        if (rule.actions.notifyCommercial) {
          const commercial = getAssignedCommercial(anomaly.clientId);
          if (commercial) {
            await sendPushNotification(commercial.id, {
              title: getSeverityEmoji(anomaly.severity) + " Alerte comportement",
              body: anomaly.description,
              data: { type: "behavior_anomaly", id: anomaly.id },
            });
            notificationCount++;
          }
        }

        // Notify manager for critical
        if (rule.actions.notifyManager && anomaly.severity === "critical") {
          for (const manager of MANAGERS) {
            await sendPushNotification(manager.id, {
              title: "🚨 Alerte critique",
              body: anomaly.description,
              data: { type: "behavior_anomaly", id: anomaly.id },
            });
            notificationCount++;
          }
        }

        // Create follow-up task
        if (rule.actions.createTask) {
          await createFollowUpTask({
            alertId: anomaly.id,
            alertType: anomaly.type as AlertType,
            clientId: anomaly.clientId,
            clientName: anomaly.clientName,
            title: `Suivi: ${anomaly.type.replace("_", " ")}`,
            description: `${anomaly.description}\n\nAction suggérée: ${anomaly.suggestedAction}`,
            priority: anomaly.severity === "critical" ? "high" : "medium",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          });
          taskCount++;
        }
      }
    }
  }

  // Process invoice alerts
  for (const alert of invoiceAlerts) {
    const alertType: AlertType = alert.type === "due_soon"
      ? "invoice_due_soon"
      : alert.type === "payment_promise_broken"
        ? "payment_promise_broken"
        : alert.type === "dispute"
          ? "dispute"
          : "invoice_overdue";

    for (const rule of rules) {
      if (!rule.triggerTypes.includes(alertType)) continue;
      if (rule.conditions.severities && !rule.conditions.severities.includes(alert.severity)) continue;
      if (rule.conditions.minAmount && alert.amount < rule.conditions.minAmount) continue;

      if (rule.schedule === "immediate") {
        if (rule.actions.notifyCommercial) {
          const commercial = getAssignedCommercial(alert.clientId);
          if (commercial) {
            await sendPushNotification(commercial.id, {
              title: getSeverityEmoji(alert.severity) + " Alerte facture",
              body: alert.description,
              data: { type: "invoice_alert", id: alert.id },
            });
            notificationCount++;
          }
        }

        if (rule.actions.createTask) {
          await createFollowUpTask({
            alertId: alert.id,
            alertType,
            clientId: alert.clientId,
            clientName: alert.clientName,
            title: `Relance facture ${alert.invoiceNumber}`,
            description: `${alert.description}\n\nMontant: ${alert.amount}€\nAction: ${alert.suggestedAction}`,
            priority: alert.severity === "critical" ? "high" : "medium",
            dueDate: alert.nextReminderDate || new Date(Date.now() + 48 * 60 * 60 * 1000),
          });
          taskCount++;
        }
      }
    }
  }

  return {
    processed: behaviorAnomalies.length + invoiceAlerts.length,
    notifications: notificationCount,
    tasks: taskCount,
  };
}

/**
 * Send push notification
 */
export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
): Promise<{ success: boolean; id?: string }> {
  // In production, use Firebase Cloud Messaging
  console.log("Push notification:", { userId, ...notification });

  // Log notification (would be stored in production)
  const _log: Omit<NotificationLog, "id"> = {
    alertId: (notification.data?.id as string) || "",
    alertType: (notification.data?.type as AlertType) || "product_missing",
    recipientId: userId,
    recipientType: userId.startsWith("mgr") ? "manager" : "commercial",
    channel: "push",
    title: notification.title,
    body: notification.body,
    sentAt: new Date(),
    metadata: notification.data,
  };

  // Store in Firestore (mock)
  return { success: true, id: `notif_${Date.now()}` };
}

/**
 * Send email notification
 */
export async function sendEmailNotification(
  email: string,
  subject: string,
  _body: string,
  _alertId?: string
): Promise<{ success: boolean }> {
  // In production, use email service (SendGrid, etc.)
  console.log("Email notification:", { email, subject });
  return { success: true };
}

/**
 * Send SMS notification
 */
export async function sendSMSNotification(
  phone: string,
  message: string
): Promise<{ success: boolean }> {
  // In production, use SMS service
  console.log("SMS notification:", { phone, message: message.substring(0, 50) });
  return { success: true };
}

/**
 * Create follow-up task
 */
export async function createFollowUpTask(
  task: Omit<FollowUpTask, "id" | "status" | "createdAt">
): Promise<FollowUpTask> {
  const commercial = getAssignedCommercial(task.clientId);

  const fullTask: FollowUpTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: "pending",
    createdAt: new Date(),
    assignedTo: commercial?.id,
    assignedToName: commercial?.name,
  };

  // In production, store in Firestore
  console.log("Task created:", fullTask);

  return fullTask;
}

/**
 * Get pending tasks
 */
export async function getPendingTasks(
  assignedTo?: string
): Promise<FollowUpTask[]> {
  // Mock tasks
  const tasks: FollowUpTask[] = [
    {
      id: "task_1",
      alertId: "alert_1",
      alertType: "stopped_ordering",
      clientId: "client_3",
      clientName: "Burger King Local",
      title: "Client inactif - Burger King Local",
      description: "Le client n'a pas commandé depuis 28 jours. Dernier CA: 350€/semaine.",
      priority: "high",
      assignedTo: "com_1",
      assignedToName: "Marie Lefebvre",
      dueDate: new Date(),
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "task_2",
      alertId: "alert_2",
      alertType: "invoice_overdue",
      clientId: "client_2",
      clientName: "Pizza Express",
      title: "Relance facture F-2025-0892",
      description: "Facture de 1250€ impayée depuis 12 jours.",
      priority: "medium",
      assignedTo: "com_2",
      assignedToName: "Ahmed Benali",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "pending",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      id: "task_3",
      alertId: "alert_3",
      alertType: "product_missing",
      clientId: "client_1",
      clientName: "Kebab du Coin",
      title: "Vérifier arrêt commandes Cheddar",
      description: "Le client ne commande plus de cheddar depuis 3 semaines.",
      priority: "medium",
      assignedTo: "com_1",
      assignedToName: "Marie Lefebvre",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "in_progress",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  if (assignedTo) {
    return tasks.filter((t) => t.assignedTo === assignedTo);
  }
  return tasks;
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: FollowUpTask["status"],
  notes?: string
): Promise<{ success: boolean }> {
  console.log("Task updated:", { taskId, status, notes });
  return { success: true };
}

/**
 * Generate daily digest
 */
export async function generateDailyDigest(): Promise<DigestSummary> {
  const behaviorAnomalies = await getAllAnomalies();
  const invoiceAlerts = await generateInvoiceAlerts();
  const tasks = await getPendingTasks();

  const allAlerts = [
    ...behaviorAnomalies.map((a) => ({ ...a, isInvoice: false })),
    ...invoiceAlerts.map((a) => ({ ...a, isInvoice: true })),
  ];

  const criticalAlerts = allAlerts.filter((a) => a.severity === "critical");
  const newAlerts = allAlerts.filter(
    (a) => new Date().getTime() - a.detectedAt.getTime() < 24 * 60 * 60 * 1000
  );

  return {
    period: "daily",
    generatedAt: new Date(),
    stats: {
      newAlerts: newAlerts.length,
      criticalAlerts: criticalAlerts.length,
      resolvedAlerts: 0, // Would track resolved in production
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
    },
    topAlerts: allAlerts.slice(0, 5) as (BehaviorAnomaly | InvoiceAlert)[],
    priorityActions: criticalAlerts.slice(0, 3).map((a) => ({
      clientId: a.clientId,
      clientName: a.clientName,
      action: a.suggestedAction,
      urgency: "high" as const,
    })),
  };
}

/**
 * Send daily digest email
 */
export async function sendDailyDigest(recipientId: string): Promise<{ success: boolean }> {
  const digest = await generateDailyDigest();

  const subject = `📊 Digest quotidien - ${digest.stats.newAlerts} nouvelles alertes`;
  const body = `
Bonjour,

Voici le résumé de vos alertes du jour :

📈 STATISTIQUES
- Nouvelles alertes : ${digest.stats.newAlerts}
- Alertes critiques : ${digest.stats.criticalAlerts}
- Tâches en attente : ${digest.stats.pendingTasks}

${digest.stats.criticalAlerts > 0 ? `
🚨 ALERTES PRIORITAIRES
${digest.priorityActions.map((a) => `• ${a.clientName} : ${a.action}`).join("\n")}
` : ""}

Connectez-vous à FastGross Pro pour voir tous les détails.

Bonne journée !
L'équipe FastGross Pro
  `;

  const commercial = COMMERCIALS.find((c) => c.id === recipientId);
  if (commercial) {
    return sendEmailNotification(commercial.email, subject, body);
  }

  return { success: false };
}

/**
 * Get notification rules
 */
export async function getNotificationRules(): Promise<AlertNotificationRule[]> {
  return DEFAULT_NOTIFICATION_RULES;
}

/**
 * Update notification rule
 */
export async function updateNotificationRule(
  ruleId: string,
  updates: Partial<AlertNotificationRule>
): Promise<{ success: boolean }> {
  console.log("Rule updated:", { ruleId, updates });
  return { success: true };
}

/**
 * Get notification logs
 */
export async function getNotificationLogs(
  _filters?: {
    recipientId?: string;
    alertType?: AlertType;
    since?: Date;
  }
): Promise<NotificationLog[]> {
  // Mock logs
  return [
    {
      id: "log_1",
      alertId: "alert_1",
      alertType: "stopped_ordering",
      recipientId: "com_1",
      recipientType: "commercial",
      channel: "push",
      title: "🚨 Alerte critique",
      body: "Burger King Local n'a passé aucune commande depuis 28 jours",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: "log_2",
      alertId: "alert_2",
      alertType: "invoice_overdue",
      recipientId: "com_2",
      recipientType: "commercial",
      channel: "email",
      title: "Facture impayée - Pizza Express",
      body: "La facture F-2025-0892 est impayée depuis 12 jours",
      sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  ];
}

/**
 * Helper: Get emoji for severity
 */
function getSeverityEmoji(severity: "critical" | "warning" | "info"): string {
  switch (severity) {
    case "critical":
      return "🚨";
    case "warning":
      return "⚠️";
    case "info":
      return "ℹ️";
  }
}

/**
 * Combined alert type for unified view
 */
export interface UnifiedAlert {
  id: string;
  category: "behavior" | "invoice";
  type: AlertType;
  severity: "critical" | "warning" | "info";
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  title: string;
  description: string;
  previousBehavior?: string;
  currentBehavior?: string;
  suggestedAction: string;
  amount?: number;
  detectedAt: Date;
  status: "new" | "acknowledged" | "contacted" | "resolved";
  assignedTo?: string;
  daysOverdue?: number;
}

/**
 * Get all unified alerts
 */
export async function getAllUnifiedAlerts(): Promise<UnifiedAlert[]> {
  const behaviorAnomalies = await getAllAnomalies();
  const invoiceAlerts = await generateInvoiceAlerts();

  const unified: UnifiedAlert[] = [
    ...behaviorAnomalies.map((a) => ({
      id: a.id,
      category: "behavior" as const,
      type: a.type as AlertType,
      severity: a.severity,
      clientId: a.clientId,
      clientName: a.clientName,
      title: `${a.productName ? a.productName + " - " : ""}${a.type.replace(/_/g, " ")}`,
      description: a.description,
      previousBehavior: a.previousBehavior,
      currentBehavior: a.currentBehavior,
      suggestedAction: a.suggestedAction,
      detectedAt: a.detectedAt,
      status: a.status,
      assignedTo: a.assignedTo,
    })),
    ...invoiceAlerts.map((a) => ({
      id: a.id,
      category: "invoice" as const,
      type: (a.type === "due_soon"
        ? "invoice_due_soon"
        : a.type === "overdue" || a.type === "long_overdue"
          ? "invoice_overdue"
          : a.type) as AlertType,
      severity: a.severity,
      clientId: a.clientId,
      clientName: a.clientName,
      title: `Facture ${a.invoiceNumber}`,
      description: a.description,
      suggestedAction: a.suggestedAction,
      amount: a.amount,
      detectedAt: new Date(),
      status: "new" as const,
      daysOverdue: a.daysOverdue,
    })),
  ];

  return unified.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
