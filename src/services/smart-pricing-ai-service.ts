/**
 * Smart Pricing AI Service
 * Génère des suggestions de promotion intelligentes qui respectent TOUJOURS les marges
 */

import {
  PricingContext,
  SmartPromoSuggestion,
  AIPromoRequest,
  PromoProduct,
  FinancialImpact,
} from "@/types/pricing";
import {
  getFullPricingContext,
  getMultiplePricingContexts,
  calculateMarginPercent,
  calculatePriceAfterDiscount,
  getAllProducts,
  getAllCategoryRules,
} from "./pricing-service";

// ============================================
// TYPES INTERNES
// ============================================

interface DiscountLimit {
  productId: string;
  productName: string;
  currentPrice: number;
  purchasePrice: number;
  currentMargin: number;
  minMargin: number;
  maxDiscountPossible: number;
  canDiscount: boolean;
  isOverstock: boolean;
  daysUntilExpiration?: number;
}

interface AIResponse {
  suggestions: RawAISuggestion[];
}

interface RawAISuggestion {
  type: "discount" | "bundle" | "volume" | "loyalty" | "alternative" | "freebie";
  title: string;
  description: string;
  products?: {
    id: string;
    name: string;
    discountPercent: number;
    newPrice?: number;
  }[];
  conditions?: string[];
  validityDays?: number;
  estimatedRevenueLoss?: number;
  estimatedVolumeGain?: string;
  marginAfterPercent?: number;
  isRentable?: boolean;
  rentabilityExplanation?: string;
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
}

// ============================================
// SERVICE PRINCIPAL
// ============================================

/**
 * Génère des suggestions de promo intelligentes et SÛRES
 * L'IA est contrainte par les limites de marge calculées en amont
 */
export async function generateSmartPromoSuggestion(
  request: AIPromoRequest
): Promise<SmartPromoSuggestion[]> {
  try {
    // 1. Récupérer le contexte pricing pour tous les produits
    const pricingContexts: PricingContext[] = request.productIds
      ? await getMultiplePricingContexts(request.productIds, request.clientId)
      : [];

    // 2. Calculer les limites STRICTES avant d'appeler l'IA
    const discountLimits = pricingContexts.map((ctx) =>
      buildDiscountLimit(ctx)
    );

    // 3. Construire le prompt avec les contraintes
    const prompt = buildAIPrompt(request, discountLimits);

    // 4. Appeler l'IA
    const aiSuggestions = await callGroqAPI(prompt);

    // 5. VÉRIFIER et corriger les suggestions de l'IA
    const verifiedSuggestions = verifySuggestions(
      aiSuggestions,
      discountLimits
    );

    return verifiedSuggestions;
  } catch (error) {
    console.error("Erreur génération promo IA:", error);

    // Fallback: suggestions générées par règles
    return generateRuleBasedSuggestions(request);
  }
}

/**
 * Construit les limites de remise pour un produit
 */
function buildDiscountLimit(ctx: PricingContext): DiscountLimit {
  return {
    productId: ctx.product.productId,
    productName: ctx.product.productName,
    currentPrice: ctx.calculations.clientPrice,
    purchasePrice: ctx.product.purchasePriceWithFees,
    currentMargin: ctx.calculations.clientMarginPercent,
    minMargin: ctx.categoryRules.minMarginPercent,
    maxDiscountPossible: ctx.calculations.maxAdditionalDiscount,
    canDiscount: ctx.calculations.canOfferPromo,
    isOverstock: ctx.product.isOverstock,
    daysUntilExpiration: ctx.product.daysUntilExpiration,
  };
}

/**
 * Construit le prompt pour l'IA avec les contraintes strictes
 */
function buildAIPrompt(
  request: AIPromoRequest,
  limits: DiscountLimit[]
): string {
  const situationText = situationToText(request.situation);

  const productsConstraints =
    limits.length > 0
      ? limits
          .map(
            (p) => `
- ${p.productName}:
  * Prix actuel client: ${p.currentPrice.toFixed(2)}€
  * Marge actuelle: ${p.currentMargin.toFixed(1)}%
  * Marge minimum requise: ${p.minMargin}%
  * REMISE MAXIMUM AUTORISÉE: ${p.maxDiscountPossible.toFixed(1)}%
  * ${p.canDiscount ? "✅ Remise possible" : "❌ AUCUNE REMISE POSSIBLE"}
  ${p.isOverstock ? "* ⚠️ Surstock: flexibilité possible" : ""}
  ${p.daysUntilExpiration ? `* ⚠️ Expire dans ${p.daysUntilExpiration} jours` : ""}`
          )
          .join("\n")
      : "Aucun produit spécifique - proposer des offres générales";

  return `Tu es un expert en pricing et stratégie commerciale pour un grossiste alimentaire B2B.

SITUATION:
- Client: ${request.clientName}
- Problème: ${situationText}
${request.additionalContext ? `- Contexte: ${request.additionalContext}` : ""}
${request.maxBudget ? `- Budget max pour la promo: ${request.maxBudget}€` : ""}

CONTRAINTES DE MARGE (OBLIGATOIRES - NE JAMAIS DÉPASSER):
${productsConstraints}

RÈGLES STRICTES:
1. Tu ne peux JAMAIS proposer une remise supérieure au "REMISE MAXIMUM AUTORISÉE"
2. Si un produit a "AUCUNE REMISE POSSIBLE", propose UNIQUEMENT des alternatives:
   - Points fidélité supplémentaires
   - Bundle avec un autre produit
   - Offre volume (ex: 3 achetés = 1 offert)
   - Livraison gratuite
   - Service premium
3. Explique toujours l'impact financier de façon honnête
4. Privilégie les solutions gagnant-gagnant
5. Ne propose que des offres réalistes et professionnelles

DEMANDE:
Propose 2-3 stratégies commerciales adaptées à cette situation.

IMPORTANT: Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "suggestions": [
    {
      "type": "discount|bundle|volume|loyalty|alternative|freebie",
      "title": "Titre court et accrocheur",
      "description": "Description de l'offre en 1-2 phrases",
      "products": [
        { "id": "xxx", "name": "xxx", "discountPercent": X.X, "newPrice": X.XX }
      ],
      "conditions": ["condition 1", "condition 2"],
      "validityDays": 30,
      "estimatedRevenueLoss": X.XX,
      "estimatedVolumeGain": "+X%",
      "marginAfterPercent": X.X,
      "isRentable": true,
      "rentabilityExplanation": "Explication courte de la rentabilité",
      "confidence": "high|medium|low",
      "warnings": []
    }
  ]
}`;
}

/**
 * Appelle l'API Groq
 */
async function callGroqAPI(prompt: string): Promise<RawAISuggestion[]> {
  const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.warn("Groq API key not found, using rule-based suggestions");
    return [];
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Tu es un expert en pricing B2B pour grossistes alimentaires. Tu réponds TOUJOURS en JSON valide.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return [];
    }

    const parsed: AIResponse = JSON.parse(content);
    return parsed.suggestions || [];
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return [];
  }
}

/**
 * Vérifie et corrige les suggestions de l'IA
 * C'est la couche de sécurité qui garantit le respect des marges
 */
function verifySuggestions(
  suggestions: RawAISuggestion[],
  limits: DiscountLimit[]
): SmartPromoSuggestion[] {
  const verified: SmartPromoSuggestion[] = [];

  for (const suggestion of suggestions) {
    const warnings: string[] = [...(suggestion.warnings || [])];
    const correctedProducts: PromoProduct[] = [];

    // Vérifier et corriger chaque produit
    if (suggestion.products && suggestion.products.length > 0) {
      for (const product of suggestion.products) {
        const limit = limits.find((l) => l.productId === product.id);

        if (!limit) {
          // Produit inconnu, on le garde tel quel avec un warning
          warnings.push(`⚠️ Produit ${product.name} non vérifié`);
          correctedProducts.push({
            id: product.id,
            name: product.name,
            originalPrice: 0,
            discountPercent: product.discountPercent,
            newPrice: product.newPrice || 0,
            marginAfter: 0,
          });
          continue;
        }

        let finalDiscount = product.discountPercent;

        // Vérifier que la remise ne dépasse pas le max
        if (product.discountPercent > limit.maxDiscountPossible) {
          warnings.push(
            `⚠️ Remise sur ${product.name} ajustée: ${product.discountPercent.toFixed(1)}% → ${limit.maxDiscountPossible.toFixed(1)}% (marge minimum)`
          );
          finalDiscount = limit.maxDiscountPossible;
        }

        // Vérifier que le produit peut avoir une remise
        if (!limit.canDiscount && product.discountPercent > 0) {
          warnings.push(
            `❌ Remise supprimée sur ${product.name} - marge déjà au minimum`
          );
          finalDiscount = 0;
        }

        // Calculer le nouveau prix et la nouvelle marge
        const newPrice = calculatePriceAfterDiscount(
          limit.currentPrice,
          finalDiscount
        );
        const marginAfter = calculateMarginPercent(limit.purchasePrice, newPrice);

        correctedProducts.push({
          id: product.id,
          name: product.name,
          originalPrice: limit.currentPrice,
          discountPercent: finalDiscount,
          newPrice,
          marginAfter,
        });
      }
    }

    // Recalculer l'impact financier réel
    const financialImpact = recalculateFinancialImpact(
      correctedProducts,
      limits,
      suggestion
    );

    verified.push({
      type: suggestion.type,
      title: suggestion.title,
      description: suggestion.description,
      details: {
        products: correctedProducts.length > 0 ? correctedProducts : undefined,
        conditions: suggestion.conditions,
        validityDays: suggestion.validityDays,
      },
      financialImpact,
      confidence: warnings.length > 2 ? "low" : suggestion.confidence || "medium",
      warnings,
    });
  }

  return verified;
}

/**
 * Recalcule l'impact financier réel après correction
 */
function recalculateFinancialImpact(
  products: PromoProduct[],
  limits: DiscountLimit[],
  originalSuggestion: RawAISuggestion
): FinancialImpact {
  if (!products || products.length === 0) {
    return {
      estimatedRevenueLoss: 0,
      estimatedVolumeGain: originalSuggestion.estimatedVolumeGain || "+5-10%",
      marginAfter: limits.length > 0 ? limits[0].currentMargin : 15,
      isRentable: true,
      rentabilityExplanation:
        originalSuggestion.rentabilityExplanation ||
        "Offre sans impact direct sur les marges",
    };
  }

  let totalRevenueLoss = 0;
  let totalMarginAfter = 0;

  for (const product of products) {
    const limit = limits.find((l) => l.productId === product.id);
    if (!limit) continue;

    const revenueLoss =
      limit.currentPrice * (product.discountPercent / 100);
    totalRevenueLoss += revenueLoss;
    totalMarginAfter += product.marginAfter;
  }

  const avgMarginAfter =
    products.length > 0
      ? Math.round((totalMarginAfter / products.length) * 10) / 10
      : 0;

  // Vérifier si c'est rentable (marge moyenne >= marge min moyenne)
  const avgMinMargin =
    limits.reduce((sum, l) => sum + l.minMargin, 0) / limits.length;
  const isRentable = avgMarginAfter >= avgMinMargin;

  return {
    estimatedRevenueLoss: Math.round(totalRevenueLoss * 100) / 100,
    estimatedVolumeGain: originalSuggestion.estimatedVolumeGain || "+10-15%",
    marginAfter: avgMarginAfter,
    isRentable,
    rentabilityExplanation: isRentable
      ? `Marge moyenne de ${avgMarginAfter.toFixed(1)}% reste au-dessus du minimum requis`
      : `Attention: marge moyenne de ${avgMarginAfter.toFixed(1)}% sous le minimum recommandé`,
  };
}

/**
 * Génère des suggestions basées sur des règles (fallback sans IA)
 */
async function generateRuleBasedSuggestions(
  request: AIPromoRequest
): Promise<SmartPromoSuggestion[]> {
  const suggestions: SmartPromoSuggestion[] = [];

  // Récupérer les contextes si des produits sont spécifiés
  let pricingContexts: PricingContext[] = [];
  if (request.productIds) {
    pricingContexts = await getMultiplePricingContexts(
      request.productIds,
      request.clientId
    );
  }

  const limits = pricingContexts.map((ctx) => buildDiscountLimit(ctx));
  const discountableProducts = limits.filter(
    (l) => l.canDiscount && l.maxDiscountPossible >= 3
  );

  // Suggestion 1: Remise produit si possible
  if (discountableProducts.length > 0) {
    const products: PromoProduct[] = discountableProducts.map((p) => {
      const discount = Math.min(p.maxDiscountPossible, 8);
      const newPrice = calculatePriceAfterDiscount(p.currentPrice, discount);
      const marginAfter = calculateMarginPercent(p.purchasePrice, newPrice);

      return {
        id: p.productId,
        name: p.productName,
        originalPrice: p.currentPrice,
        discountPercent: Math.round(discount * 10) / 10,
        newPrice,
        marginAfter,
      };
    });

    const totalRevenueLoss = products.reduce(
      (sum, p) => sum + p.originalPrice * (p.discountPercent / 100),
      0
    );
    const avgMarginAfter =
      products.reduce((sum, p) => sum + p.marginAfter, 0) / products.length;

    suggestions.push({
      type: "discount",
      title: "Offre ciblée",
      description: `Remise exclusive sur ${products.length} produit(s) sélectionné(s)`,
      details: {
        products,
        conditions: [
          "Valable sur la prochaine commande",
          "Non cumulable avec d'autres offres",
        ],
        validityDays: 15,
      },
      financialImpact: {
        estimatedRevenueLoss: Math.round(totalRevenueLoss * 100) / 100,
        estimatedVolumeGain: "+15-20%",
        marginAfter: Math.round(avgMarginAfter * 10) / 10,
        isRentable: true,
        rentabilityExplanation:
          "Remise calculée pour maintenir une marge acceptable",
      },
      confidence: "high",
      warnings: [],
    });
  }

  // Suggestion 2: Programme fidélité (toujours possible)
  suggestions.push({
    type: "loyalty",
    title: "Bonus Fidélité",
    description: "Points fidélité doublés pendant 30 jours",
    details: {
      conditions: [
        "Points x2 sur toutes les commandes",
        "Cumulable avec les remises existantes",
        "Valable 30 jours",
      ],
      validityDays: 30,
    },
    financialImpact: {
      estimatedRevenueLoss: 0,
      estimatedVolumeGain: "+10-15%",
      marginAfter: limits.length > 0 ? limits[0].currentMargin : 15,
      isRentable: true,
      rentabilityExplanation:
        "Aucun impact immédiat sur les marges - fidélisation long terme",
    },
    confidence: "high",
    warnings: [],
  });

  // Suggestion 3: Offre volume
  if (request.situation === "volume" || request.situation === "upsell") {
    suggestions.push({
      type: "volume",
      title: "Offre Volume",
      description: "Achetez plus, payez moins: paliers de remise progressifs",
      details: {
        conditions: [
          "500€ de commande: -3%",
          "1000€ de commande: -5%",
          "2000€ de commande: -8%",
        ],
        validityDays: 30,
      },
      financialImpact: {
        estimatedRevenueLoss: 0,
        estimatedVolumeGain: "+25-40%",
        marginAfter: limits.length > 0 ? limits[0].currentMargin - 5 : 10,
        isRentable: true,
        rentabilityExplanation:
          "La hausse du volume compense la baisse de marge unitaire",
      },
      confidence: "medium",
      warnings: [],
    });
  }

  // Suggestion 4: Offre périssable si applicable
  const perishableProducts = limits.filter(
    (l) => l.daysUntilExpiration && l.daysUntilExpiration <= 7
  );
  if (perishableProducts.length > 0) {
    const products: PromoProduct[] = perishableProducts.map((p) => {
      const discount = Math.min(p.maxDiscountPossible + 5, 25); // Plus agressif pour périssables
      const newPrice = calculatePriceAfterDiscount(p.currentPrice, discount);
      const marginAfter = calculateMarginPercent(p.purchasePrice, newPrice);

      return {
        id: p.productId,
        name: p.productName,
        originalPrice: p.currentPrice,
        discountPercent: Math.round(discount * 10) / 10,
        newPrice,
        marginAfter,
      };
    });

    suggestions.push({
      type: "discount",
      title: "Vente Flash - Dates Courtes",
      description: `Produits à consommer rapidement - Remise exceptionnelle`,
      details: {
        products,
        conditions: [
          "Dates de consommation courtes",
          "Stock limité",
          "Offre non renouvelable",
        ],
        validityDays: 3,
      },
      financialImpact: {
        estimatedRevenueLoss: products.reduce(
          (sum, p) => sum + p.originalPrice * (p.discountPercent / 100),
          0
        ),
        estimatedVolumeGain: "+50-100%",
        marginAfter: products.reduce((sum, p) => sum + p.marginAfter, 0) / products.length,
        isRentable: true,
        rentabilityExplanation:
          "Mieux vaut vendre à marge réduite que jeter le produit",
      },
      confidence: "high",
      warnings: ["Dates de péremption courtes - action urgente"],
    });
  }

  return suggestions;
}

/**
 * Convertit la situation en texte lisible
 */
function situationToText(situation: string): string {
  const texts: Record<string, string> = {
    inactive_client: "Client inactif depuis plusieurs semaines - besoin de le réactiver",
    churn_risk: "Risque de perte du client - baisse significative des commandes",
    upsell: "Opportunité d'augmenter le panier moyen du client",
    new_client: "Nouveau client à conquérir et fidéliser",
    competitive_threat: "Menace concurrentielle - le client compare les prix",
    overstock: "Besoin de déstocker certains produits rapidement",
    seasonal: "Opportunité saisonnière à saisir",
    loyalty_reward: "Récompenser un client fidèle et exemplaire",
  };
  return texts[situation] || situation;
}

// ============================================
// FONCTIONS UTILITAIRES EXPORTÉES
// ============================================

/**
 * Vérifie si une promotion IA est sûre avant de l'appliquer
 */
export async function validatePromoBeforeApply(
  promo: SmartPromoSuggestion,
  clientId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!promo.details.products || promo.details.products.length === 0) {
    return { valid: true, errors: [] }; // Pas de produits = OK
  }

  for (const product of promo.details.products) {
    const ctx = await getFullPricingContext(product.id, clientId);

    if (!ctx) {
      errors.push(`Produit ${product.name} introuvable`);
      continue;
    }

    // Vérifier que la remise ne dépasse pas le max
    if (product.discountPercent > ctx.calculations.maxAdditionalDiscount) {
      errors.push(
        `Remise ${product.discountPercent}% sur ${product.name} dépasse le maximum autorisé (${ctx.calculations.maxAdditionalDiscount.toFixed(1)}%)`
      );
    }

    // Vérifier que la marge reste positive (sauf déstockage)
    if (product.marginAfter < 0 && !ctx.product.isOverstock) {
      errors.push(
        `La remise sur ${product.name} entraînerait une perte (marge: ${product.marginAfter.toFixed(1)}%)`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Génère un rapport sur les opportunités de promo
 */
export async function analyzePromoOpportunities(): Promise<{
  totalProducts: number;
  productsWithRoom: number;
  overstockProducts: number;
  perishableProducts: number;
  topOpportunities: {
    productId: string;
    productName: string;
    maxDiscount: number;
    reason: string;
  }[];
}> {
  const products = await getAllProducts();
  const rules = await getAllCategoryRules();

  let productsWithRoom = 0;
  let overstockProducts = 0;
  let perishableProducts = 0;
  const opportunities: {
    productId: string;
    productName: string;
    maxDiscount: number;
    reason: string;
  }[] = [];

  for (const product of products) {
    const categoryRule = rules.find((r) => r.categoryId === product.categoryId);
    if (!categoryRule) continue;

    const margin = calculateMarginPercent(
      product.purchasePriceWithFees,
      product.baseSellingPrice
    );
    const roomForDiscount = margin - categoryRule.minMarginPercent;

    if (roomForDiscount > 3) {
      productsWithRoom++;
      opportunities.push({
        productId: product.productId,
        productName: product.productName,
        maxDiscount: Math.round(roomForDiscount * 10) / 10,
        reason: "Marge confortable",
      });
    }

    if (product.isOverstock) {
      overstockProducts++;
      opportunities.push({
        productId: product.productId,
        productName: product.productName,
        maxDiscount: roomForDiscount + 10,
        reason: "Surstock - déstockage prioritaire",
      });
    }

    if (product.daysUntilExpiration && product.daysUntilExpiration <= 7) {
      perishableProducts++;
      opportunities.push({
        productId: product.productId,
        productName: product.productName,
        maxDiscount: roomForDiscount + 15,
        reason: `Expire dans ${product.daysUntilExpiration} jours`,
      });
    }
  }

  // Trier par potentiel de remise
  opportunities.sort((a, b) => b.maxDiscount - a.maxDiscount);

  return {
    totalProducts: products.length,
    productsWithRoom,
    overstockProducts,
    perishableProducts,
    topOpportunities: opportunities.slice(0, 10),
  };
}
