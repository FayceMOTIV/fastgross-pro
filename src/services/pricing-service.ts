/**
 * Pricing Service - Calculs de marges et vérifications
 * Garantit que toutes les remises respectent les marges minimales
 */

import {
  ProductPricing,
  CategoryMarginRules,
  ClientPricing,
  PricingContext,
  SupplierConditions,
  DiscountValidation,
  DiscountSuggestion,
  DiscountSimulation,
  MarginAlert,
  DEFAULT_MARGIN_RULES,
  DEFAULT_PRICE_GRIDS,
  PriceGrid,
} from "@/types/pricing";

// ============================================
// CALCULS DE BASE
// ============================================

/**
 * Calcule la marge en pourcentage
 * Formule: ((Prix vente - Prix achat) / Prix vente) * 100
 */
export function calculateMarginPercent(
  purchasePrice: number,
  sellingPrice: number
): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - purchasePrice) / sellingPrice) * 100;
}

/**
 * Calcule la marge en euros
 */
export function calculateMarginAmount(
  purchasePrice: number,
  sellingPrice: number
): number {
  return sellingPrice - purchasePrice;
}

/**
 * Calcule le coefficient multiplicateur
 */
export function calculateMarkup(
  purchasePrice: number,
  sellingPrice: number
): number {
  if (purchasePrice === 0) return 0;
  return sellingPrice / purchasePrice;
}

/**
 * Calcule le prix de vente minimum pour respecter une marge
 * Formule: Prix achat / (1 - marge%)
 */
export function calculateMinSellingPrice(
  purchasePrice: number,
  minMarginPercent: number
): number {
  if (minMarginPercent >= 100) return Infinity;
  return purchasePrice / (1 - minMarginPercent / 100);
}

/**
 * Calcule le prix de vente pour atteindre une marge cible
 */
export function calculatePriceForTargetMargin(
  purchasePrice: number,
  targetMarginPercent: number
): number {
  return calculateMinSellingPrice(purchasePrice, targetMarginPercent);
}

/**
 * Calcule la remise maximum possible en respectant la marge minimum
 */
export function calculateMaxDiscount(
  purchasePrice: number,
  currentSellingPrice: number,
  minMarginPercent: number
): { percent: number; amount: number } {
  const minPrice = calculateMinSellingPrice(purchasePrice, minMarginPercent);
  const maxDiscountAmount = currentSellingPrice - minPrice;
  const maxDiscountPercent = (maxDiscountAmount / currentSellingPrice) * 100;

  return {
    percent: Math.max(0, Math.round(maxDiscountPercent * 100) / 100),
    amount: Math.max(0, Math.round(maxDiscountAmount * 100) / 100),
  };
}

/**
 * Calcule le prix après application d'une remise
 */
export function calculatePriceAfterDiscount(
  price: number,
  discountPercent: number
): number {
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

/**
 * Calcule la remise en pourcentage entre deux prix
 */
export function calculateDiscountPercent(
  originalPrice: number,
  newPrice: number
): number {
  if (originalPrice === 0) return 0;
  return ((originalPrice - newPrice) / originalPrice) * 100;
}

// ============================================
// VÉRIFICATIONS DE REMISE
// ============================================

/**
 * Vérifie si une remise est autorisée selon les règles de marge
 */
export function isDiscountAllowed(
  purchasePrice: number,
  sellingPrice: number,
  proposedDiscountPercent: number,
  minMarginPercent: number,
  allowNegativeMargin: boolean = false,
  maxNegativeMarginPercent: number = 0
): DiscountValidation {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const priceAfterDiscount = calculatePriceAfterDiscount(
    sellingPrice,
    proposedDiscountPercent
  );
  const resultingMargin = calculateMarginPercent(
    purchasePrice,
    priceAfterDiscount
  );

  // Cas 1: Marge positive suffisante
  if (resultingMargin >= minMarginPercent) {
    // Alerter si proche du minimum
    if (resultingMargin < minMarginPercent + 2) {
      warnings.push(
        `Attention: marge proche du minimum (${resultingMargin.toFixed(1)}%)`
      );
    }
    return {
      allowed: true,
      resultingMargin,
      resultingPrice: priceAfterDiscount,
      warnings,
    };
  }

  // Cas 2: Marge positive mais insuffisante
  if (resultingMargin > 0) {
    const maxDiscount = calculateMaxDiscount(
      purchasePrice,
      sellingPrice,
      minMarginPercent
    );
    suggestions.push(
      `Remise maximum possible: ${maxDiscount.percent.toFixed(1)}% pour maintenir ${minMarginPercent}% de marge`
    );

    return {
      allowed: false,
      reason: `Marge résultante (${resultingMargin.toFixed(1)}%) inférieure au minimum requis (${minMarginPercent}%)`,
      resultingMargin,
      resultingPrice: priceAfterDiscount,
      warnings: [
        `Cette remise réduirait la marge de ${(calculateMarginPercent(purchasePrice, sellingPrice) - resultingMargin).toFixed(1)} points`,
      ],
      suggestions,
    };
  }

  // Cas 3: Marge négative (perte)
  if (!allowNegativeMargin) {
    return {
      allowed: false,
      reason: `Remise impossible: résulterait en une perte (marge: ${resultingMargin.toFixed(1)}%)`,
      resultingMargin,
      resultingPrice: priceAfterDiscount,
      warnings: ["Cette remise ferait vendre à perte"],
      suggestions: [
        "Proposer une alternative: fidélité, bundle, volume",
        "Vérifier si le produit est en surstock",
      ],
    };
  }

  // Cas 4: Marge négative acceptée pour déstockage
  if (resultingMargin < maxNegativeMarginPercent) {
    return {
      allowed: false,
      reason: `Perte trop importante (${Math.abs(resultingMargin).toFixed(1)}% > max autorisé ${Math.abs(maxNegativeMarginPercent)}%)`,
      resultingMargin,
      resultingPrice: priceAfterDiscount,
      warnings: ["Perte supérieure au maximum autorisé pour déstockage"],
      suggestions: [
        `Réduire la remise pour limiter la perte à ${Math.abs(maxNegativeMarginPercent)}%`,
      ],
    };
  }

  return {
    allowed: true,
    reason: `Vente à perte acceptée pour déstockage (perte: ${Math.abs(resultingMargin).toFixed(1)}%)`,
    resultingMargin,
    resultingPrice: priceAfterDiscount,
    warnings: [
      `Attention: vente à perte de ${Math.abs(resultingMargin).toFixed(1)}%`,
      "Justification requise: déstockage/péremption",
    ],
  };
}

/**
 * Simule une remise et retourne tous les détails
 */
export function simulateDiscount(
  product: ProductPricing,
  discountPercent: number,
  categoryRules: CategoryMarginRules,
  clientPrice?: number
): DiscountSimulation {
  const basePrice = clientPrice || product.baseSellingPrice;

  const validation = isDiscountAllowed(
    product.purchasePriceWithFees,
    basePrice,
    discountPercent,
    categoryRules.minMarginPercent,
    categoryRules.allowNegativeMarginForOverstock && product.isOverstock,
    categoryRules.maxNegativeMarginPercent
  );

  const maxDiscount = calculateMaxDiscount(
    product.purchasePriceWithFees,
    basePrice,
    categoryRules.minMarginPercent
  );

  return {
    productId: product.productId,
    productName: product.productName,
    originalPrice: basePrice,
    originalMarginPercent: calculateMarginPercent(
      product.purchasePriceWithFees,
      basePrice
    ),
    originalMarginAmount: calculateMarginAmount(
      product.purchasePriceWithFees,
      basePrice
    ),
    discountPercent,
    discountAmount: basePrice * (discountPercent / 100),
    newPrice: validation.resultingPrice,
    newMarginPercent: validation.resultingMargin,
    newMarginAmount: calculateMarginAmount(
      product.purchasePriceWithFees,
      validation.resultingPrice
    ),
    isAllowed: validation.allowed,
    reason: validation.reason,
    maxAllowedDiscount: maxDiscount.percent,
    warnings: validation.warnings,
  };
}

// ============================================
// CONTEXTE PRICING COMPLET
// ============================================

/**
 * Calcule le contexte pricing complet pour un produit et un client
 */
export function buildPricingContext(
  product: ProductPricing,
  client: ClientPricing,
  categoryRules: CategoryMarginRules,
  supplierConditions?: SupplierConditions
): PricingContext {
  // Calculer la remise client totale
  const specificDiscount =
    client.specificDiscounts.find(
      (d) =>
        (d.type === "product" && d.targetId === product.productId) ||
        (d.type === "category" && d.targetId === product.categoryId)
    )?.discountPercent || 0;

  const totalClientDiscount = client.globalDiscountPercent + specificDiscount;

  // Calculer le prix client
  const clientPrice = calculatePriceAfterDiscount(
    product.baseSellingPrice,
    totalClientDiscount
  );

  // Calculer les marges
  const clientMarginPercent = calculateMarginPercent(
    product.purchasePriceWithFees,
    clientPrice
  );
  const clientMarginAmount = calculateMarginAmount(
    product.purchasePriceWithFees,
    clientPrice
  );

  // Calculer la marge de manoeuvre
  const maxDiscount = calculateMaxDiscount(
    product.purchasePriceWithFees,
    clientPrice,
    categoryRules.minMarginPercent
  );

  // Calculer le prix plancher
  const priceFloor = calculateMinSellingPrice(
    product.purchasePriceWithFees,
    categoryRules.minMarginPercent
  );

  return {
    product,
    client,
    categoryRules,
    supplierConditions,
    calculations: {
      clientPrice,
      clientMarginPercent,
      clientMarginAmount,
      roomForDiscount: maxDiscount.percent,
      roomForDiscountAmount: maxDiscount.amount,
      canOfferPromo: clientMarginPercent > categoryRules.minMarginPercent,
      maxAdditionalDiscount: maxDiscount.percent,
      priceFloor,
    },
  };
}

// ============================================
// SUGGESTIONS INTELLIGENTES
// ============================================

/**
 * Génère des suggestions de remise selon le contexte
 */
export function generateDiscountSuggestions(
  contexts: PricingContext[],
  reason:
    | "retention"
    | "upsell"
    | "new_client"
    | "volume"
    | "overstock"
    | "competitive"
): DiscountSuggestion[] {
  const suggestions: DiscountSuggestion[] = [];

  for (const ctx of contexts) {
    // Pas de marge de manoeuvre
    if (!ctx.calculations.canOfferPromo) {
      suggestions.push({
        type: "product",
        targetId: ctx.product.productId,
        targetName: ctx.product.productName,
        suggestedDiscount: 0,
        maxPossibleDiscount: 0,
        reason: `Marge déjà au minimum (${ctx.calculations.clientMarginPercent.toFixed(1)}%)`,
        impact: {
          revenueChange: 0,
          marginChange: 0,
          newMarginPercent: ctx.calculations.clientMarginPercent,
          newPrice: ctx.calculations.clientPrice,
        },
        confidence: "high",
        restrictions: ["Aucune remise possible sur ce produit"],
        alternativeSuggestions: [
          "Proposer des points fidélité supplémentaires",
          "Offrir un produit complémentaire",
          "Proposer une remise sur un autre produit",
        ],
      });
      continue;
    }

    // Calculer remise suggérée selon le contexte
    let suggestedDiscount = 0;
    let suggestionReason = "";
    let confidence: "high" | "medium" | "low" = "medium";

    switch (reason) {
      case "retention":
        // Client à risque: proposer 50% de la marge de manoeuvre, max 10%
        suggestedDiscount = Math.min(
          ctx.calculations.maxAdditionalDiscount * 0.5,
          10
        );
        suggestionReason = "Remise fidélité pour client à risque de départ";
        confidence = suggestedDiscount >= 5 ? "high" : "medium";
        break;

      case "volume":
        // Remise volume: jusqu'à 70% de la marge de manoeuvre, max 15%
        suggestedDiscount = Math.min(
          ctx.calculations.maxAdditionalDiscount * 0.7,
          15
        );
        suggestionReason = "Remise volume pour commande importante";
        confidence = "high";
        break;

      case "overstock":
        // Surstock: on peut aller jusqu'au max si produit en surstock
        if (ctx.product.isOverstock) {
          suggestedDiscount = ctx.calculations.maxAdditionalDiscount;
          suggestionReason = "Déstockage urgent - remise maximale autorisée";
          confidence = "high";
        } else {
          suggestedDiscount = Math.min(
            ctx.calculations.maxAdditionalDiscount * 0.5,
            8
          );
          suggestionReason = "Stock normal - remise modérée";
          confidence = "low";
        }
        break;

      case "new_client":
        // Nouveau client: remise attractive mais prudente, max 12%
        suggestedDiscount = Math.min(
          ctx.calculations.maxAdditionalDiscount * 0.6,
          12
        );
        suggestionReason = "Offre de bienvenue pour nouveau client";
        confidence = "medium";
        break;

      case "competitive":
        // Alignement concurrence
        if (ctx.marketContext?.competitorPrice) {
          const neededDiscount =
            ((ctx.calculations.clientPrice - ctx.marketContext.competitorPrice) /
              ctx.calculations.clientPrice) *
            100;

          if (neededDiscount <= ctx.calculations.maxAdditionalDiscount) {
            suggestedDiscount = neededDiscount;
            suggestionReason = `Alignement sur prix concurrent (${ctx.marketContext.competitorPrice.toFixed(2)}€)`;
            confidence = "high";
          } else {
            suggestedDiscount = ctx.calculations.maxAdditionalDiscount;
            suggestionReason = `Alignement partiel - impossible d'atteindre le prix concurrent sans perte`;
            confidence = "low";
          }
        }
        break;

      case "upsell":
        // Upsell: petite remise pour inciter, max 8%
        suggestedDiscount = Math.min(
          ctx.calculations.maxAdditionalDiscount * 0.4,
          8
        );
        suggestionReason = "Remise incitative pour augmenter le panier";
        confidence = "medium";
        break;
    }

    // Calculer l'impact
    const newPrice = calculatePriceAfterDiscount(
      ctx.calculations.clientPrice,
      suggestedDiscount
    );
    const newMargin = calculateMarginPercent(
      ctx.product.purchasePriceWithFees,
      newPrice
    );

    suggestions.push({
      type: "product",
      targetId: ctx.product.productId,
      targetName: ctx.product.productName,
      suggestedDiscount: Math.round(suggestedDiscount * 100) / 100,
      maxPossibleDiscount: ctx.calculations.maxAdditionalDiscount,
      reason: suggestionReason,
      impact: {
        revenueChange: -(ctx.calculations.clientPrice * suggestedDiscount) / 100,
        marginChange: ctx.calculations.clientMarginPercent - newMargin,
        newMarginPercent: newMargin,
        newPrice,
      },
      confidence,
      restrictions:
        suggestedDiscount < ctx.calculations.maxAdditionalDiscount
          ? [`Marge de manoeuvre supplémentaire: ${(ctx.calculations.maxAdditionalDiscount - suggestedDiscount).toFixed(1)}%`]
          : undefined,
    });
  }

  return suggestions;
}

// ============================================
// ALERTES MARGE
// ============================================

/**
 * Vérifie les marges d'un produit et génère des alertes si nécessaire
 */
export function checkMarginAlerts(
  product: ProductPricing,
  categoryRules: CategoryMarginRules
): MarginAlert | null {
  const currentMargin = product.currentMarginPercent;

  // Marge négative
  if (currentMargin < 0) {
    return {
      id: `alert_neg_${product.productId}_${Date.now()}`,
      type: "negative",
      severity: "critical",
      productId: product.productId,
      productName: product.productName,
      currentMargin,
      thresholdMargin: 0,
      message: `PERTE: Le produit ${product.productName} est vendu à perte (marge: ${currentMargin.toFixed(1)}%)`,
      suggestedAction: "Augmenter le prix de vente ou revoir le prix d'achat fournisseur",
      detectedAt: new Date(),
    };
  }

  // Marge sous le minimum
  if (currentMargin < categoryRules.minMarginPercent) {
    return {
      id: `alert_min_${product.productId}_${Date.now()}`,
      type: "below_minimum",
      severity: "critical",
      productId: product.productId,
      productName: product.productName,
      currentMargin,
      thresholdMargin: categoryRules.minMarginPercent,
      message: `Marge insuffisante sur ${product.productName}: ${currentMargin.toFixed(1)}% < minimum ${categoryRules.minMarginPercent}%`,
      suggestedAction: `Augmenter le prix ou supprimer les remises pour atteindre ${categoryRules.minMarginPercent}% minimum`,
      detectedAt: new Date(),
    };
  }

  // Marge sous la cible (alerte)
  if (
    categoryRules.alertBelowMargin &&
    currentMargin < categoryRules.alertBelowMargin
  ) {
    return {
      id: `alert_below_${product.productId}_${Date.now()}`,
      type: "below_target",
      severity: "warning",
      productId: product.productId,
      productName: product.productName,
      currentMargin,
      thresholdMargin: categoryRules.alertBelowMargin,
      message: `Marge faible sur ${product.productName}: ${currentMargin.toFixed(1)}% (seuil d'alerte: ${categoryRules.alertBelowMargin}%)`,
      suggestedAction: "Surveiller ce produit et envisager une révision tarifaire",
      detectedAt: new Date(),
    };
  }

  return null;
}

/**
 * Analyse les marges de tous les produits et retourne les alertes
 */
export function analyzeAllMargins(
  products: ProductPricing[],
  marginRules: CategoryMarginRules[] = DEFAULT_MARGIN_RULES
): MarginAlert[] {
  const alerts: MarginAlert[] = [];

  for (const product of products) {
    const categoryRules = marginRules.find(
      (r) => r.categoryId === product.categoryId
    );

    if (categoryRules) {
      const alert = checkMarginAlerts(product, categoryRules);
      if (alert) {
        alerts.push(alert);
      }
    }
  }

  // Trier par sévérité
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================
// DONNÉES MOCK
// ============================================

// Mock products pour démonstration
const MOCK_PRODUCTS: ProductPricing[] = [
  {
    productId: "prod_1",
    productName: "Cheddar 1kg",
    category: "Fromages",
    categoryId: "fromages",
    purchasePrice: 8.5,
    purchasePriceWithFees: 8.75,
    lastPurchaseDate: new Date(),
    supplierId: "sup_1",
    supplierName: "Fromagerie du Nord",
    baseSellingPrice: 10.0,
    currentMarginPercent: 12.5,
    currentMarginAmount: 1.25,
    minMarginPercent: 8,
    maxDiscountPercent: 4.5,
    maxDiscountAmount: 0.45,
    stockQuantity: 150,
    stockValue: 1312.5,
    isOverstock: false,
  },
  {
    productId: "prod_2",
    productName: "Huile de friture 10L",
    category: "Huiles & Graisses",
    categoryId: "huiles",
    purchasePrice: 18.0,
    purchasePriceWithFees: 18.5,
    lastPurchaseDate: new Date(),
    supplierId: "sup_2",
    supplierName: "Huiles du Sud",
    baseSellingPrice: 22.0,
    currentMarginPercent: 15.9,
    currentMarginAmount: 3.5,
    minMarginPercent: 5,
    maxDiscountPercent: 10.9,
    maxDiscountAmount: 2.4,
    stockQuantity: 80,
    stockValue: 1480,
    isOverstock: false,
  },
  {
    productId: "prod_3",
    productName: "Frites surgelées 10kg",
    category: "Surgelés",
    categoryId: "surgeles",
    purchasePrice: 12.0,
    purchasePriceWithFees: 12.5,
    lastPurchaseDate: new Date(),
    supplierId: "sup_3",
    supplierName: "Surgelés Express",
    baseSellingPrice: 15.0,
    currentMarginPercent: 16.7,
    currentMarginAmount: 2.5,
    minMarginPercent: 10,
    maxDiscountPercent: 6.7,
    maxDiscountAmount: 1.0,
    stockQuantity: 300,
    stockValue: 3750,
    isOverstock: true,
    overstockThreshold: 200,
  },
  {
    productId: "prod_4",
    productName: "Viande kebab 5kg",
    category: "Viandes & Charcuterie",
    categoryId: "viandes",
    purchasePrice: 38.0,
    purchasePriceWithFees: 39.5,
    lastPurchaseDate: new Date(),
    supplierId: "sup_4",
    supplierName: "Viandes Premium",
    baseSellingPrice: 45.0,
    currentMarginPercent: 12.2,
    currentMarginAmount: 5.5,
    minMarginPercent: 8,
    maxDiscountPercent: 4.2,
    maxDiscountAmount: 1.9,
    stockQuantity: 45,
    stockValue: 1777.5,
    isOverstock: false,
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    daysUntilExpiration: 7,
  },
  {
    productId: "prod_5",
    productName: "Sauce blanche 5L",
    category: "Sauces & Condiments",
    categoryId: "sauces",
    purchasePrice: 15.0,
    purchasePriceWithFees: 15.5,
    lastPurchaseDate: new Date(),
    supplierId: "sup_5",
    supplierName: "Sauces Gourmet",
    baseSellingPrice: 22.0,
    currentMarginPercent: 29.5,
    currentMarginAmount: 6.5,
    minMarginPercent: 15,
    maxDiscountPercent: 14.5,
    maxDiscountAmount: 3.2,
    stockQuantity: 60,
    stockValue: 930,
    isOverstock: false,
  },
  {
    productId: "prod_6",
    productName: "Pain pita (50)",
    category: "Pains & Viennoiseries",
    categoryId: "pain",
    purchasePrice: 8.0,
    purchasePriceWithFees: 8.3,
    lastPurchaseDate: new Date(),
    supplierId: "sup_6",
    supplierName: "Boulangerie Pro",
    baseSellingPrice: 12.0,
    currentMarginPercent: 30.8,
    currentMarginAmount: 3.7,
    minMarginPercent: 20,
    maxDiscountPercent: 10.8,
    maxDiscountAmount: 1.3,
    stockQuantity: 100,
    stockValue: 830,
    isOverstock: false,
    expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    daysUntilExpiration: 3,
  },
];

// Mock clients
const MOCK_CLIENTS: ClientPricing[] = [
  {
    clientId: "client_1",
    clientName: "Kebab du Coin",
    priceGridId: "standard",
    priceGridName: "Standard",
    globalDiscountPercent: 0,
    specificDiscounts: [],
    paymentTermsDays: 30,
    creditLimit: 5000,
    currentOutstanding: 1200,
    totalPurchases: 45000,
    averageOrderValue: 450,
    lastOrderDate: new Date(),
    clientSince: new Date("2023-06-15"),
    paymentBehavior: "good",
    churnRisk: "low",
  },
  {
    clientId: "client_2",
    clientName: "Pizza Express",
    priceGridId: "premium",
    priceGridName: "Premium",
    globalDiscountPercent: 5,
    specificDiscounts: [
      {
        type: "category",
        targetId: "fromages",
        targetName: "Fromages",
        discountPercent: 3,
        reason: "Volume important",
      },
    ],
    paymentTermsDays: 45,
    creditLimit: 10000,
    currentOutstanding: 3500,
    totalPurchases: 125000,
    averageOrderValue: 850,
    lastOrderDate: new Date(),
    clientSince: new Date("2022-03-10"),
    paymentBehavior: "excellent",
    churnRisk: "low",
  },
  {
    clientId: "client_3",
    clientName: "Burger House",
    priceGridId: "gold",
    priceGridName: "Gold",
    globalDiscountPercent: 10,
    specificDiscounts: [
      {
        type: "product",
        targetId: "prod_3",
        targetName: "Frites surgelées 10kg",
        discountPercent: 5,
        reason: "Gros volume hebdo",
      },
    ],
    paymentTermsDays: 60,
    creditLimit: 20000,
    currentOutstanding: 8500,
    totalPurchases: 280000,
    averageOrderValue: 1200,
    lastOrderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    clientSince: new Date("2021-01-20"),
    paymentBehavior: "good",
    churnRisk: "medium",
  },
];

// ============================================
// FONCTIONS D'ACCÈS AUX DONNÉES
// ============================================

export async function getProductPricing(
  productId: string
): Promise<ProductPricing | null> {
  // Mock: retourner le produit correspondant
  return MOCK_PRODUCTS.find((p) => p.productId === productId) || null;
}

export async function getAllProducts(): Promise<ProductPricing[]> {
  return MOCK_PRODUCTS;
}

export async function getClientPricing(
  clientId: string
): Promise<ClientPricing | null> {
  return MOCK_CLIENTS.find((c) => c.clientId === clientId) || null;
}

export async function getAllClients(): Promise<ClientPricing[]> {
  return MOCK_CLIENTS;
}

export async function getCategoryRules(
  categoryId: string
): Promise<CategoryMarginRules | null> {
  return DEFAULT_MARGIN_RULES.find((r) => r.categoryId === categoryId) || null;
}

export async function getAllCategoryRules(): Promise<CategoryMarginRules[]> {
  return DEFAULT_MARGIN_RULES;
}

export async function getPriceGrids(): Promise<PriceGrid[]> {
  return DEFAULT_PRICE_GRIDS;
}

export async function getFullPricingContext(
  productId: string,
  clientId: string
): Promise<PricingContext | null> {
  const product = await getProductPricing(productId);
  const client = await getClientPricing(clientId);

  if (!product || !client) return null;

  const categoryRules = await getCategoryRules(product.categoryId);
  if (!categoryRules) return null;

  return buildPricingContext(product, client, categoryRules);
}

/**
 * Récupère le contexte pricing pour plusieurs produits
 */
export async function getMultiplePricingContexts(
  productIds: string[],
  clientId: string
): Promise<PricingContext[]> {
  const contexts: PricingContext[] = [];

  for (const productId of productIds) {
    const ctx = await getFullPricingContext(productId, clientId);
    if (ctx) contexts.push(ctx);
  }

  return contexts;
}
