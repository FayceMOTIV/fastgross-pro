/**
 * Données Mock pour Analytics et Dashboard
 * 100 clients, 200 commandes, données KPIs
 */

// ============================================
// TYPES
// ============================================

export interface Client {
  id: string;
  nom: string;
  type: 'kebab' | 'tacos' | 'pizza' | 'burger' | 'snack' | 'restaurant';
  adresse: string;
  ville: string;
  codePostal: string;
  telephone: string;
  email: string;
  commercial: string;
  depot: 'lyon' | 'montpellier' | 'bordeaux';
  accountType: 'gold' | 'silver' | 'bronze' | 'standard';
  remise: number;
  caAnnuel: number;
  panierMoyen: number;
  nbCommandes: number;
  dateCreation: Date;
  derniereCommande: Date;
  riskScore: number;
  status: 'actif' | 'inactif' | 'prospect' | 'at_risk';
}

export interface Commande {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  depot: 'lyon' | 'montpellier' | 'bordeaux';
  commercial: string;
  dateCreation: Date;
  dateLivraison?: Date;
  status: 'en_attente' | 'confirmee' | 'preparation' | 'expediee' | 'livree' | 'annulee';
  totalHT: number;
  totalTTC: number;
  nbProduits: number;
  modePaiement: 'virement' | 'cheque' | 'especes' | 'cb';
  priorite: 'normale' | 'urgente';
}

export interface KPIData {
  label: string;
  value: number;
  evolution: number; // %
  evolutionPeriod: string;
}

export interface ChartData {
  name: string;
  lyon: number;
  montpellier: number;
  bordeaux: number;
  total: number;
}

// ============================================
// GÉNÉRATEURS
// ============================================

const NOMS_RESTAURANTS = [
  // Kebab
  'Istanbul Kebab', 'Anatolie Grill', 'Sultan Döner', 'Bosphore Express', 'Cappadoce Kebab',
  'Pamukkale Snack', 'Ephèse Grill', 'Marmara Kebab', 'Ankara Express', 'Konya Döner',
  'Alanya Kebab', 'Izmir Grill', 'Bursa Döner', 'Adana Express', 'Trabzon Kebab',
  // Tacos
  "O'Tacos", 'French Tacos', 'Tacos Avenue', 'Tacos King', 'Tacos Factory',
  'Chamas Tacos', 'New School Tacos', 'Tacos & Co', 'Urban Tacos', 'Tacos Time',
  'Mega Tacos', 'Tacos Deluxe', 'Golden Tacos', 'Tacos Lounge', 'Royal Tacos',
  // Pizza
  'Pizza Napoli', 'Bella Pizza', 'La Romana', 'Pizza San Marco', 'Pizzeria del Sol',
  'Da Luigi', 'Pizza Presto', 'Mamma Mia', 'Pizza Venise', 'Napolitano',
  'Napoli Pizza', 'La Dolce Vita', 'Gusto Pizza', 'Milano Pizza', 'Pizza Roma',
  // Burger
  'Burger Factory', 'Big Burger', 'Smash Burger', 'Urban Burger', 'Classic Burger',
  'Brooklyn Burger', 'Premium Burger', 'Gourmet Burger', 'Burger Lounge', 'Burger Time',
  'American Burger', 'Fresh Burger', 'King Burger', 'Mega Burger', 'Best Burger',
  // Snack
  'Quick Snack', 'Express Snack', 'Snack du Coin', 'Le Petit Snack', 'Snack Royal',
  'City Snack', 'Snack & Go', 'Fast Snack', 'Good Snack', 'Happy Snack',
];

const COMMERCIAUX = {
  lyon: ['Karim Benzema', 'Sophie Martin', 'Lucas Dupont'],
  montpellier: ['Aïcha Benmoussa', 'Thomas Leroy'],
  bordeaux: ['Nadia Khelifi'],
};

const VILLES = {
  lyon: [
    { ville: 'Lyon', cp: ['69001', '69002', '69003', '69004', '69005', '69006', '69007', '69008', '69009'] },
    { ville: 'Villeurbanne', cp: ['69100'] },
    { ville: 'Vénissieux', cp: ['69200'] },
    { ville: 'Saint-Priest', cp: ['69800'] },
    { ville: 'Bron', cp: ['69500'] },
  ],
  montpellier: [
    { ville: 'Montpellier', cp: ['34000', '34070', '34080', '34090'] },
    { ville: 'Sète', cp: ['34200'] },
    { ville: 'Béziers', cp: ['34500'] },
    { ville: 'Nîmes', cp: ['30000'] },
  ],
  bordeaux: [
    { ville: 'Bordeaux', cp: ['33000', '33100', '33200', '33300', '33800'] },
    { ville: 'Mérignac', cp: ['33700'] },
    { ville: 'Pessac', cp: ['33600'] },
    { ville: 'Talence', cp: ['33400'] },
  ],
};

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number): number => Math.round((Math.random() * (max - min) + min) * 100) / 100;

// ============================================
// GÉNÉRATION 100 CLIENTS
// ============================================

function generateClients(): Client[] {
  const clients: Client[] = [];
  const types: Client['type'][] = ['kebab', 'tacos', 'pizza', 'burger', 'snack', 'restaurant'];

  for (let i = 0; i < 100; i++) {
    const depot = i < 50 ? 'lyon' : i < 75 ? 'montpellier' : 'bordeaux';
    const villeData = randomItem(VILLES[depot]);
    const type = randomItem(types);
    const commercial = randomItem(COMMERCIAUX[depot]);

    const caAnnuel = randomInt(15000, 150000);
    const nbCommandes = randomInt(20, 200);
    const panierMoyen = Math.round(caAnnuel / nbCommandes);
    const riskScore = randomInt(0, 100);

    let accountType: Client['accountType'] = 'standard';
    let remise = 0;
    if (caAnnuel > 100000) {
      accountType = 'gold';
      remise = 15;
    } else if (caAnnuel > 60000) {
      accountType = 'silver';
      remise = 10;
    } else if (caAnnuel > 30000) {
      accountType = 'bronze';
      remise = 5;
    }

    let status: Client['status'] = 'actif';
    if (riskScore > 70) status = 'at_risk';
    else if (riskScore > 85) status = 'inactif';
    else if (i % 15 === 0) status = 'prospect';

    const dateCreation = new Date(2023, randomInt(0, 11), randomInt(1, 28));
    const derniereCommande = new Date(2026, randomInt(0, 1), randomInt(1, 5));

    clients.push({
      id: `CLI-${String(i + 1).padStart(4, '0')}`,
      nom: `${randomItem(NOMS_RESTAURANTS)} ${villeData.ville.split(' ')[0]}`,
      type,
      adresse: `${randomInt(1, 200)} ${randomItem(['Rue', 'Avenue', 'Boulevard', 'Place'])} ${randomItem(['de la République', 'Victor Hugo', 'Jean Jaurès', 'Gambetta', 'de la Gare', 'du Commerce'])}`,
      ville: villeData.ville,
      codePostal: randomItem(villeData.cp),
      telephone: depot === 'lyon' ? `04 78 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`
                : depot === 'montpellier' ? `04 67 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`
                : `05 56 ${randomInt(10, 99)} ${randomInt(10, 99)} ${randomInt(10, 99)}`,
      email: `contact@${NOMS_RESTAURANTS[i % NOMS_RESTAURANTS.length].toLowerCase().replace(/[^a-z]/g, '')}.fr`,
      commercial,
      depot,
      accountType,
      remise,
      caAnnuel,
      panierMoyen,
      nbCommandes,
      dateCreation,
      derniereCommande,
      riskScore,
      status,
    });
  }

  return clients;
}

// ============================================
// GÉNÉRATION 200 COMMANDES
// ============================================

function generateCommandes(clients: Client[]): Commande[] {
  const commandes: Commande[] = [];
  const statuses: Commande['status'][] = ['en_attente', 'confirmee', 'preparation', 'expediee', 'livree', 'annulee'];
  const statusWeights = [0.05, 0.10, 0.10, 0.15, 0.55, 0.05]; // Most are delivered

  for (let i = 0; i < 200; i++) {
    const client = randomItem(clients.filter(c => c.status !== 'prospect'));
    const dateCreation = new Date(2026, randomInt(0, 1), randomInt(1, 5), randomInt(6, 20), randomInt(0, 59));

    // Weighted random status
    const statusRandom = Math.random();
    let status: Commande['status'] = 'livree';
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (statusRandom <= cumulative) {
        status = statuses[j];
        break;
      }
    }

    const totalHT = randomFloat(100, 1500);
    const totalTTC = Math.round(totalHT * 1.2 * 100) / 100;

    commandes.push({
      id: `CMD-${String(i + 1).padStart(5, '0')}`,
      numero: `CMD-2026-${String(i + 1).padStart(5, '0')}`,
      clientId: client.id,
      clientNom: client.nom,
      depot: client.depot,
      commercial: client.commercial,
      dateCreation,
      dateLivraison: status === 'livree' ? new Date(dateCreation.getTime() + randomInt(24, 72) * 60 * 60 * 1000) : undefined,
      status,
      totalHT,
      totalTTC,
      nbProduits: randomInt(3, 25),
      modePaiement: randomItem(['virement', 'cheque', 'especes', 'cb']),
      priorite: Math.random() > 0.9 ? 'urgente' : 'normale',
    });
  }

  // Trier par date
  return commandes.sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime());
}

// ============================================
// DONNÉES ANALYTICS
// ============================================

export function getKPIs(clients: Client[], commandes: Commande[]): KPIData[] {
  const totalCA = commandes.reduce((sum, c) => sum + c.totalTTC, 0);
  const commandesLivrees = commandes.filter(c => c.status === 'livree').length;
  const panierMoyen = totalCA / commandesLivrees || 0;
  const clientsActifs = clients.filter(c => c.status === 'actif').length;

  return [
    {
      label: 'CA Total',
      value: totalCA,
      evolution: 18.5,
      evolutionPeriod: 'vs mois dernier',
    },
    {
      label: 'Commandes',
      value: commandes.length,
      evolution: 12.3,
      evolutionPeriod: 'vs mois dernier',
    },
    {
      label: 'Panier Moyen',
      value: panierMoyen,
      evolution: 5.8,
      evolutionPeriod: 'vs mois dernier',
    },
    {
      label: 'Clients Actifs',
      value: clientsActifs,
      evolution: 8.2,
      evolutionPeriod: 'ce mois',
    },
  ];
}

export function getCAByMonth(): ChartData[] {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return months.map((name, i) => {
    const baseValue = 50000 + Math.sin(i / 2) * 15000;
    const lyon = Math.round(baseValue * (0.45 + Math.random() * 0.1));
    const montpellier = Math.round(baseValue * (0.3 + Math.random() * 0.1));
    const bordeaux = Math.round(baseValue * (0.2 + Math.random() * 0.1));
    return {
      name,
      lyon,
      montpellier,
      bordeaux,
      total: lyon + montpellier + bordeaux,
    };
  });
}

export function getTopClients(clients: Client[], limit = 10): Client[] {
  return [...clients]
    .sort((a, b) => b.caAnnuel - a.caAnnuel)
    .slice(0, limit);
}

export function getTopCommercials(clients: Client[], commandes: Commande[]) {
  const commercials: Record<string, { nom: string; ca: number; clients: number; commandes: number }> = {};

  clients.forEach(client => {
    if (!commercials[client.commercial]) {
      commercials[client.commercial] = { nom: client.commercial, ca: 0, clients: 0, commandes: 0 };
    }
    commercials[client.commercial].clients++;
    commercials[client.commercial].ca += client.caAnnuel;
  });

  commandes.forEach(cmd => {
    if (commercials[cmd.commercial]) {
      commercials[cmd.commercial].commandes++;
    }
  });

  return Object.values(commercials).sort((a, b) => b.ca - a.ca);
}

export function getClientsByType(clients: Client[]) {
  const types: Record<string, number> = {};
  clients.forEach(c => {
    types[c.type] = (types[c.type] || 0) + 1;
  });
  return Object.entries(types).map(([name, value]) => ({ name, value }));
}

export function getCommandesByStatus(commandes: Commande[]) {
  const statuses: Record<string, number> = {};
  commandes.forEach(c => {
    statuses[c.status] = (statuses[c.status] || 0) + 1;
  });
  return Object.entries(statuses).map(([name, value]) => ({ name, value }));
}

// ============================================
// EXPORT DONNÉES
// ============================================

export const MOCK_CLIENTS = generateClients();
export const MOCK_COMMANDES = generateCommandes(MOCK_CLIENTS);
export const MOCK_KPIS = getKPIs(MOCK_CLIENTS, MOCK_COMMANDES);
export const MOCK_CA_MONTHLY = getCAByMonth();
export const MOCK_TOP_CLIENTS = getTopClients(MOCK_CLIENTS);
export const MOCK_TOP_COMMERCIALS = getTopCommercials(MOCK_CLIENTS, MOCK_COMMANDES);
export const MOCK_CLIENTS_BY_TYPE = getClientsByType(MOCK_CLIENTS);
export const MOCK_COMMANDES_BY_STATUS = getCommandesByStatus(MOCK_COMMANDES);

// Statistiques globales
export const MOCK_STATS = {
  totalClients: MOCK_CLIENTS.length,
  clientsActifs: MOCK_CLIENTS.filter(c => c.status === 'actif').length,
  clientsAtRisk: MOCK_CLIENTS.filter(c => c.status === 'at_risk').length,
  totalCommandes: MOCK_COMMANDES.length,
  commandesEnCours: MOCK_COMMANDES.filter(c => !['livree', 'annulee'].includes(c.status)).length,
  caTotal: Math.round(MOCK_COMMANDES.reduce((sum, c) => sum + c.totalTTC, 0)),
  caLyon: Math.round(MOCK_COMMANDES.filter(c => c.depot === 'lyon').reduce((sum, c) => sum + c.totalTTC, 0)),
  caMontpellier: Math.round(MOCK_COMMANDES.filter(c => c.depot === 'montpellier').reduce((sum, c) => sum + c.totalTTC, 0)),
  caBordeaux: Math.round(MOCK_COMMANDES.filter(c => c.depot === 'bordeaux').reduce((sum, c) => sum + c.totalTTC, 0)),
  panierMoyen: Math.round(MOCK_COMMANDES.reduce((sum, c) => sum + c.totalTTC, 0) / MOCK_COMMANDES.filter(c => c.status === 'livree').length),
};
