/**
 * CATALOGUE DISTRAM - Version Mockee Realiste
 *
 * Base sur les prix reels du marche grossiste alimentaire 2024-2025
 * References format SAGE : CATXXX (ex: VIA001, PAI002, etc.)
 *
 * TODO: Remplacer par API SAGE en production
 */

export interface ProduitDistram {
  // Identifiants
  ref: string;           // Reference SAGE (ex: VIA001)
  ean: string;           // Code-barres EAN13

  // Descriptif
  nom: string;
  nomCourt: string;      // Pour les devis
  description: string;

  // Classification
  categorie: string;
  sousCategorie: string;
  famille: string;       // Code famille SAGE

  // Conditionnement
  unite: string;         // Unite de vente (carton, sachet, bidon...)
  contenance: string;    // Ex: "50 pieces", "10kg", "5L"
  poids: number;         // Poids en kg

  // Prix
  prixAchatHT: number;   // Prix d'achat DISTRAM
  prixVenteHT: number;   // Prix de vente client
  tva: number;           // Taux TVA (5.5 ou 20)

  // Stock (pour future connexion SAGE)
  stockMin: number;
  stockActuel?: number;

  // Matching IA
  tags: string[];

  // Metadonnees
  actif: boolean;
  dateMAJ: string;
}

export const CATALOGUE_DISTRAM: ProduitDistram[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // VIANDES - Broches Kebab
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'VIA001',
    ean: '3760001000011',
    nom: 'Broche Kebab Boeuf/Veau Halal 10kg',
    nomCourt: 'Broche Kebab B/V 10kg',
    description: 'Broche de kebab boeuf/veau halal, prete a cuire. Certifie AVS.',
    categorie: 'Viandes',
    sousCategorie: 'Kebab',
    famille: 'VIA-KEB',
    unite: 'piece',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 62.00,
    prixVenteHT: 78.50,
    tva: 5.5,
    stockMin: 20,
    tags: ['kebab', 'broche', 'boeuf', 'veau', 'halal', 'doner'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA002',
    ean: '3760001000028',
    nom: 'Broche Kebab Poulet Halal 10kg',
    nomCourt: 'Broche Kebab Poulet 10kg',
    description: 'Broche de kebab 100% poulet halal. Certifie AVS.',
    categorie: 'Viandes',
    sousCategorie: 'Kebab',
    famille: 'VIA-KEB',
    unite: 'piece',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 52.00,
    prixVenteHT: 68.00,
    tva: 5.5,
    stockMin: 20,
    tags: ['kebab', 'broche', 'poulet', 'halal', 'doner', 'chicken'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA003',
    ean: '3760001000035',
    nom: 'Broche Kebab Mixte (Boeuf/Poulet) 10kg',
    nomCourt: 'Broche Kebab Mixte 10kg',
    description: 'Broche de kebab mixte boeuf et poulet halal. Certifie AVS.',
    categorie: 'Viandes',
    sousCategorie: 'Kebab',
    famille: 'VIA-KEB',
    unite: 'piece',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 58.00,
    prixVenteHT: 74.00,
    tva: 5.5,
    stockMin: 15,
    tags: ['kebab', 'broche', 'mixte', 'halal', 'doner'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIANDES - Steaks Burger
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'VIA010',
    ean: '3760001000100',
    nom: 'Steak Hache Pur Boeuf 100g x50 Halal',
    nomCourt: 'Steak 100g x50',
    description: 'Steaks haches pur boeuf 100g, surgeles. 15% MG. Halal.',
    categorie: 'Viandes',
    sousCategorie: 'Burger',
    famille: 'VIA-BUR',
    unite: 'carton',
    contenance: '50 pieces (5kg)',
    poids: 5,
    prixAchatHT: 35.00,
    prixVenteHT: 45.90,
    tva: 5.5,
    stockMin: 50,
    tags: ['steak', 'burger', 'hache', 'boeuf', '100g', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA011',
    ean: '3760001000117',
    nom: 'Steak Hache Pur Boeuf 120g x40 Halal',
    nomCourt: 'Steak 120g x40',
    description: 'Steaks haches pur boeuf 120g, surgeles. 15% MG. Halal.',
    categorie: 'Viandes',
    sousCategorie: 'Burger',
    famille: 'VIA-BUR',
    unite: 'carton',
    contenance: '40 pieces (4.8kg)',
    poids: 4.8,
    prixAchatHT: 38.00,
    prixVenteHT: 49.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['steak', 'burger', 'hache', 'boeuf', '120g', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA012',
    ean: '3760001000124',
    nom: 'Steak Hache Pur Boeuf 150g x30 Halal',
    nomCourt: 'Steak 150g x30',
    description: 'Steaks haches pur boeuf 150g, surgeles. 15% MG. Halal. Format XL.',
    categorie: 'Viandes',
    sousCategorie: 'Burger',
    famille: 'VIA-BUR',
    unite: 'carton',
    contenance: '30 pieces (4.5kg)',
    poids: 4.5,
    prixAchatHT: 42.00,
    prixVenteHT: 54.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['steak', 'burger', 'hache', 'boeuf', '150g', 'xl', 'double', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIANDES - Poulet
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'VIA020',
    ean: '3760001000200',
    nom: 'Filet de Poulet Nature 2.5kg Halal',
    nomCourt: 'Filet Poulet 2.5kg',
    description: 'Filets de poulet nature surgeles. Halal certifie.',
    categorie: 'Viandes',
    sousCategorie: 'Poulet',
    famille: 'VIA-POU',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 18.50,
    prixVenteHT: 24.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['poulet', 'filet', 'nature', 'halal', 'grille'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA021',
    ean: '3760001000217',
    nom: 'Emince de Poulet Marine 2.5kg Halal',
    nomCourt: 'Emince Poulet 2.5kg',
    description: 'Eminces de poulet marines facon tex-mex. Halal.',
    categorie: 'Viandes',
    sousCategorie: 'Poulet',
    famille: 'VIA-POU',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 19.50,
    prixVenteHT: 26.50,
    tva: 5.5,
    stockMin: 30,
    tags: ['poulet', 'emince', 'marine', 'tacos', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA022',
    ean: '3760001000224',
    nom: 'Nuggets de Poulet x100 Halal',
    nomCourt: 'Nuggets x100',
    description: 'Nuggets de poulet panes, surgeles. Halal.',
    categorie: 'Viandes',
    sousCategorie: 'Poulet',
    famille: 'VIA-PAN',
    unite: 'carton',
    contenance: '100 pieces (2kg)',
    poids: 2,
    prixAchatHT: 15.00,
    prixVenteHT: 19.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['nuggets', 'poulet', 'pane', 'enfant', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA023',
    ean: '3760001000231',
    nom: 'Tenders Poulet Crispy x50 Halal',
    nomCourt: 'Tenders x50',
    description: 'Tenders de poulet panure crispy. Halal.',
    categorie: 'Viandes',
    sousCategorie: 'Poulet',
    famille: 'VIA-PAN',
    unite: 'carton',
    contenance: '50 pieces (1.5kg)',
    poids: 1.5,
    prixAchatHT: 16.00,
    prixVenteHT: 21.90,
    tva: 5.5,
    stockMin: 25,
    tags: ['tenders', 'poulet', 'crispy', 'pane', 'halal'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIANDES - Bacon & Charcuterie
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'VIA030',
    ean: '3760001000300',
    nom: 'Bacon de Dinde Fume Tranche 1kg Halal',
    nomCourt: 'Bacon Dinde 1kg',
    description: 'Bacon de dinde fume, tranche. Alternative halal au bacon porc.',
    categorie: 'Viandes',
    sousCategorie: 'Charcuterie',
    famille: 'VIA-CHA',
    unite: 'paquet',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 11.50,
    prixVenteHT: 15.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['bacon', 'dinde', 'fume', 'halal', 'burger'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'VIA031',
    ean: '3760001000317',
    nom: 'Bacon de Boeuf Fume Tranche 500g Halal',
    nomCourt: 'Bacon Boeuf 500g',
    description: 'Bacon de boeuf fume, tranche fin. Halal premium.',
    categorie: 'Viandes',
    sousCategorie: 'Charcuterie',
    famille: 'VIA-CHA',
    unite: 'paquet',
    contenance: '500g',
    poids: 0.5,
    prixAchatHT: 8.90,
    prixVenteHT: 12.50,
    tva: 5.5,
    stockMin: 25,
    tags: ['bacon', 'boeuf', 'fume', 'halal', 'burger', 'premium'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIANDES - Merguez & Saucisses
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'VIA040',
    ean: '3760001000400',
    nom: 'Merguez Boeuf/Mouton x50 Halal',
    nomCourt: 'Merguez x50',
    description: 'Merguez boeuf et mouton, epicees. Halal certifie.',
    categorie: 'Viandes',
    sousCategorie: 'Saucisses',
    famille: 'VIA-SAU',
    unite: 'carton',
    contenance: '50 pieces (2.5kg)',
    poids: 2.5,
    prixAchatHT: 28.00,
    prixVenteHT: 36.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['merguez', 'boeuf', 'mouton', 'epice', 'halal', 'grille'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAINS - Pita / Kebab
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'PAI001',
    ean: '3760001001001',
    nom: 'Pain Pita Blanc 16cm x100',
    nomCourt: 'Pita 16cm x100',
    description: 'Pains pita blancs 16cm pour kebab et garnitures.',
    categorie: 'Pains',
    sousCategorie: 'Pita',
    famille: 'PAI-PIT',
    unite: 'carton',
    contenance: '100 pieces',
    poids: 3.5,
    prixAchatHT: 14.00,
    prixVenteHT: 18.90,
    tva: 5.5,
    stockMin: 50,
    tags: ['pita', 'pain', 'kebab', 'grec', '16cm'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'PAI002',
    ean: '3760001001018',
    nom: 'Pain Pita Blanc 20cm x50',
    nomCourt: 'Pita 20cm x50',
    description: 'Pains pita blancs grand format 20cm.',
    categorie: 'Pains',
    sousCategorie: 'Pita',
    famille: 'PAI-PIT',
    unite: 'carton',
    contenance: '50 pieces',
    poids: 2.5,
    prixAchatHT: 12.00,
    prixVenteHT: 15.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['pita', 'pain', 'kebab', 'grec', '20cm', 'grand'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAINS - Tortillas / Tacos
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'PAI010',
    ean: '3760001001100',
    nom: 'Tortilla Ble 25cm x72 (French Tacos)',
    nomCourt: 'Tortilla 25cm x72',
    description: 'Tortillas de ble souples 25cm. Ideal French Tacos.',
    categorie: 'Pains',
    sousCategorie: 'Tortilla',
    famille: 'PAI-TOR',
    unite: 'carton',
    contenance: '72 pieces',
    poids: 2.8,
    prixAchatHT: 18.00,
    prixVenteHT: 24.50,
    tva: 5.5,
    stockMin: 50,
    tags: ['tortilla', 'tacos', 'french tacos', '25cm', 'wrap'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'PAI011',
    ean: '3760001001117',
    nom: 'Tortilla Ble 30cm x48 (XL)',
    nomCourt: 'Tortilla 30cm x48',
    description: 'Tortillas de ble grand format 30cm. Pour tacos XL.',
    categorie: 'Pains',
    sousCategorie: 'Tortilla',
    famille: 'PAI-TOR',
    unite: 'carton',
    contenance: '48 pieces',
    poids: 2.5,
    prixAchatHT: 16.50,
    prixVenteHT: 22.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['tortilla', 'tacos', 'french tacos', '30cm', 'xl', 'wrap'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAINS - Burger
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'PAI020',
    ean: '3760001001200',
    nom: 'Pain Burger Sesame Classic x48',
    nomCourt: 'Bun Sesame x48',
    description: 'Pains burger sesame classiques precuits.',
    categorie: 'Pains',
    sousCategorie: 'Burger',
    famille: 'PAI-BUR',
    unite: 'carton',
    contenance: '48 pieces',
    poids: 2.4,
    prixAchatHT: 9.50,
    prixVenteHT: 12.90,
    tva: 5.5,
    stockMin: 60,
    tags: ['pain', 'burger', 'bun', 'sesame', 'classique'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'PAI021',
    ean: '3760001001217',
    nom: 'Pain Burger Brioche Premium x36',
    nomCourt: 'Bun Brioche x36',
    description: 'Pains burger brioches qualite premium.',
    categorie: 'Pains',
    sousCategorie: 'Burger',
    famille: 'PAI-BUR',
    unite: 'carton',
    contenance: '36 pieces',
    poids: 2.2,
    prixAchatHT: 11.00,
    prixVenteHT: 14.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['pain', 'burger', 'bun', 'brioche', 'premium'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'PAI022',
    ean: '3760001001224',
    nom: 'Pain Burger XL Sesame x24',
    nomCourt: 'Bun XL x24',
    description: 'Pains burger grand format pour doubles.',
    categorie: 'Pains',
    sousCategorie: 'Burger',
    famille: 'PAI-BUR',
    unite: 'carton',
    contenance: '24 pieces',
    poids: 1.8,
    prixAchatHT: 8.50,
    prixVenteHT: 11.50,
    tva: 5.5,
    stockMin: 30,
    tags: ['pain', 'burger', 'bun', 'xl', 'double', 'grand'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FROMAGES - Tranches
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'FRO001',
    ean: '3760001002001',
    nom: 'Cheddar Orange Tranches x200',
    nomCourt: 'Cheddar x200',
    description: 'Tranches de cheddar fondu orange. Format burger.',
    categorie: 'Fromages',
    sousCategorie: 'Tranches',
    famille: 'FRO-TRA',
    unite: 'boite',
    contenance: '200 tranches (2.5kg)',
    poids: 2.5,
    prixAchatHT: 14.50,
    prixVenteHT: 19.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['cheddar', 'fromage', 'tranche', 'burger', 'orange'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRO002',
    ean: '3760001002018',
    nom: 'Fromage Fondu Burger Tranches x200',
    nomCourt: 'Fondu Burger x200',
    description: 'Tranches de fromage fondu special burger.',
    categorie: 'Fromages',
    sousCategorie: 'Tranches',
    famille: 'FRO-TRA',
    unite: 'boite',
    contenance: '200 tranches (2.5kg)',
    poids: 2.5,
    prixAchatHT: 16.00,
    prixVenteHT: 21.90,
    tva: 5.5,
    stockMin: 35,
    tags: ['fromage', 'fondu', 'tranche', 'burger', 'american'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FROMAGES - Rapes
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'FRO010',
    ean: '3760001002100',
    nom: 'Emmental Rape 2.5kg',
    nomCourt: 'Emmental Rape 2.5kg',
    description: 'Emmental rape pour gratins et pizzas.',
    categorie: 'Fromages',
    sousCategorie: 'Rape',
    famille: 'FRO-RAP',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 12.00,
    prixVenteHT: 15.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['emmental', 'fromage', 'rape', 'gratine', 'pizza'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRO011',
    ean: '3760001002117',
    nom: 'Mozzarella Rapee 2.5kg',
    nomCourt: 'Mozza Rapee 2.5kg',
    description: 'Mozzarella rapee filante pour pizzas.',
    categorie: 'Fromages',
    sousCategorie: 'Rape',
    famille: 'FRO-RAP',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 14.00,
    prixVenteHT: 18.50,
    tva: 5.5,
    stockMin: 30,
    tags: ['mozzarella', 'fromage', 'rape', 'pizza', 'filant'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRO012',
    ean: '3760001002124',
    nom: 'Mix 3 Fromages Rapes 2.5kg',
    nomCourt: 'Mix 3 Fromages 2.5kg',
    description: 'Melange emmental, mozzarella, cheddar rapes.',
    categorie: 'Fromages',
    sousCategorie: 'Rape',
    famille: 'FRO-RAP',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 15.50,
    prixVenteHT: 20.90,
    tva: 5.5,
    stockMin: 25,
    tags: ['mix', 'fromage', 'rape', 'pizza', 'tacos', 'gratine'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FROMAGES - Speciaux (Bleu, Chevre, Raclette)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'FRO020',
    ean: '3760001002200',
    nom: 'Bleu d\'Auvergne Emiette 1kg',
    nomCourt: 'Bleu Emiette 1kg',
    description: 'Bleu d\'Auvergne emiette pour burgers gourmet.',
    categorie: 'Fromages',
    sousCategorie: 'Speciaux',
    famille: 'FRO-SPE',
    unite: 'barquette',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 18.00,
    prixVenteHT: 24.50,
    tva: 5.5,
    stockMin: 15,
    tags: ['bleu', 'fromage', 'emiette', 'burger', 'gourmet', 'roquefort'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRO021',
    ean: '3760001002217',
    nom: 'Chevre Buche Affine 1kg',
    nomCourt: 'Chevre Buche 1kg',
    description: 'Buche de chevre affine a trancher.',
    categorie: 'Fromages',
    sousCategorie: 'Speciaux',
    famille: 'FRO-SPE',
    unite: 'piece',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 14.50,
    prixVenteHT: 19.90,
    tva: 5.5,
    stockMin: 15,
    tags: ['chevre', 'fromage', 'buche', 'burger', 'salade'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRO022',
    ean: '3760001002224',
    nom: 'Raclette Tranches 1kg',
    nomCourt: 'Raclette 1kg',
    description: 'Fromage a raclette tranche pour burgers montagnards.',
    categorie: 'Fromages',
    sousCategorie: 'Speciaux',
    famille: 'FRO-SPE',
    unite: 'paquet',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 12.50,
    prixVenteHT: 17.50,
    tva: 5.5,
    stockMin: 20,
    tags: ['raclette', 'fromage', 'tranche', 'burger', 'fondu', 'montagnard'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAUCES - Kebab
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'SAU001',
    ean: '3760001003001',
    nom: 'Sauce Blanche Kebab 5L',
    nomCourt: 'Sauce Blanche 5L',
    description: 'Sauce blanche yaourt/ail pour kebab.',
    categorie: 'Sauces',
    sousCategorie: 'Kebab',
    famille: 'SAU-KEB',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 9.50,
    prixVenteHT: 12.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['sauce', 'blanche', 'kebab', 'yaourt', 'ail'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU002',
    ean: '3760001003018',
    nom: 'Sauce Samourai 5L',
    nomCourt: 'Sauce Samourai 5L',
    description: 'Sauce samourai epicee.',
    categorie: 'Sauces',
    sousCategorie: 'Kebab',
    famille: 'SAU-KEB',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 11.00,
    prixVenteHT: 14.90,
    tva: 5.5,
    stockMin: 25,
    tags: ['sauce', 'samourai', 'epice', 'kebab', 'pimente'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU003',
    ean: '3760001003025',
    nom: 'Sauce Algerienne 5L',
    nomCourt: 'Sauce Algerienne 5L',
    description: 'Sauce algerienne traditionnelle.',
    categorie: 'Sauces',
    sousCategorie: 'Kebab',
    famille: 'SAU-KEB',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 10.50,
    prixVenteHT: 14.50,
    tva: 5.5,
    stockMin: 25,
    tags: ['sauce', 'algerienne', 'kebab', 'epice'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU004',
    ean: '3760001003032',
    nom: 'Sauce Harissa 5L',
    nomCourt: 'Harissa 5L',
    description: 'Sauce harissa piquante traditionnelle.',
    categorie: 'Sauces',
    sousCategorie: 'Kebab',
    famille: 'SAU-KEB',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 10.00,
    prixVenteHT: 13.90,
    tva: 5.5,
    stockMin: 20,
    tags: ['sauce', 'harissa', 'piment', 'kebab', 'epice'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAUCES - Tacos
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'SAU010',
    ean: '3760001003100',
    nom: 'Sauce Fromagere 5L',
    nomCourt: 'Fromagere 5L',
    description: 'Sauce fromagere onctueuse pour tacos.',
    categorie: 'Sauces',
    sousCategorie: 'Tacos',
    famille: 'SAU-TAC',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.3,
    prixAchatHT: 12.50,
    prixVenteHT: 16.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['sauce', 'fromagere', 'tacos', 'cheese', 'cheddar'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU011',
    ean: '3760001003117',
    nom: 'Sauce Poivre 5L',
    nomCourt: 'Sauce Poivre 5L',
    description: 'Sauce au poivre cremeuse pour tacos.',
    categorie: 'Sauces',
    sousCategorie: 'Tacos',
    famille: 'SAU-TAC',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 11.50,
    prixVenteHT: 15.90,
    tva: 5.5,
    stockMin: 25,
    tags: ['sauce', 'poivre', 'tacos', 'creme'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAUCES - Burger / Classiques
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'SAU020',
    ean: '3760001003200',
    nom: 'Ketchup 5L',
    nomCourt: 'Ketchup 5L',
    description: 'Ketchup traditionnel.',
    categorie: 'Sauces',
    sousCategorie: 'Classiques',
    famille: 'SAU-CLA',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.5,
    prixAchatHT: 7.50,
    prixVenteHT: 10.50,
    tva: 5.5,
    stockMin: 40,
    tags: ['ketchup', 'sauce', 'tomate', 'burger', 'frites'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU021',
    ean: '3760001003217',
    nom: 'Mayonnaise 5L',
    nomCourt: 'Mayonnaise 5L',
    description: 'Mayonnaise onctueuse.',
    categorie: 'Sauces',
    sousCategorie: 'Classiques',
    famille: 'SAU-CLA',
    unite: 'bidon',
    contenance: '5L',
    poids: 5,
    prixAchatHT: 8.50,
    prixVenteHT: 11.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['mayonnaise', 'mayo', 'sauce', 'burger', 'frites'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU022',
    ean: '3760001003224',
    nom: 'Sauce Burger Speciale 5L',
    nomCourt: 'Sauce Burger 5L',
    description: 'Sauce burger facon Big Mac.',
    categorie: 'Sauces',
    sousCategorie: 'Burger',
    famille: 'SAU-BUR',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.2,
    prixAchatHT: 11.00,
    prixVenteHT: 15.50,
    tva: 5.5,
    stockMin: 30,
    tags: ['sauce', 'burger', 'speciale', 'bigmac'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'SAU023',
    ean: '3760001003231',
    nom: 'Sauce BBQ 5L',
    nomCourt: 'Sauce BBQ 5L',
    description: 'Sauce barbecue fumee.',
    categorie: 'Sauces',
    sousCategorie: 'Burger',
    famille: 'SAU-BUR',
    unite: 'bidon',
    contenance: '5L',
    poids: 5.3,
    prixAchatHT: 10.50,
    prixVenteHT: 14.50,
    tva: 5.5,
    stockMin: 25,
    tags: ['sauce', 'bbq', 'barbecue', 'fume', 'burger'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGUMES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'LEG001',
    ean: '3760001004001',
    nom: 'Salade Iceberg x6',
    nomCourt: 'Iceberg x6',
    description: 'Salades iceberg fraiches.',
    categorie: 'Legumes',
    sousCategorie: 'Frais',
    famille: 'LEG-FRA',
    unite: 'carton',
    contenance: '6 pieces',
    poids: 3,
    prixAchatHT: 6.50,
    prixVenteHT: 8.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['salade', 'iceberg', 'frais', 'laitue'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'LEG002',
    ean: '3760001004018',
    nom: 'Tomates Fraiches 5kg',
    nomCourt: 'Tomates 5kg',
    description: 'Tomates rondes fraiches calibre moyen.',
    categorie: 'Legumes',
    sousCategorie: 'Frais',
    famille: 'LEG-FRA',
    unite: 'cagette',
    contenance: '5kg',
    poids: 5,
    prixAchatHT: 9.00,
    prixVenteHT: 12.50,
    tva: 5.5,
    stockMin: 25,
    tags: ['tomate', 'frais', 'legume'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'LEG003',
    ean: '3760001004025',
    nom: 'Oignons Eminces 2.5kg',
    nomCourt: 'Oignons Eminces 2.5kg',
    description: 'Oignons eminces prets a l\'emploi.',
    categorie: 'Legumes',
    sousCategorie: 'Prepare',
    famille: 'LEG-PRE',
    unite: 'sachet',
    contenance: '2.5kg',
    poids: 2.5,
    prixAchatHT: 7.00,
    prixVenteHT: 9.50,
    tva: 5.5,
    stockMin: 25,
    tags: ['oignon', 'emince', 'prepare'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'LEG004',
    ean: '3760001004032',
    nom: 'Oignons Frits Crispy 1kg',
    nomCourt: 'Oignons Frits 1kg',
    description: 'Oignons frits croustillants pour burgers.',
    categorie: 'Legumes',
    sousCategorie: 'Prepare',
    famille: 'LEG-PRE',
    unite: 'sachet',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 9.50,
    prixVenteHT: 13.50,
    tva: 5.5,
    stockMin: 20,
    tags: ['oignon', 'frit', 'crispy', 'burger'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'LEG010',
    ean: '3760001004100',
    nom: 'Cornichons Tranches 5kg',
    nomCourt: 'Cornichons 5kg',
    description: 'Cornichons en tranches pour burgers.',
    categorie: 'Legumes',
    sousCategorie: 'Conserves',
    famille: 'LEG-CON',
    unite: 'seau',
    contenance: '5kg',
    poids: 5,
    prixAchatHT: 12.00,
    prixVenteHT: 16.50,
    tva: 5.5,
    stockMin: 20,
    tags: ['cornichon', 'pickle', 'burger', 'tranche'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'LEG011',
    ean: '3760001004117',
    nom: 'Jalapenos Tranches 3kg',
    nomCourt: 'Jalapenos 3kg',
    description: 'Piments jalapenos en tranches.',
    categorie: 'Legumes',
    sousCategorie: 'Conserves',
    famille: 'LEG-CON',
    unite: 'boite',
    contenance: '3kg',
    poids: 3,
    prixAchatHT: 9.50,
    prixVenteHT: 13.50,
    tva: 5.5,
    stockMin: 15,
    tags: ['jalapeno', 'piment', 'epice', 'tex-mex'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRITES & ACCOMPAGNEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'FRI001',
    ean: '3760001005001',
    nom: 'Frites 9mm Surgelees 10kg',
    nomCourt: 'Frites 9mm 10kg',
    description: 'Frites surgelees coupe 9mm standard.',
    categorie: 'Frites',
    sousCategorie: 'Classiques',
    famille: 'FRI-CLA',
    unite: 'carton',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 10.50,
    prixVenteHT: 14.50,
    tva: 5.5,
    stockMin: 50,
    tags: ['frites', '9mm', 'surgele', 'standard'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRI002',
    ean: '3760001005018',
    nom: 'Frites 7mm Fines Surgelees 10kg',
    nomCourt: 'Frites 7mm 10kg',
    description: 'Frites surgelees coupe fine 7mm.',
    categorie: 'Frites',
    sousCategorie: 'Classiques',
    famille: 'FRI-CLA',
    unite: 'carton',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 11.50,
    prixVenteHT: 15.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['frites', '7mm', 'fines', 'surgele'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRI010',
    ean: '3760001005100',
    nom: 'Potatoes Surgelees 10kg',
    nomCourt: 'Potatoes 10kg',
    description: 'Quartiers de pommes de terre epices.',
    categorie: 'Frites',
    sousCategorie: 'Speciales',
    famille: 'FRI-SPE',
    unite: 'carton',
    contenance: '10kg',
    poids: 10,
    prixAchatHT: 13.00,
    prixVenteHT: 17.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['potatoes', 'quartiers', 'epice', 'surgele'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'FRI011',
    ean: '3760001005117',
    nom: 'Onion Rings Surgeles 1kg',
    nomCourt: 'Onion Rings 1kg',
    description: 'Rondelles d\'oignons panees.',
    categorie: 'Frites',
    sousCategorie: 'Speciales',
    famille: 'FRI-SPE',
    unite: 'sachet',
    contenance: '1kg',
    poids: 1,
    prixAchatHT: 6.50,
    prixVenteHT: 8.90,
    tva: 5.5,
    stockMin: 25,
    tags: ['onion rings', 'oignon', 'pane', 'surgele'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOISSONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'BOI001',
    ean: '5449000000996',
    nom: 'Coca-Cola 33cl x24',
    nomCourt: 'Coca 33cl x24',
    description: 'Pack de 24 canettes Coca-Cola 33cl.',
    categorie: 'Boissons',
    sousCategorie: 'Sodas',
    famille: 'BOI-SOD',
    unite: 'pack',
    contenance: '24 x 33cl',
    poids: 8.5,
    prixAchatHT: 14.50,
    prixVenteHT: 19.90,
    tva: 5.5,
    stockMin: 40,
    tags: ['coca', 'cola', 'soda', 'canette'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'BOI002',
    ean: '3760001006002',
    nom: 'Eau Minerale 50cl x24',
    nomCourt: 'Eau 50cl x24',
    description: 'Pack de 24 bouteilles d\'eau 50cl.',
    categorie: 'Boissons',
    sousCategorie: 'Eaux',
    famille: 'BOI-EAU',
    unite: 'pack',
    contenance: '24 x 50cl',
    poids: 12.5,
    prixAchatHT: 4.50,
    prixVenteHT: 6.50,
    tva: 5.5,
    stockMin: 50,
    tags: ['eau', 'minerale', 'bouteille'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'BOI003',
    ean: '3760001006019',
    nom: 'Orangina 33cl x24',
    nomCourt: 'Orangina 33cl x24',
    description: 'Pack de 24 canettes Orangina 33cl.',
    categorie: 'Boissons',
    sousCategorie: 'Sodas',
    famille: 'BOI-SOD',
    unite: 'pack',
    contenance: '24 x 33cl',
    poids: 8.5,
    prixAchatHT: 16.00,
    prixVenteHT: 21.90,
    tva: 5.5,
    stockMin: 30,
    tags: ['orangina', 'orange', 'soda', 'canette'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Boites
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB001',
    ean: '3760001007001',
    nom: 'Boite Burger Carton x200',
    nomCourt: 'Boite Burger x200',
    description: 'Boites carton pour burger standard.',
    categorie: 'Emballages',
    sousCategorie: 'Boites',
    famille: 'EMB-BOI',
    unite: 'carton',
    contenance: '200 pieces',
    poids: 3.5,
    prixAchatHT: 18.00,
    prixVenteHT: 24.90,
    tva: 20,
    stockMin: 30,
    tags: ['boite', 'burger', 'carton', 'emballage'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB002',
    ean: '3760001007018',
    nom: 'Boite Burger XL Carton x100',
    nomCourt: 'Boite Burger XL x100',
    description: 'Boites carton grand format pour doubles.',
    categorie: 'Emballages',
    sousCategorie: 'Boites',
    famille: 'EMB-BOI',
    unite: 'carton',
    contenance: '100 pieces',
    poids: 2.5,
    prixAchatHT: 14.00,
    prixVenteHT: 19.50,
    tva: 20,
    stockMin: 20,
    tags: ['boite', 'burger', 'xl', 'carton', 'double'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB003',
    ean: '3760001007025',
    nom: 'Boite Kebab Alu x500',
    nomCourt: 'Boite Kebab x500',
    description: 'Barquettes aluminium pour assiettes kebab.',
    categorie: 'Emballages',
    sousCategorie: 'Boites',
    famille: 'EMB-BOI',
    unite: 'carton',
    contenance: '500 pieces',
    poids: 5,
    prixAchatHT: 28.00,
    prixVenteHT: 38.90,
    tva: 20,
    stockMin: 20,
    tags: ['boite', 'kebab', 'alu', 'aluminium', 'barquette'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB004',
    ean: '3760001007032',
    nom: 'Boite Tacos Carton x200',
    nomCourt: 'Boite Tacos x200',
    description: 'Boites carton pour tacos et wraps.',
    categorie: 'Emballages',
    sousCategorie: 'Boites',
    famille: 'EMB-BOI',
    unite: 'carton',
    contenance: '200 pieces',
    poids: 3,
    prixAchatHT: 20.00,
    prixVenteHT: 27.50,
    tva: 20,
    stockMin: 25,
    tags: ['boite', 'tacos', 'carton', 'wrap'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Papiers
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB010',
    ean: '3760001007100',
    nom: 'Papier Burger Ingraissable x1000',
    nomCourt: 'Papier Burger x1000',
    description: 'Feuilles papier ingraissable pour burgers.',
    categorie: 'Emballages',
    sousCategorie: 'Papiers',
    famille: 'EMB-PAP',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 2,
    prixAchatHT: 11.00,
    prixVenteHT: 15.50,
    tva: 20,
    stockMin: 30,
    tags: ['papier', 'burger', 'ingraissable', 'wrap'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB011',
    ean: '3760001007117',
    nom: 'Papier Alu Kebab 200m',
    nomCourt: 'Alu Kebab 200m',
    description: 'Rouleau papier aluminium pour kebab.',
    categorie: 'Emballages',
    sousCategorie: 'Papiers',
    famille: 'EMB-PAP',
    unite: 'rouleau',
    contenance: '200m',
    poids: 1.5,
    prixAchatHT: 12.50,
    prixVenteHT: 17.50,
    tva: 20,
    stockMin: 25,
    tags: ['papier', 'alu', 'aluminium', 'kebab', 'rouleau'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB012',
    ean: '3760001007124',
    nom: 'Papier Kraft Sandwich x1000',
    nomCourt: 'Papier Kraft x1000',
    description: 'Papier kraft pour sandwichs et wraps.',
    categorie: 'Emballages',
    sousCategorie: 'Papiers',
    famille: 'EMB-PAP',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 2.5,
    prixAchatHT: 13.00,
    prixVenteHT: 18.50,
    tva: 20,
    stockMin: 25,
    tags: ['papier', 'kraft', 'sandwich', 'wrap'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Barquettes Frites
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB020',
    ean: '3760001007200',
    nom: 'Barquette Frites Carton x500',
    nomCourt: 'Barquette Frites x500',
    description: 'Barquettes carton pour frites portion.',
    categorie: 'Emballages',
    sousCategorie: 'Barquettes',
    famille: 'EMB-BAR',
    unite: 'carton',
    contenance: '500 pieces',
    poids: 3,
    prixAchatHT: 16.00,
    prixVenteHT: 22.50,
    tva: 20,
    stockMin: 30,
    tags: ['barquette', 'frites', 'carton'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB021',
    ean: '3760001007217',
    nom: 'Cornet Frites Papier x500',
    nomCourt: 'Cornet Frites x500',
    description: 'Cornets papier pour frites.',
    categorie: 'Emballages',
    sousCategorie: 'Barquettes',
    famille: 'EMB-BAR',
    unite: 'carton',
    contenance: '500 pieces',
    poids: 2,
    prixAchatHT: 14.00,
    prixVenteHT: 19.90,
    tva: 20,
    stockMin: 25,
    tags: ['cornet', 'frites', 'papier'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Sacs
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB030',
    ean: '3760001007300',
    nom: 'Sac Kraft Petit x500',
    nomCourt: 'Sac Kraft S x500',
    description: 'Sacs kraft petit format pour vente a emporter.',
    categorie: 'Emballages',
    sousCategorie: 'Sacs',
    famille: 'EMB-SAC',
    unite: 'carton',
    contenance: '500 pieces',
    poids: 2.5,
    prixAchatHT: 9.00,
    prixVenteHT: 12.90,
    tva: 20,
    stockMin: 30,
    tags: ['sac', 'kraft', 'petit', 'emporter'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB031',
    ean: '3760001007317',
    nom: 'Sac Kraft Moyen x300',
    nomCourt: 'Sac Kraft M x300',
    description: 'Sacs kraft moyen format pour menus.',
    categorie: 'Emballages',
    sousCategorie: 'Sacs',
    famille: 'EMB-SAC',
    unite: 'carton',
    contenance: '300 pieces',
    poids: 2.5,
    prixAchatHT: 10.50,
    prixVenteHT: 14.90,
    tva: 20,
    stockMin: 25,
    tags: ['sac', 'kraft', 'moyen', 'menu'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB032',
    ean: '3760001007324',
    nom: 'Sac Kraft Grand x200',
    nomCourt: 'Sac Kraft L x200',
    description: 'Sacs kraft grand format pour commandes.',
    categorie: 'Emballages',
    sousCategorie: 'Sacs',
    famille: 'EMB-SAC',
    unite: 'carton',
    contenance: '200 pieces',
    poids: 2.5,
    prixAchatHT: 12.00,
    prixVenteHT: 16.90,
    tva: 20,
    stockMin: 20,
    tags: ['sac', 'kraft', 'grand', 'commande'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Gobelets
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB040',
    ean: '3760001007400',
    nom: 'Gobelet Carton 30cl x1000',
    nomCourt: 'Gobelet 30cl x1000',
    description: 'Gobelets carton 30cl pour boissons froides.',
    categorie: 'Emballages',
    sousCategorie: 'Gobelets',
    famille: 'EMB-GOB',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 4,
    prixAchatHT: 22.00,
    prixVenteHT: 29.90,
    tva: 20,
    stockMin: 25,
    tags: ['gobelet', 'carton', '30cl', 'boisson'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB041',
    ean: '3760001007417',
    nom: 'Gobelet Carton 40cl x1000',
    nomCourt: 'Gobelet 40cl x1000',
    description: 'Gobelets carton 40cl pour boissons froides.',
    categorie: 'Emballages',
    sousCategorie: 'Gobelets',
    famille: 'EMB-GOB',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 5,
    prixAchatHT: 26.00,
    prixVenteHT: 35.90,
    tva: 20,
    stockMin: 20,
    tags: ['gobelet', 'carton', '40cl', 'boisson'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB042',
    ean: '3760001007424',
    nom: 'Couvercle Gobelet x1000',
    nomCourt: 'Couvercle Gob x1000',
    description: 'Couvercles dome pour gobelets.',
    categorie: 'Emballages',
    sousCategorie: 'Gobelets',
    famille: 'EMB-GOB',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 2,
    prixAchatHT: 12.00,
    prixVenteHT: 16.90,
    tva: 20,
    stockMin: 20,
    tags: ['couvercle', 'gobelet', 'dome'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB043',
    ean: '3760001007431',
    nom: 'Paille Carton x1000',
    nomCourt: 'Paille Carton x1000',
    description: 'Pailles en carton ecologiques.',
    categorie: 'Emballages',
    sousCategorie: 'Gobelets',
    famille: 'EMB-GOB',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 0.8,
    prixAchatHT: 9.00,
    prixVenteHT: 12.90,
    tva: 20,
    stockMin: 25,
    tags: ['paille', 'carton', 'ecologique'],
    actif: true,
    dateMAJ: '2025-01-15'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EMBALLAGES - Divers
  // ═══════════════════════════════════════════════════════════════════════════

  {
    ref: 'EMB050',
    ean: '3760001007500',
    nom: 'Serviettes Blanches x5000',
    nomCourt: 'Serviettes x5000',
    description: 'Serviettes papier blanches 1 pli.',
    categorie: 'Emballages',
    sousCategorie: 'Divers',
    famille: 'EMB-DIV',
    unite: 'carton',
    contenance: '5000 pieces',
    poids: 4,
    prixAchatHT: 14.00,
    prixVenteHT: 19.50,
    tva: 20,
    stockMin: 25,
    tags: ['serviette', 'papier', 'blanc'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
  {
    ref: 'EMB051',
    ean: '3760001007517',
    nom: 'Pot Sauce 30ml x1000',
    nomCourt: 'Pot Sauce x1000',
    description: 'Petits pots a sauce avec couvercle.',
    categorie: 'Emballages',
    sousCategorie: 'Divers',
    famille: 'EMB-DIV',
    unite: 'carton',
    contenance: '1000 pieces',
    poids: 3,
    prixAchatHT: 18.00,
    prixVenteHT: 25.90,
    tva: 20,
    stockMin: 20,
    tags: ['pot', 'sauce', '30ml', 'couvercle'],
    actif: true,
    dateMAJ: '2025-01-15'
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rechercher des produits par tags (pour le matching IA)
 */
export function findProductsByTags(searchTags: string[]): ProduitDistram[] {
  const searchLower = searchTags.map(t => t.toLowerCase().trim());

  return CATALOGUE_DISTRAM.filter(produit => {
    if (!produit.actif) return false;

    // Chercher dans les tags
    const hasMatchingTag = produit.tags.some(tag =>
      searchLower.some(search =>
        tag.includes(search) || search.includes(tag)
      )
    );

    // Chercher aussi dans le nom
    const hasMatchingName = searchLower.some(search =>
      produit.nom.toLowerCase().includes(search) ||
      produit.nomCourt.toLowerCase().includes(search)
    );

    return hasMatchingTag || hasMatchingName;
  });
}

/**
 * Obtenir un produit par sa reference SAGE
 */
export function getProductByRef(ref: string): ProduitDistram | undefined {
  return CATALOGUE_DISTRAM.find(p => p.ref === ref && p.actif);
}

/**
 * Obtenir tous les produits d'une categorie
 */
export function getProductsByCategory(categorie: string): ProduitDistram[] {
  return CATALOGUE_DISTRAM.filter(p => p.categorie === categorie && p.actif);
}

/**
 * Obtenir toutes les categories disponibles
 */
export function getAllCategories(): string[] {
  const categories = new Set(CATALOGUE_DISTRAM.filter(p => p.actif).map(p => p.categorie));
  return Array.from(categories);
}

/**
 * Recherche textuelle libre
 */
export function searchProducts(query: string): ProduitDistram[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return CATALOGUE_DISTRAM.filter(p => {
    if (!p.actif) return false;
    return (
      p.ref.toLowerCase().includes(q) ||
      p.nom.toLowerCase().includes(q) ||
      p.nomCourt.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.includes(q))
    );
  });
}

export default CATALOGUE_DISTRAM;
