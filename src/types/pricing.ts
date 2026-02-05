/**
 * Types pour la gestion intelligente des prix et marges
 * Garantit que l'IA ne propose jamais de remises en dessous des marges minimales
 */

// ===== PRODUIT AVEC COÛTS =====
export interface ProductPricing {
  productId: string;
  productName: string;
  category: string;
  categoryId: string;
  sku?: string;

  // Prix d'achat
  purchasePrice: number; // Prix d'achat HT fournisseur
  purchasePriceWithFees: number; // + frais (transport, stockage estimé)
  lastPurchaseDate: Date;
  supplierId: string;
  supplierName?: string;

  // Prix de vente
  baseSellingPrice: number; // Prix catalogue HT

  // Marges calculées
  currentMarginPercent: number; // Marge actuelle en %
  currentMarginAmount: number; // Marge actuelle en euros

  // Règles
  minMarginPercent: number; // Marge minimum autorisée (par catégorie)
  maxDiscountPercent: number; // Remise max calculée automatiquement
  maxDiscountAmount: number; // En euros

  // Contexte stock
  stockQuantity: number;
  stockValue: number; // Valeur du stock au prix d'achat
  isOverstock: boolean; // Surstock = plus flexible sur la marge
  overstockThreshold?: number; // Seuil de surstock
  expirationDate?: Date; // Produit périssable
  daysUntilExpiration?: number;

  // Métadonnées
  lastPriceUpdate?: Date;
  priceHistory?: PriceHistoryEntry[];
}

// ===== HISTORIQUE DES PRIX =====
export interface PriceHistoryEntry {
  date: Date;
  purchasePrice: number;
  sellingPrice: number;
  marginPercent: number;
  reason?: string;
  updatedBy?: string;
}

// ===== RÈGLES DE MARGE PAR CATÉGORIE =====
export interface CategoryMarginRules {
  categoryId: string;
  categoryName: string;
  minMarginPercent: number; // Marge minimum
  targetMarginPercent: number; // Marge cible
  maxMarginPercent: number; // Marge max (éviter prix abusifs)

  // Exceptions pour déstockage
  allowNegativeMarginForOverstock: boolean; // Accepter perte pour déstocker
  maxNegativeMarginPercent?: number; // Limite de la perte acceptée

  // Seuils d'alerte
  alertBelowMargin?: number; // Alerter si marge descend en dessous

  // Métadonnées
  updatedAt?: Date;
  updatedBy?: string;
}

// Règles par défaut
export const DEFAULT_MARGIN_RULES: CategoryMarginRules[] = [
  {
    categoryId: "huiles",
    categoryName: "Huiles & Graisses",
    minMarginPercent: 5,
    targetMarginPercent: 12,
    maxMarginPercent: 25,
    allowNegativeMarginForOverstock: false,
    alertBelowMargin: 7,
  },
  {
    categoryId: "fromages",
    categoryName: "Fromages",
    minMarginPercent: 8,
    targetMarginPercent: 15,
    maxMarginPercent: 30,
    allowNegativeMarginForOverstock: true,
    maxNegativeMarginPercent: -5,
    alertBelowMargin: 10,
  },
  {
    categoryId: "surgeles",
    categoryName: "Surgelés",
    minMarginPercent: 10,
    targetMarginPercent: 18,
    maxMarginPercent: 35,
    allowNegativeMarginForOverstock: true,
    maxNegativeMarginPercent: -10,
    alertBelowMargin: 12,
  },
  {
    categoryId: "boissons",
    categoryName: "Boissons",
    minMarginPercent: 12,
    targetMarginPercent: 20,
    maxMarginPercent: 40,
    allowNegativeMarginForOverstock: false,
    alertBelowMargin: 15,
  },
  {
    categoryId: "sauces",
    categoryName: "Sauces & Condiments",
    minMarginPercent: 15,
    targetMarginPercent: 25,
    maxMarginPercent: 45,
    allowNegativeMarginForOverstock: false,
    alertBelowMargin: 18,
  },
  {
    categoryId: "viandes",
    categoryName: "Viandes & Charcuterie",
    minMarginPercent: 8,
    targetMarginPercent: 15,
    maxMarginPercent: 28,
    allowNegativeMarginForOverstock: true,
    maxNegativeMarginPercent: -8,
    alertBelowMargin: 10,
  },
  {
    categoryId: "pain",
    categoryName: "Pains & Viennoiseries",
    minMarginPercent: 20,
    targetMarginPercent: 30,
    maxMarginPercent: 50,
    allowNegativeMarginForOverstock: true,
    maxNegativeMarginPercent: -5,
    alertBelowMargin: 22,
  },
  {
    categoryId: "legumes",
    categoryName: "Fruits & Légumes",
    minMarginPercent: 15,
    targetMarginPercent: 25,
    maxMarginPercent: 40,
    allowNegativeMarginForOverstock: true,
    maxNegativeMarginPercent: -15,
    alertBelowMargin: 18,
  },
  {
    categoryId: "emballages",
    categoryName: "Emballages & Consommables",
    minMarginPercent: 18,
    targetMarginPercent: 28,
    maxMarginPercent: 45,
    allowNegativeMarginForOverstock: false,
    alertBelowMargin: 20,
  },
];

// ===== CONDITIONS FOURNISSEUR =====
export interface SupplierConditions {
  supplierId: string;
  supplierName: string;

  // Remises volume fournisseur (répercutables)
  volumeDiscounts: VolumeDiscount[];

  // Conditions de paiement
  paymentTermsDays: number; // Jours
  earlyPaymentDiscount?: number; // Escompte si paiement anticipé

  // Livraison
  freeShippingThreshold?: number;
  shippingCostPerUnit?: number;
  minOrderAmount?: number;

  // Contact
  contactEmail?: string;
  contactPhone?: string;
}

export interface VolumeDiscount {
  minQuantity: number;
  maxQuantity?: number;
  discountPercent: number;
}

// ===== GRILLE TARIFAIRE CLIENT =====
export interface ClientPricing {
  clientId: string;
  clientName: string;
  priceGridId: string;
  priceGridName: string; // "Standard", "Premium", "Gold"
  globalDiscountPercent: number; // Remise globale du client

  // Remises spécifiques par produit/catégorie
  specificDiscounts: SpecificDiscount[];

  // Conditions commerciales
  paymentTermsDays: number;
  creditLimit: number;
  currentOutstanding: number; // Encours actuel

  // Historique
  totalPurchases: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
  clientSince?: Date;

  // Scoring
  paymentBehavior: "excellent" | "good" | "average" | "poor";
  churnRisk: "low" | "medium" | "high";
}

export interface SpecificDiscount {
  type: "product" | "category";
  targetId: string;
  targetName: string;
  discountPercent: number;
  validFrom?: Date;
  validUntil?: Date;
  reason?: string;
}

// ===== GRILLES DE PRIX =====
export interface PriceGrid {
  id: string;
  name: string;
  description: string;
  baseDiscountPercent: number;
  isDefault: boolean;

  // Conditions d'éligibilité
  minMonthlyVolume?: number;
  minClientAge?: number; // En mois

  // Avantages
  benefits: string[];
}

export const DEFAULT_PRICE_GRIDS: PriceGrid[] = [
  {
    id: "standard",
    name: "Standard",
    description: "Grille tarifaire par défaut",
    baseDiscountPercent: 0,
    isDefault: true,
    benefits: ["Prix catalogue", "Paiement 30 jours"],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Clients réguliers avec volume moyen",
    baseDiscountPercent: 5,
    isDefault: false,
    minMonthlyVolume: 2000,
    minClientAge: 6,
    benefits: ["5% sur tout le catalogue", "Paiement 45 jours", "Livraison prioritaire"],
  },
  {
    id: "gold",
    name: "Gold",
    description: "Gros clients fidèles",
    baseDiscountPercent: 10,
    isDefault: false,
    minMonthlyVolume: 5000,
    minClientAge: 12,
    benefits: ["10% sur tout le catalogue", "Paiement 60 jours", "Commercial dédié", "Offres exclusives"],
  },
  {
    id: "vip",
    name: "VIP",
    description: "Partenaires stratégiques",
    baseDiscountPercent: 15,
    isDefault: false,
    minMonthlyVolume: 10000,
    minClientAge: 24,
    benefits: ["15% sur tout le catalogue", "Paiement 90 jours", "Accès avant-première", "Conditions négociées"],
  },
];

// ===== CONTEXTE POUR L'IA =====
export interface PricingContext {
  product: ProductPricing;
  client: ClientPricing;
  categoryRules: CategoryMarginRules;
  supplierConditions?: SupplierConditions;

  // Calculs pré-faits pour l'IA
  calculations: PricingCalculations;

  // Contexte marché
  marketContext?: MarketContext;
}

export interface PricingCalculations {
  clientPrice: number; // Prix après remise client
  clientMarginPercent: number; // Marge sur ce client
  clientMarginAmount: number; // En euros
  roomForDiscount: number; // Marge de manoeuvre en %
  roomForDiscountAmount: number; // En euros
  canOfferPromo: boolean; // true si marge > min
  maxAdditionalDiscount: number; // Remise supplémentaire possible
  priceFloor: number; // Prix plancher (marge min)
}

export interface MarketContext {
  competitorPrice?: number;
  marketAveragePrice?: number;
  pricePositioning: "below" | "average" | "above";
  demandLevel?: "low" | "normal" | "high";
  seasonality?: "low" | "normal" | "high";
}

// ===== RÉSULTATS DE VÉRIFICATION =====
export interface DiscountValidation {
  allowed: boolean;
  reason?: string;
  resultingMargin: number;
  resultingPrice: number;
  warnings: string[];
  suggestions?: string[];
}

// ===== SUGGESTIONS DE REMISE =====
export interface DiscountSuggestion {
  type: "product" | "order" | "category" | "bundle";
  targetId?: string;
  targetName?: string;
  suggestedDiscount: number;
  maxPossibleDiscount: number;
  reason: string;
  impact: DiscountImpact;
  confidence: "high" | "medium" | "low";
  restrictions?: string[];
  alternativeSuggestions?: string[];
}

export interface DiscountImpact {
  revenueChange: number;
  marginChange: number;
  newMarginPercent: number;
  newPrice: number;
  estimatedVolumeIncrease?: string;
}

// ===== SUGGESTIONS PROMO INTELLIGENTES =====
export interface SmartPromoSuggestion {
  type: "discount" | "bundle" | "volume" | "loyalty" | "alternative" | "freebie";
  title: string;
  description: string;
  details: PromoDetails;
  financialImpact: FinancialImpact;
  confidence: "high" | "medium" | "low";
  warnings: string[];
  expiresAt?: Date;
}

export interface PromoDetails {
  products?: PromoProduct[];
  conditions?: string[];
  validityDays?: number;
  minOrderValue?: number;
  targetQuantity?: number;
}

export interface PromoProduct {
  id: string;
  name: string;
  originalPrice: number;
  discountPercent: number;
  newPrice: number;
  marginAfter: number;
}

export interface FinancialImpact {
  estimatedRevenueLoss: number;
  estimatedVolumeGain: string;
  marginAfter: number;
  isRentable: boolean;
  rentabilityExplanation: string;
  breakEvenVolume?: string;
}

// ===== REQUÊTE IA =====
export interface AIPromoRequest {
  clientId: string;
  clientName: string;
  situation:
    | "inactive_client"
    | "churn_risk"
    | "upsell"
    | "new_client"
    | "competitive_threat"
    | "overstock"
    | "seasonal"
    | "loyalty_reward"
    | "volume";
  productIds?: string[];
  categoryIds?: string[];
  targetOrderValue?: number;
  additionalContext?: string;
  maxBudget?: number; // Budget max pour la promo
}

// ===== ALERTES MARGE =====
export interface MarginAlert {
  id: string;
  type: "below_minimum" | "negative" | "below_target" | "abnormal_change";
  severity: "critical" | "warning" | "info";
  productId: string;
  productName: string;
  currentMargin: number;
  thresholdMargin: number;
  message: string;
  suggestedAction: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ===== RAPPORT DE MARGE =====
export interface MarginReport {
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    totalProducts: number;
    avgMargin: number;
    minMargin: number;
    maxMargin: number;
    productsBelowMinimum: number;
    productsAboveTarget: number;
  };
  byCategory: {
    categoryId: string;
    categoryName: string;
    avgMargin: number;
    productCount: number;
    alertCount: number;
  }[];
  alerts: MarginAlert[];
  recommendations: string[];
}

// ===== SIMULATION DE REMISE =====
export interface DiscountSimulation {
  productId: string;
  productName: string;
  clientId?: string;
  clientName?: string;

  // Prix avant
  originalPrice: number;
  originalMarginPercent: number;
  originalMarginAmount: number;

  // Remise testée
  discountPercent: number;
  discountAmount: number;

  // Prix après
  newPrice: number;
  newMarginPercent: number;
  newMarginAmount: number;

  // Validation
  isAllowed: boolean;
  reason?: string;
  maxAllowedDiscount: number;

  // Alertes
  warnings: string[];
}
