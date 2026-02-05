/**
 * Types pour l'historique des scans menu
 */

export interface ScanHistoryItem {
  id: string;
  // Info scan
  dateCreation: Date;
  tempsAnalyse: number; // secondes

  // Image
  imageUrl?: string; // URL Firebase Storage
  imageThumbnailUrl?: string;

  // Restaurant détecté
  restaurant: {
    type: string; // kebab, burger, tacos, pizza, snack
    specialite?: string;
  };

  // Résultats
  platsDetectes: {
    nom: string;
    categorie: string;
    confiance: number;
    ventesEstimees: number;
  }[];

  // Totaux
  nbProduits: number;
  nbEmballages: number;
  totalHT: number;
  totalTTC: number;
  margeEstimee: number;

  // Client (si renseigné)
  client?: {
    nom: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  };

  // Conversion
  devisGenere: boolean;
  devisId?: string;
  devisNumero?: string;
  commandeConvertie: boolean;
  commandeId?: string;

  // Metadata
  commercialId: string;
  commercialNom: string;
  depot: string;
  source: 'mobile' | 'desktop';
  notes?: string;
}

export interface ScanHistoryStats {
  totalScans: number;
  scansAujourdhui: number;
  scansCetteSemaine: number;
  scansCeMois: number;
  tauxConversion: number; // % de scans convertis en devis
  tauxCommande: number; // % de devis convertis en commande
  typesRestaurants: {
    type: string;
    count: number;
    pourcentage: number;
  }[];
  totalCAGenere: number;
  topProduits: {
    nom: string;
    ref: string;
    count: number;
  }[];
}

export interface ScanHistoryFilters {
  dateDebut?: Date;
  dateFin?: Date;
  type?: string;
  depot?: string;
  commercialId?: string;
  devisGenere?: boolean;
  searchQuery?: string;
}
