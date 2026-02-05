/**
 * Behavior Analysis Service - Detect client habits and anomalies
 * Monitors purchasing patterns and alerts on unusual behavior
 */

// Types
export interface ProductHabit {
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  avgQuantityPerOrder: number;
  avgFrequencyDays: number;
  lastOrderDate: Date;
  daysSinceLastOrder: number;
  expectedNextOrder: Date;
  isOverdue: boolean;
  overdueByDays: number;
  totalOrders: number;
  totalQuantity: number;
}

export interface BehaviorAnomaly {
  id: string;
  type: "product_missing" | "quantity_drop" | "frequency_change" | "stopped_ordering" | "unusual_order";
  severity: "info" | "warning" | "critical";
  clientId: string;
  clientName: string;
  productId?: string;
  productName?: string;
  description: string;
  previousBehavior: string;
  currentBehavior: string;
  suggestedAction: string;
  detectedAt: Date;
  status: "new" | "acknowledged" | "contacted" | "resolved";
  assignedTo?: string;
  resolvedAt?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ClientBehaviorSummary {
  clientId: string;
  clientName: string;
  clientType: string;
  totalProducts: number;
  avgOrderFrequencyDays: number;
  lastOrderDate: Date;
  daysSinceLastOrder: number;
  totalRevenue: number;
  paymentStatus: "good" | "late" | "problematic";
  riskScore: number; // 0-100
  habits: ProductHabit[];
  anomalies: BehaviorAnomaly[];
}

export interface AnomalyStats {
  total: number;
  byType: Record<BehaviorAnomaly["type"], number>;
  bySeverity: Record<BehaviorAnomaly["severity"], number>;
  byStatus: Record<BehaviorAnomaly["status"], number>;
}

// Mock order data for analysis
interface OrderData {
  id: string;
  clientId: string;
  clientName: string;
  date: Date;
  items: { productId: string; productName: string; quantity: number; price: number }[];
  total: number;
}

// Mock data generator for orders
function generateMockOrders(): OrderData[] {
  const clients = [
    { id: "client_1", name: "Kebab du Coin", type: "kebab" },
    { id: "client_2", name: "Pizza Express", type: "pizza" },
    { id: "client_3", name: "Burger King Local", type: "burger" },
    { id: "client_4", name: "Tacos Master", type: "tacos" },
    { id: "client_5", name: "Snack Gourmet", type: "snack" },
  ];

  const products = [
    { productId: "prod_1", productName: "Cheddar 1kg", price: 8.5 },
    { productId: "prod_2", productName: "Viande kebab 5kg", price: 45 },
    { productId: "prod_3", productName: "Pain pita (50)", price: 12 },
    { productId: "prod_4", productName: "Huile friture 10L", price: 18 },
    { productId: "prod_5", productName: "Frites surgelées 10kg", price: 15 },
    { productId: "prod_6", productName: "Sauce blanche 5L", price: 22 },
  ];

  const orders: OrderData[] = [];
  const now = new Date();

  // Client 1: Regular orders, but stopped ordering cheddar 3 weeks ago
  for (let week = 12; week >= 0; week--) {
    const date = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    const items = [
      { ...products[1], quantity: 10 }, // viande kebab
      { ...products[2], quantity: 100 }, // pain pita
      { ...products[5], quantity: 2 }, // sauce
    ];
    // Add cheddar only for weeks > 3
    if (week > 3) {
      items.push({ ...products[0], quantity: 5 });
    }
    orders.push({
      id: `order_c1_${week}`,
      clientId: clients[0].id,
      clientName: clients[0].name,
      date,
      items,
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    });
  }

  // Client 2: Reduced quantity of fries (was 20kg, now 5kg)
  for (let week = 8; week >= 0; week--) {
    const date = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    const friesQty = week > 4 ? 20 : 5; // Dropped after week 4
    orders.push({
      id: `order_c2_${week}`,
      clientId: clients[1].id,
      clientName: clients[1].name,
      date,
      items: [
        { ...products[0], quantity: 8 },
        { ...products[4], quantity: friesQty },
        { ...products[3], quantity: 2 },
      ],
      total: 8 * 8.5 + friesQty * 15 + 2 * 18,
    });
  }

  // Client 3: Completely stopped ordering 4 weeks ago
  for (let week = 12; week >= 4; week--) {
    const date = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    orders.push({
      id: `order_c3_${week}`,
      clientId: clients[2].id,
      clientName: clients[2].name,
      date,
      items: [
        { ...products[0], quantity: 10 },
        { ...products[4], quantity: 15 },
        { ...products[3], quantity: 3 },
      ],
      total: 10 * 8.5 + 15 * 15 + 3 * 18,
    });
  }

  // Client 4: Changed frequency (was 2x/week, now 1x every 2 weeks)
  for (let i = 0; i < 20; i++) {
    const daysAgo = i < 4 ? i * 14 : 56 + (i - 4) * 3.5; // Every 2 weeks recently, was every 3.5 days
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    orders.push({
      id: `order_c4_${i}`,
      clientId: clients[3].id,
      clientName: clients[3].name,
      date,
      items: [
        { ...products[1], quantity: 5 },
        { ...products[5], quantity: 1 },
      ],
      total: 5 * 45 + 22,
    });
  }

  // Client 5: Normal behavior (for comparison)
  for (let week = 10; week >= 0; week--) {
    const date = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    orders.push({
      id: `order_c5_${week}`,
      clientId: clients[4].id,
      clientName: clients[4].name,
      date,
      items: [
        { ...products[0], quantity: 3 },
        { ...products[4], quantity: 8 },
        { ...products[3], quantity: 1 },
      ],
      total: 3 * 8.5 + 8 * 15 + 18,
    });
  }

  return orders;
}

// Get mock orders (in production, fetch from Firestore)
let mockOrdersCache: OrderData[] | null = null;
function getMockOrders(): OrderData[] {
  if (!mockOrdersCache) {
    mockOrdersCache = generateMockOrders();
  }
  return mockOrdersCache;
}

/**
 * Analyze client habits for a specific product
 */
export async function analyzeClientHabits(clientId: string): Promise<ProductHabit[]> {
  const orders = getMockOrders().filter((o) => o.clientId === clientId);
  if (orders.length === 0) return [];

  const clientName = orders[0].clientName;
  const productMap = new Map<string, { name: string; orders: { date: Date; qty: number }[] }>();

  // Group orders by product
  for (const order of orders) {
    for (const item of order.items) {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, { name: item.productName, orders: [] });
      }
      productMap.get(item.productId)!.orders.push({
        date: order.date,
        qty: item.quantity,
      });
    }
  }

  const habits: ProductHabit[] = [];
  const now = new Date();

  for (const [productId, data] of productMap.entries()) {
    const sortedOrders = data.orders.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sortedOrders.length < 2) continue;

    // Calculate average quantity
    const totalQty = sortedOrders.reduce((sum, o) => sum + o.qty, 0);
    const avgQty = totalQty / sortedOrders.length;

    // Calculate average frequency
    const intervals: number[] = [];
    for (let i = 1; i < sortedOrders.length; i++) {
      const diffMs = sortedOrders[i].date.getTime() - sortedOrders[i - 1].date.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }
    const avgFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    const lastOrder = sortedOrders[sortedOrders.length - 1];
    const daysSinceLast = Math.floor((now.getTime() - lastOrder.date.getTime()) / (1000 * 60 * 60 * 24));
    const expectedNext = new Date(lastOrder.date.getTime() + avgFrequency * 24 * 60 * 60 * 1000);
    const isOverdue = now > expectedNext;
    const overdueBy = isOverdue ? Math.floor((now.getTime() - expectedNext.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    habits.push({
      clientId,
      clientName,
      productId,
      productName: data.name,
      avgQuantityPerOrder: Math.round(avgQty * 10) / 10,
      avgFrequencyDays: Math.round(avgFrequency * 10) / 10,
      lastOrderDate: lastOrder.date,
      daysSinceLastOrder: daysSinceLast,
      expectedNextOrder: expectedNext,
      isOverdue,
      overdueByDays: overdueBy,
      totalOrders: sortedOrders.length,
      totalQuantity: totalQty,
    });
  }

  return habits;
}

/**
 * Detect products that are habitually ordered but missing recently
 */
export async function detectMissingProducts(thresholdMultiplier = 2): Promise<BehaviorAnomaly[]> {
  const anomalies: BehaviorAnomaly[] = [];
  const orders = getMockOrders();

  // Get unique clients
  const clientIds = [...new Set(orders.map((o) => o.clientId))];

  for (const clientId of clientIds) {
    const habits = await analyzeClientHabits(clientId);

    for (const habit of habits) {
      if (habit.totalOrders < 3) continue; // Need enough history

      const threshold = habit.avgFrequencyDays * thresholdMultiplier;

      if (habit.daysSinceLastOrder > threshold) {
        const severity: BehaviorAnomaly["severity"] =
          habit.daysSinceLastOrder > threshold * 2 ? "critical" : "warning";

        anomalies.push({
          id: `anomaly_missing_${clientId}_${habit.productId}_${Date.now()}`,
          type: "product_missing",
          severity,
          clientId: habit.clientId,
          clientName: habit.clientName,
          productId: habit.productId,
          productName: habit.productName,
          description: `${habit.clientName} n'a pas commandé de ${habit.productName} depuis ${habit.daysSinceLastOrder} jours`,
          previousBehavior: `Commandait ${habit.avgQuantityPerOrder} unités tous les ${Math.round(habit.avgFrequencyDays)} jours`,
          currentBehavior: `Dernière commande il y a ${habit.daysSinceLastOrder} jours (retard de ${habit.overdueByDays} jours)`,
          suggestedAction: "Appeler pour vérifier si problème de qualité ou changement de fournisseur",
          detectedAt: new Date(),
          status: "new",
          metadata: {
            avgQuantity: habit.avgQuantityPerOrder,
            avgFrequency: habit.avgFrequencyDays,
            overdueBy: habit.overdueByDays,
          },
        });
      }
    }
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Detect significant quantity drops
 */
export async function detectQuantityDrops(dropPercentage = 50): Promise<BehaviorAnomaly[]> {
  const anomalies: BehaviorAnomaly[] = [];
  const orders = getMockOrders();
  const clientIds = [...new Set(orders.map((o) => o.clientId))];

  for (const clientId of clientIds) {
    const clientOrders = orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (clientOrders.length < 4) continue;

    // Compare recent orders (last 4) vs older orders
    const recentOrders = clientOrders.slice(-4);
    const olderOrders = clientOrders.slice(0, -4);

    if (olderOrders.length < 4) continue;

    // Aggregate quantities by product
    const getProductAvg = (orderList: OrderData[]) => {
      const productTotals = new Map<string, { name: string; total: number; count: number }>();
      for (const order of orderList) {
        for (const item of order.items) {
          if (!productTotals.has(item.productId)) {
            productTotals.set(item.productId, { name: item.productName, total: 0, count: 0 });
          }
          const p = productTotals.get(item.productId)!;
          p.total += item.quantity;
          p.count++;
        }
      }
      return productTotals;
    };

    const recentAvg = getProductAvg(recentOrders);
    const olderAvg = getProductAvg(olderOrders);

    for (const [productId, oldData] of olderAvg.entries()) {
      const newData = recentAvg.get(productId);
      if (!newData) continue;

      const oldAvgQty = oldData.total / oldData.count;
      const newAvgQty = newData.total / newData.count;
      const dropPct = ((oldAvgQty - newAvgQty) / oldAvgQty) * 100;

      if (dropPct >= dropPercentage) {
        const clientName = clientOrders[0].clientName;
        anomalies.push({
          id: `anomaly_drop_${clientId}_${productId}_${Date.now()}`,
          type: "quantity_drop",
          severity: dropPct >= 70 ? "critical" : "warning",
          clientId,
          clientName,
          productId,
          productName: oldData.name,
          description: `${clientName} a réduit ses commandes de ${oldData.name} de ${Math.round(dropPct)}%`,
          previousBehavior: `Commandait en moyenne ${Math.round(oldAvgQty)} unités par commande`,
          currentBehavior: `Commande maintenant ${Math.round(newAvgQty)} unités en moyenne`,
          suggestedAction: dropPct >= 70
            ? "Appeler d'urgence - baisse significative, possible perte du client"
            : "Contacter pour comprendre le changement de besoin",
          detectedAt: new Date(),
          status: "new",
          metadata: { oldAvg: oldAvgQty, newAvg: newAvgQty, dropPercentage: dropPct },
        });
      }
    }
  }

  return anomalies;
}

/**
 * Detect frequency changes in ordering patterns
 */
export async function detectFrequencyChanges(): Promise<BehaviorAnomaly[]> {
  const anomalies: BehaviorAnomaly[] = [];
  const orders = getMockOrders();
  const clientIds = [...new Set(orders.map((o) => o.clientId))];

  for (const clientId of clientIds) {
    const clientOrders = orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (clientOrders.length < 8) continue;

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < clientOrders.length; i++) {
      const diffDays = (clientOrders[i].date.getTime() - clientOrders[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(diffDays);
    }

    // Split into old and recent
    const midpoint = Math.floor(intervals.length / 2);
    const oldIntervals = intervals.slice(0, midpoint);
    const recentIntervals = intervals.slice(midpoint);

    const oldAvg = oldIntervals.reduce((a, b) => a + b, 0) / oldIntervals.length;
    const recentAvg = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;

    // Check if frequency significantly changed (more than 50%)
    const changeRatio = recentAvg / oldAvg;

    if (changeRatio > 1.5 || changeRatio < 0.67) {
      const clientName = clientOrders[0].clientName;
      const slowed = changeRatio > 1;

      anomalies.push({
        id: `anomaly_freq_${clientId}_${Date.now()}`,
        type: "frequency_change",
        severity: changeRatio > 2 || changeRatio < 0.5 ? "critical" : "warning",
        clientId,
        clientName,
        description: slowed
          ? `${clientName} commande moins fréquemment qu'avant`
          : `${clientName} commande plus fréquemment qu'avant`,
        previousBehavior: `Commandait tous les ${Math.round(oldAvg)} jours en moyenne`,
        currentBehavior: `Commande maintenant tous les ${Math.round(recentAvg)} jours`,
        suggestedAction: slowed
          ? "Vérifier si le client a des difficultés ou a trouvé un autre fournisseur"
          : "Opportunité ! Le client augmente son activité, proposer une offre volume",
        detectedAt: new Date(),
        status: "new",
        metadata: { oldFrequency: oldAvg, newFrequency: recentAvg, changeRatio },
      });
    }
  }

  return anomalies;
}

/**
 * Detect clients who have completely stopped ordering
 */
export async function detectStoppedClients(thresholdDays = 21): Promise<BehaviorAnomaly[]> {
  const anomalies: BehaviorAnomaly[] = [];
  const orders = getMockOrders();
  const now = new Date();

  const clientIds = [...new Set(orders.map((o) => o.clientId))];

  for (const clientId of clientIds) {
    const clientOrders = orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

    if (clientOrders.length < 4) continue; // Need enough history

    const lastOrder = clientOrders[0];
    const daysSinceLast = Math.floor((now.getTime() - lastOrder.date.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate average frequency when they were active
    const intervals: number[] = [];
    for (let i = 1; i < Math.min(clientOrders.length, 10); i++) {
      const diff = (clientOrders[i - 1].date.getTime() - clientOrders[i].date.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(diff);
    }
    const avgFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // If they haven't ordered in threshold days AND that's unusual for them
    if (daysSinceLast >= thresholdDays && avgFrequency < thresholdDays / 2) {
      const clientName = clientOrders[0].clientName;
      const totalRevenue = clientOrders.reduce((sum, o) => sum + o.total, 0);

      anomalies.push({
        id: `anomaly_stopped_${clientId}_${Date.now()}`,
        type: "stopped_ordering",
        severity: daysSinceLast > thresholdDays * 2 ? "critical" : "warning",
        clientId,
        clientName,
        description: `${clientName} n'a passé aucune commande depuis ${daysSinceLast} jours`,
        previousBehavior: `Client actif avec commandes tous les ${Math.round(avgFrequency)} jours (CA total: ${totalRevenue.toFixed(0)}€)`,
        currentBehavior: `Inactif depuis ${daysSinceLast} jours`,
        suggestedAction: "URGENT: Contacter immédiatement pour comprendre la raison de l'arrêt",
        detectedAt: new Date(),
        status: "new",
        metadata: {
          daysSinceLastOrder: daysSinceLast,
          avgFrequency,
          totalRevenue,
          lastOrderDate: lastOrder.date,
        },
      });
    }
  }

  return anomalies;
}

/**
 * Detect unusual orders (too large or too small compared to history)
 */
export async function detectUnusualOrders(): Promise<BehaviorAnomaly[]> {
  const anomalies: BehaviorAnomaly[] = [];
  const orders = getMockOrders();
  const now = new Date();
  const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

  const clientIds = [...new Set(orders.map((o) => o.clientId))];

  for (const clientId of clientIds) {
    const clientOrders = orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (clientOrders.length < 5) continue;

    // Get historical average (excluding last order)
    const historyOrders = clientOrders.slice(1);
    const avgTotal = historyOrders.reduce((sum, o) => sum + o.total, 0) / historyOrders.length;
    const stdDev = Math.sqrt(
      historyOrders.reduce((sum, o) => sum + Math.pow(o.total - avgTotal, 2), 0) / historyOrders.length
    );

    // Check if most recent order is unusual
    const lastOrder = clientOrders[0];
    const isRecent = (now.getTime() - lastOrder.date.getTime()) < recentThreshold;

    if (!isRecent) continue;

    const deviation = Math.abs(lastOrder.total - avgTotal) / (stdDev || 1);

    if (deviation > 2) {
      const clientName = lastOrder.clientName;
      const isLarge = lastOrder.total > avgTotal;

      anomalies.push({
        id: `anomaly_unusual_${clientId}_${lastOrder.id}`,
        type: "unusual_order",
        severity: deviation > 3 ? "warning" : "info",
        clientId,
        clientName,
        description: isLarge
          ? `${clientName} a passé une commande inhabituellement importante`
          : `${clientName} a passé une commande inhabituellement petite`,
        previousBehavior: `Commande moyenne: ${avgTotal.toFixed(0)}€`,
        currentBehavior: `Dernière commande: ${lastOrder.total.toFixed(0)}€ (${isLarge ? "+" : "-"}${Math.abs(((lastOrder.total - avgTotal) / avgTotal) * 100).toFixed(0)}%)`,
        suggestedAction: isLarge
          ? "Opportunité ! Contacter pour proposer des offres volume régulières"
          : "Vérifier si le client a des difficultés ou si c'était une commande de dépannage",
        detectedAt: new Date(),
        status: "new",
        metadata: {
          orderTotal: lastOrder.total,
          avgTotal,
          deviation,
          orderDate: lastOrder.date,
        },
      });
    }
  }

  return anomalies;
}

/**
 * Get all anomalies
 */
export async function getAllAnomalies(): Promise<BehaviorAnomaly[]> {
  const [missing, drops, frequency, stopped, unusual] = await Promise.all([
    detectMissingProducts(),
    detectQuantityDrops(),
    detectFrequencyChanges(),
    detectStoppedClients(),
    detectUnusualOrders(),
  ]);

  return [...missing, ...drops, ...frequency, ...stopped, ...unusual].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get anomaly statistics
 */
export async function getAnomalyStats(): Promise<AnomalyStats> {
  const anomalies = await getAllAnomalies();

  const stats: AnomalyStats = {
    total: anomalies.length,
    byType: {
      product_missing: 0,
      quantity_drop: 0,
      frequency_change: 0,
      stopped_ordering: 0,
      unusual_order: 0,
    },
    bySeverity: { critical: 0, warning: 0, info: 0 },
    byStatus: { new: 0, acknowledged: 0, contacted: 0, resolved: 0 },
  };

  for (const a of anomalies) {
    stats.byType[a.type]++;
    stats.bySeverity[a.severity]++;
    stats.byStatus[a.status]++;
  }

  return stats;
}

/**
 * Analyze anomalies with AI to generate insights
 */
export async function analyzeWithAI(anomalies: BehaviorAnomaly[]): Promise<{
  insights: string[];
  prioritizedActions: { clientId: string; clientName: string; action: string; urgency: "high" | "medium" | "low" }[];
}> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!OPENAI_API_KEY || anomalies.length === 0) {
    // Fallback mock response
    return {
      insights: [
        "3 clients présentent des signes de désengagement nécessitant une action immédiate",
        "La baisse des commandes de frites chez Pizza Express pourrait indiquer un changement de menu",
        "Burger King Local est complètement inactif - risque de perte définitive",
        "Tacos Master a considérablement réduit sa fréquence - possible problème de trésorerie",
      ],
      prioritizedActions: anomalies
        .filter((a) => a.severity === "critical" || a.severity === "warning")
        .slice(0, 5)
        .map((a) => ({
          clientId: a.clientId,
          clientName: a.clientName,
          action: a.suggestedAction,
          urgency: a.severity === "critical" ? "high" : "medium" as const,
        })),
    };
  }

  try {
    const anomalySummary = anomalies.slice(0, 10).map((a) => ({
      client: a.clientName,
      type: a.type,
      severity: a.severity,
      description: a.description,
      previousBehavior: a.previousBehavior,
      currentBehavior: a.currentBehavior,
    }));

    const prompt = `Tu es un analyste commercial expert. Analyse ces anomalies de comportement client détectées dans un système de gestion grossiste alimentaire B2B.

Anomalies détectées:
${JSON.stringify(anomalySummary, null, 2)}

Génère un JSON avec:
1. "insights": Liste de 3-5 observations stratégiques sur les patterns détectés
2. "prioritizedActions": Liste des actions prioritaires avec clientId, clientName, action (conseil spécifique), urgency (high/medium/low)

Réponds uniquement en JSON valide, en français.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es un analyste commercial expert en distribution alimentaire B2B." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error("AI analysis error:", error);
  }

  // Return default if AI fails
  return {
    insights: ["Analyse IA non disponible - voir les alertes individuelles"],
    prioritizedActions: anomalies
      .filter((a) => a.severity === "critical")
      .slice(0, 3)
      .map((a) => ({
        clientId: a.clientId,
        clientName: a.clientName,
        action: a.suggestedAction,
        urgency: "high" as const,
      })),
  };
}

/**
 * Update anomaly status
 */
export async function updateAnomalyStatus(
  anomalyId: string,
  status: BehaviorAnomaly["status"],
  notes?: string,
  _assignedTo?: string
): Promise<void> {
  // In production, update Firestore
  console.log("Updating anomaly:", { anomalyId, status, notes, assignedTo: _assignedTo });
}

/**
 * Get client behavior summary
 */
export async function getClientBehaviorSummary(clientId: string): Promise<ClientBehaviorSummary | null> {
  const orders = getMockOrders().filter((o) => o.clientId === clientId);
  if (orders.length === 0) return null;

  const habits = await analyzeClientHabits(clientId);
  const allAnomalies = await getAllAnomalies();
  const clientAnomalies = allAnomalies.filter((a) => a.clientId === clientId);

  const sortedOrders = orders.sort((a, b) => b.date.getTime() - a.date.getTime());
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const now = new Date();
  const daysSinceLast = Math.floor((now.getTime() - sortedOrders[0].date.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate average frequency
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(sortedOrders.length, 10); i++) {
    const diff = (sortedOrders[i - 1].date.getTime() - sortedOrders[i].date.getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }
  const avgFrequency = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0;

  // Calculate risk score
  let riskScore = 0;
  if (daysSinceLast > avgFrequency * 2) riskScore += 30;
  if (clientAnomalies.some((a) => a.severity === "critical")) riskScore += 40;
  if (clientAnomalies.some((a) => a.type === "stopped_ordering")) riskScore += 50;
  riskScore = Math.min(100, riskScore);

  return {
    clientId,
    clientName: sortedOrders[0].clientName,
    clientType: "restaurant", // Would come from client data
    totalProducts: habits.length,
    avgOrderFrequencyDays: Math.round(avgFrequency),
    lastOrderDate: sortedOrders[0].date,
    daysSinceLastOrder: daysSinceLast,
    totalRevenue,
    paymentStatus: "good", // Would come from invoice data
    riskScore,
    habits,
    anomalies: clientAnomalies,
  };
}
