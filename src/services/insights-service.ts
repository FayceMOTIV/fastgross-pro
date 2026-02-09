// Types removed - were unused (Client, Order, Prospect)

// Types for AI Insights
export interface AIInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "action";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  suggestedActions: string[];
  relatedData: Record<string, unknown>;
  createdAt: Date;
}

export interface WeeklyReportData {
  period: { start: Date; end: Date };
  revenue: { total: number; change: number };
  orders: { total: number; change: number };
  clients: { new: number; churned: number };
  topProducts: { name: string; quantity: number }[];
  insights: AIInsight[];
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Helper to call OpenAI API
async function callOpenAIAPI(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt || "Tu es un assistant business analyst expert en distribution alimentaire B2B. Réponds toujours en français de manière concise et actionnable.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Return fallback response
    return "Analyse non disponible. Veuillez réessayer ultérieurement.";
  }
}

// Generate unique insight ID
function generateInsightId(): string {
  return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect inactive clients who haven't ordered in X days
 */
export async function detectInactiveClients(days: number = 30): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  try {
    // In production, this would query Firestore
    // For now, we'll generate mock insights based on the analysis pattern

    const mockInactiveClients = [
      { name: "Tacos Avenue", lastOrder: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), avgMonthlyRevenue: 2500 },
      { name: "La Friterie", lastOrder: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000), avgMonthlyRevenue: 1800 },
      { name: "Burger Express", lastOrder: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), avgMonthlyRevenue: 3200 },
    ];

    for (const client of mockInactiveClients) {
      const daysSinceOrder = Math.floor((Date.now() - client.lastOrder.getTime()) / (24 * 60 * 60 * 1000));
      const potentialLoss = client.avgMonthlyRevenue * 12;

      const aiAnalysis = await callOpenAIAPI(
        `Client "${client.name}" n'a pas commandé depuis ${daysSinceOrder} jours. Son CA moyen mensuel était de ${client.avgMonthlyRevenue}€. Propose une action de réactivation en 1 phrase.`
      );

      insights.push({
        id: generateInsightId(),
        type: "risk",
        title: `Client inactif: ${client.name}`,
        description: `Aucune commande depuis ${daysSinceOrder} jours. Risque de perte annuelle: ${potentialLoss.toLocaleString()}€`,
        impact: potentialLoss > 30000 ? "high" : potentialLoss > 15000 ? "medium" : "low",
        suggestedActions: [
          aiAnalysis.trim() || "Appeler pour comprendre la situation",
          "Proposer une offre promotionnelle personnalisée",
          "Planifier une visite commerciale",
        ],
        relatedData: {
          clientName: client.name,
          daysSinceLastOrder: daysSinceOrder,
          potentialAnnualLoss: potentialLoss,
        },
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error detecting inactive clients:", error);
  }

  return insights;
}

/**
 * Predict churn risk for a specific client
 */
export async function predictChurnRisk(clientId: string): Promise<AIInsight> {
  // Mock client data for analysis
  const mockClientData = {
    id: clientId,
    name: "Le Kebab du Coin",
    orderFrequency: "weekly",
    lastOrderDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    avgOrderValue: 450,
    orderTrend: -15, // % change vs previous period
    paymentDelays: 2,
    competitorMentions: true,
  };

  const riskFactors: string[] = [];
  let riskScore = 0;

  // Analyze risk factors
  if (mockClientData.orderTrend < -10) {
    riskFactors.push("Baisse des commandes de " + Math.abs(mockClientData.orderTrend) + "%");
    riskScore += 30;
  }
  if (mockClientData.paymentDelays > 1) {
    riskFactors.push(`${mockClientData.paymentDelays} retards de paiement récents`);
    riskScore += 20;
  }
  if (mockClientData.competitorMentions) {
    riskFactors.push("A mentionné des concurrents récemment");
    riskScore += 25;
  }

  const daysSinceOrder = Math.floor((Date.now() - mockClientData.lastOrderDate.getTime()) / (24 * 60 * 60 * 1000));
  if (daysSinceOrder > 10) {
    riskFactors.push(`${daysSinceOrder} jours depuis dernière commande`);
    riskScore += 15;
  }

  const prompt = `
    Client: ${mockClientData.name}
    Facteurs de risque identifiés: ${riskFactors.join(", ")}
    Score de risque: ${riskScore}/100

    Propose 3 actions concrètes pour réduire le risque de perte de ce client.
  `;

  const aiResponse = await callOpenAIAPI(prompt);
  const actions = aiResponse.split("\n").filter(line => line.trim()).slice(0, 3);

  return {
    id: generateInsightId(),
    type: "risk",
    title: `Risque de churn: ${mockClientData.name}`,
    description: `Score de risque: ${riskScore}/100. Facteurs: ${riskFactors.join(", ")}`,
    impact: riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low",
    suggestedActions: actions.length > 0 ? actions : [
      "Contacter le client pour feedback",
      "Proposer des conditions préférentielles",
      "Organiser une rencontre commerciale",
    ],
    relatedData: {
      clientId,
      clientName: mockClientData.name,
      riskScore,
      riskFactors,
    },
    createdAt: new Date(),
  };
}

/**
 * Identify upsell opportunities based on order patterns
 */
export async function identifyUpsellOpportunities(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Mock analysis data
  const opportunities = [
    {
      client: "Napoli Pizza",
      currentProducts: ["Mozzarella", "Sauce tomate", "Farine"],
      suggestedProducts: ["Huile d'olive premium", "Jambon italien"],
      reason: "Commande régulièrement des produits italiens",
      estimatedIncrease: 350,
    },
    {
      client: "Brooklyn Burger",
      currentProducts: ["Steaks", "Pain burger", "Cheddar"],
      suggestedProducts: ["Bacon premium", "Sauce BBQ maison"],
      reason: "Panier moyen inférieur à la catégorie",
      estimatedIncrease: 280,
    },
    {
      client: "Tacos King",
      currentProducts: ["Viande kebab", "Tortillas"],
      suggestedProducts: ["Guacamole frais", "Pico de gallo"],
      reason: "Tendance tacos premium dans le secteur",
      estimatedIncrease: 420,
    },
  ];

  for (const opp of opportunities) {
    insights.push({
      id: generateInsightId(),
      type: "opportunity",
      title: `Opportunité upsell: ${opp.client}`,
      description: `Potentiel +${opp.estimatedIncrease}€/mois. ${opp.reason}`,
      impact: opp.estimatedIncrease > 350 ? "high" : opp.estimatedIncrease > 200 ? "medium" : "low",
      suggestedActions: [
        `Proposer ${opp.suggestedProducts[0]} lors de la prochaine commande`,
        `Créer un bundle avec ${opp.suggestedProducts.join(" et ")}`,
        "Offrir un échantillon gratuit pour test",
      ],
      relatedData: {
        clientName: opp.client,
        currentProducts: opp.currentProducts,
        suggestedProducts: opp.suggestedProducts,
        estimatedMonthlyIncrease: opp.estimatedIncrease,
      },
      createdAt: new Date(),
    });
  }

  return insights;
}

/**
 * Analyze seasonal trends and patterns
 */
export async function analyzeSeasonalTrends(): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  // Mock seasonal data analysis
  const trends = [
    {
      trend: "Pic de demande kebab prévu",
      period: "Prochaines 2 semaines",
      products: ["Viande kebab", "Sauce blanche", "Pain pita"],
      recommendation: "Augmenter le stock de 30%",
      confidence: 85,
    },
    {
      trend: "Baisse saisonnière glaces/desserts",
      period: "Novembre-Février",
      products: ["Glaces", "Desserts froids"],
      recommendation: "Réduire les commandes de 40%",
      confidence: 92,
    },
    {
      trend: "Événement sportif à venir",
      period: "Semaine du 15",
      products: ["Ailes de poulet", "Nachos", "Sodas"],
      recommendation: "Prévoir +50% sur snacking",
      confidence: 78,
    },
  ];

  for (const trend of trends) {
    insights.push({
      id: generateInsightId(),
      type: "trend",
      title: trend.trend,
      description: `Période: ${trend.period}. Confiance: ${trend.confidence}%`,
      impact: trend.confidence > 85 ? "high" : trend.confidence > 70 ? "medium" : "low",
      suggestedActions: [
        trend.recommendation,
        `Prévenir les clients concernés par ${trend.products[0]}`,
        "Ajuster les prix si nécessaire",
      ],
      relatedData: {
        period: trend.period,
        affectedProducts: trend.products,
        confidenceScore: trend.confidence,
      },
      createdAt: new Date(),
    });
  }

  return insights;
}

/**
 * Suggest optimal pricing for a product
 */
export async function suggestOptimalPricing(productId: string): Promise<AIInsight> {
  // Mock product data
  const product = {
    id: productId,
    name: "Huile de friture 10L",
    currentPrice: 15.90,
    cost: 9.50,
    competitorPrices: [14.50, 16.20, 15.80],
    demandElasticity: -1.2, // 1% price increase = 1.2% demand decrease
    currentMargin: 40.3,
  };

  const avgCompetitorPrice = product.competitorPrices.reduce((a, b) => a + b, 0) / product.competitorPrices.length;
  const optimalPrice = Math.round((avgCompetitorPrice * 0.95) * 100) / 100; // Slightly below average
  const newMargin = ((optimalPrice - product.cost) / optimalPrice) * 100;

  const prompt = `
    Produit: ${product.name}
    Prix actuel: ${product.currentPrice}€
    Prix concurrents: ${product.competitorPrices.join("€, ")}€
    Prix optimal suggéré: ${optimalPrice}€

    Explique en 1-2 phrases pourquoi ce prix est optimal.
  `;

  const aiExplanation = await callOpenAIAPI(prompt);

  return {
    id: generateInsightId(),
    type: "action",
    title: `Optimisation prix: ${product.name}`,
    description: aiExplanation || `Prix suggéré: ${optimalPrice}€ (vs ${product.currentPrice}€ actuel). Marge: ${newMargin.toFixed(1)}%`,
    impact: Math.abs(optimalPrice - product.currentPrice) > 1 ? "high" : "medium",
    suggestedActions: [
      `Ajuster le prix à ${optimalPrice}€`,
      "Tester sur un segment de clients",
      "Surveiller l'impact sur les volumes",
    ],
    relatedData: {
      productId,
      productName: product.name,
      currentPrice: product.currentPrice,
      suggestedPrice: optimalPrice,
      currentMargin: product.currentMargin,
      newMargin: newMargin,
    },
    createdAt: new Date(),
  };
}

/**
 * Generate a comprehensive weekly report in Markdown format
 */
export async function generateWeeklyReport(): Promise<string> {
  const reportData: WeeklyReportData = {
    period: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    revenue: { total: 58750, change: 12.5 },
    orders: { total: 234, change: 8.3 },
    clients: { new: 5, churned: 1 },
    topProducts: [
      { name: "Huile de friture 10L", quantity: 156 },
      { name: "Frites surgelées 5kg", quantity: 142 },
      { name: "Viande kebab 5kg", quantity: 98 },
      { name: "Mozzarella râpée 2kg", quantity: 87 },
      { name: "Sauce tomate 5L", quantity: 76 },
    ],
    insights: [],
  };

  // Gather insights
  const [inactive, upsell, trends] = await Promise.all([
    detectInactiveClients(30),
    identifyUpsellOpportunities(),
    analyzeSeasonalTrends(),
  ]);
  reportData.insights = [...inactive, ...upsell, ...trends];

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const report = `
# Rapport Hebdomadaire DISTRAM

**Période:** ${formatDate(reportData.period.start)} - ${formatDate(reportData.period.end)}

---

## Résumé Exécutif

| Indicateur | Valeur | Évolution |
|------------|--------|-----------|
| Chiffre d'affaires | ${reportData.revenue.total.toLocaleString()}€ | ${reportData.revenue.change > 0 ? "+" : ""}${reportData.revenue.change}% |
| Commandes | ${reportData.orders.total} | ${reportData.orders.change > 0 ? "+" : ""}${reportData.orders.change}% |
| Nouveaux clients | ${reportData.clients.new} | - |
| Clients perdus | ${reportData.clients.churned} | - |

---

## Top 5 Produits

${reportData.topProducts.map((p, i) => `${i + 1}. **${p.name}** - ${p.quantity} unités`).join("\n")}

---

## Insights IA

### Opportunités (${reportData.insights.filter(i => i.type === "opportunity").length})
${reportData.insights.filter(i => i.type === "opportunity").map(i => `- **${i.title}**: ${i.description}`).join("\n") || "Aucune opportunité identifiée cette semaine."}

### Risques (${reportData.insights.filter(i => i.type === "risk").length})
${reportData.insights.filter(i => i.type === "risk").map(i => `- **${i.title}**: ${i.description}`).join("\n") || "Aucun risque majeur identifié."}

### Tendances (${reportData.insights.filter(i => i.type === "trend").length})
${reportData.insights.filter(i => i.type === "trend").map(i => `- **${i.title}**: ${i.description}`).join("\n") || "Pas de tendance particulière détectée."}

---

## Actions Recommandées

${reportData.insights.slice(0, 5).flatMap(i => i.suggestedActions.slice(0, 1).map(a => `- [ ] ${a}`)).join("\n")}

---

*Rapport généré automatiquement par DISTRAM AI le ${formatDate(new Date())}*
  `.trim();

  return report;
}

/**
 * Get all insights for display
 */
export async function getAllInsights(): Promise<AIInsight[]> {
  const [inactive, upsell, trends, pricing] = await Promise.all([
    detectInactiveClients(30),
    identifyUpsellOpportunities(),
    analyzeSeasonalTrends(),
    suggestOptimalPricing("product_1"),
  ]);

  return [...inactive, ...upsell, ...trends, pricing].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}

/**
 * Ask AI a custom question about business data
 */
export async function askAI(question: string, _context?: Record<string, unknown>): Promise<string> {
  const contextStr = _context ? `\nContexte: ${JSON.stringify(_context)}` : "";

  const prompt = `
    Question utilisateur: ${question}
    ${contextStr}

    Réponds de manière concise et actionnable en 2-3 phrases maximum.
  `;

  return callOpenAIAPI(prompt);
}
