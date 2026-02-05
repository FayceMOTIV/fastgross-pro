export type DevisStatus =
  | 'brouillon'      // Vient d'être généré, modifiable
  | 'envoye'         // Envoyé au client
  | 'consulte'       // Client a ouvert le lien
  | 'accepte'        // Client a accepté
  | 'refuse'         // Client a refusé
  | 'negocie'        // Client demande des modifs
  | 'expire'         // Délai dépassé (30 jours)
  | 'converti';      // Converti en commande

export interface LigneDevis {
  id: string;
  ref: string;
  nom: string;
  categorie: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  remise: number; // en %
  totalHT: number;
  raison?: string;
  obligatoire: boolean;
}

export interface Devis {
  id: string;
  numero: string; // DEV-2026-00001

  // Dates
  dateCreation: Date;
  dateEnvoi?: Date;
  dateConsultation?: Date;
  dateReponse?: Date;
  dateExpiration: Date;

  // Status
  status: DevisStatus;

  // Client
  clientId?: string;
  clientNom: string;
  clientEmail?: string;
  clientTelephone?: string;
  clientAdresse?: string;
  clientType?: string; // burger, kebab, etc.

  // Commercial
  commercialId: string;
  commercialNom: string;
  commercialEmail: string;
  depot: string;

  // Contenu
  lignesProduits: LigneDevis[];
  lignesEmballages: LigneDevis[];

  // Totaux
  totalProduitsHT: number;
  totalEmballagesHT: number;
  remiseGlobale: number; // en %
  totalHT: number;
  tva: number;
  totalTTC: number;

  // Conditions
  conditionsPaiement: string;
  delaiLivraison: string;
  validite: number; // jours

  // Notes
  notesInternes?: string;
  messageClient?: string;

  // Source
  source: 'scan_menu' | 'manuel' | 'prospection';
  scanMenuImageUrl?: string;

  // Lien partage
  tokenPartage?: string;
  lienPartage?: string;

  // Conversion
  commandeId?: string;
}

export interface DevisHistorique {
  id: string;
  devisId: string;
  date: Date;
  action: string;
  details?: string;
  userId?: string;
  userNom?: string;
}

export interface ProduitRecommande {
  ref: string;
  nom: string;
  categorie: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  totalHT: number;
  raison: string;
  obligatoire: boolean;
}

export interface PlatAnalyse {
  nom: string;
  description?: string;
  categorie: 'burger' | 'kebab' | 'tacos' | 'pizza' | 'sandwich' | 'salade' | 'autre';
  ingredients: string[];
  prix?: number;
  ventesEstimees: number;
  confiance: number;
}

export interface AnalyseMenuResult {
  success: boolean;
  tempsAnalyse: number;
  restaurant: {
    nom?: string;
    type: string;
    specialite?: string;
  };
  platsDetectes: PlatAnalyse[];
  produitsRecommandes: ProduitRecommande[];
  emballagesRecommandes: ProduitRecommande[];
  totalProduitsHT: number;
  totalEmballagesHT: number;
  totalHT: number;
  totalTTC: number;
  margeEstimee: number;
  notes: string[];
  erreur?: string;
}
