/**
 * Types pour l'intégration future avec SAGE 100
 * Ces interfaces définissent la structure des données échangées avec l'API SAGE
 */

// Article SAGE (produit du catalogue)
export interface SageArticle {
  AR_Ref: string;           // Référence article (ex: VIA001)
  AR_Design: string;        // Désignation complète
  AR_DesignCourt: string;   // Désignation courte
  AR_CodeBarre: string;     // Code EAN13
  FA_CodeFamille: string;   // Code famille (ex: VIA, PAI, EMB)
  AR_PrixVente: number;     // Prix de vente HT
  AR_PrixAchat: number;     // Prix d'achat HT
  AR_UnitePoids: number;    // Poids en kg
  AR_UniteVente: string;    // Unité de vente (carton, pièce, etc.)
  AR_Contenance: string;    // Contenance (ex: "50 pieces (5kg)")
  AR_TauxTVA: number;       // Taux TVA (5.5 ou 20)
  AR_StockMini: number;     // Stock minimum
  AR_StockActuel: number;   // Stock actuel
  AR_Actif: boolean;        // Article actif
  AR_DateModif: string;     // Date dernière modification
}

// Client SAGE
export interface SageClient {
  CT_Num: string;           // Numéro client
  CT_Intitule: string;      // Raison sociale
  CT_Contact: string;       // Contact principal
  CT_Email: string;         // Email
  CT_Telephone: string;     // Téléphone
  CT_Adresse: string;       // Adresse
  CT_CodePostal: string;    // Code postal
  CT_Ville: string;         // Ville
  CT_Pays: string;          // Pays
  CT_Siret: string;         // Numéro SIRET
  CT_NumTVA: string;        // Numéro TVA intracommunautaire
  CT_Actif: boolean;        // Client actif
}

// Ligne de document SAGE (devis/facture)
export interface SageLigneDocument {
  DL_Ligne: number;         // Numéro de ligne
  AR_Ref: string;           // Référence article
  DL_Design: string;        // Désignation
  DL_Qte: number;           // Quantité
  DL_PrixUnitaire: number;  // Prix unitaire HT
  DL_Remise: number;        // Remise en %
  DL_MontantHT: number;     // Montant HT
  DL_TauxTVA: number;       // Taux TVA
  DL_MontantTTC: number;    // Montant TTC
}

// Entête de document SAGE (devis)
export interface SageDevis {
  DO_Piece: string;         // Numéro de pièce
  DO_Type: 'DEVIS';         // Type de document
  DO_Date: string;          // Date du document
  CT_Num: string;           // Numéro client
  DO_Ref: string;           // Référence client/affaire
  DO_TotalHT: number;       // Total HT
  DO_TotalTVA: number;      // Total TVA
  DO_TotalTTC: number;      // Total TTC
  DO_Statut: 'BROUILLON' | 'EN_COURS' | 'ACCEPTE' | 'REFUSE';
  DO_DateValidite: string;  // Date de validité
  DO_Lignes: SageLigneDocument[];
}

// Entête de document SAGE (facture)
export interface SageFacture {
  DO_Piece: string;         // Numéro de pièce
  DO_Type: 'FACTURE';       // Type de document
  DO_Date: string;          // Date du document
  CT_Num: string;           // Numéro client
  DO_Ref: string;           // Référence
  DO_TotalHT: number;       // Total HT
  DO_TotalTVA: number;      // Total TVA
  DO_TotalTTC: number;      // Total TTC
  DO_Statut: 'A_PAYER' | 'PAYEE' | 'ANNULEE';
  DO_DateEcheance: string;  // Date d'échéance
  DO_Lignes: SageLigneDocument[];
}

// Réponse API SAGE générique
export interface SageApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Configuration connexion SAGE
export interface SageConfig {
  baseUrl: string;          // URL de l'API SAGE
  apiKey: string;           // Clé API
  companyId: string;        // ID de la société
  timeout: number;          // Timeout en ms
}

// Mapping produit local vers SAGE
export interface ProduitToSageMapping {
  refLocale: string;        // Référence dans notre catalogue
  refSage: string;          // Référence SAGE (AR_Ref)
  lastSync: string;         // Dernière synchronisation
  syncStatus: 'OK' | 'PENDING' | 'ERROR';
}

// Événement de synchronisation
export interface SageSyncEvent {
  id: string;
  type: 'ARTICLE' | 'CLIENT' | 'DEVIS' | 'FACTURE';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  refLocale: string;
  refSage?: string;
  timestamp: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}
