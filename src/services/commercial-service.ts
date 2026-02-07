/**
 * Service Commercial Terrain
 * Gère toutes les fonctionnalités pour les commerciaux sur le terrain
 */

// Types
export interface CommercialObjectives {
  monthly: { target: number; current: number; percent: number };
  quarterly: { target: number; current: number; percent: number };
  newClients: { target: number; current: number };
}

export interface TodayStats {
  visitsPlanned: number;
  visitsCompleted: number;
  ordersCreated: number;
  ordersAmount: number;
  callsMade: number;
}

export interface ClientAlert {
  id: string;
  clientId: string;
  clientName: string;
  type: 'inactive' | 'overdue_invoice' | 'behavior_change' | 'at_risk' | 'opportunity';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'call' | 'visit' | 'email' | 'offer';
  amount?: number;
  daysOverdue?: number;
  distance?: number;
  createdAt: Date;
}

export interface InvoiceAlert {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface AIOpportunity {
  id: string;
  type: 'route' | 'upsell' | 'reactivation' | 'prospect';
  title: string;
  description: string;
  impact?: string;
  clientIds?: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface Activity {
  id: string;
  type: 'order' | 'call' | 'visit' | 'note' | 'email';
  clientId?: string;
  clientName?: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

export interface CommercialDashboard {
  objectives: CommercialObjectives;
  today: TodayStats;
  alerts: {
    clientsToCall: ClientAlert[];
    overdueInvoices: InvoiceAlert[];
    behaviorAlerts: ClientAlert[];
    opportunities: AIOpportunity[];
    total: number;
  };
  recentActivity: Activity[];
  suggestions: AIOpportunity[];
}

export interface CommercialClient {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'at_risk';
  priceGrid: 'standard' | 'premium' | 'gold' | 'vip';
  yearlyRevenue: number;
  monthlyRevenue: number;
  lastOrderDate?: Date;
  daysSinceLastOrder?: number;
  alerts: ClientAlert[];
  address: {
    street: string;
    city: string;
    postalCode: string;
    lat?: number;
    lng?: number;
  };
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface ClientFilters {
  status?: 'all' | 'active' | 'at_risk' | 'inactive';
  sortBy?: 'revenue' | 'lastOrder' | 'alerts' | 'name';
  search?: string;
}

export interface UsualProduct {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unit: string;
  avgQuantity: number;
  lastOrderedQuantity: number;
  frequency: string;
  hasAlert?: boolean;
  alertMessage?: string;
  availablePromo?: {
    percent: number;
    newPrice: number;
    reason: string;
  };
}

export interface QuickOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  promoApplied?: string;
}

export interface OptimizedRoute {
  orderedStops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  geometry?: string;
  savings: {
    distance: number;
    duration: number;
    percentSaved: number;
  };
}

export interface RouteStop {
  id: string;
  name: string;
  type: 'client' | 'prospect';
  status?: string;
  address: string;
  lat: number;
  lng: number;
  distanceFromPrev?: number;
  durationFromPrev?: number;
  alert?: string;
  priority?: 'high' | 'medium' | 'low';
}

// ===== MOCK DATA =====

const MOCK_CLIENTS: CommercialClient[] = [
  {
    id: 'c1',
    name: 'Brooklyn Burger',
    type: 'Fast-food',
    status: 'active',
    priceGrid: 'gold',
    yearlyRevenue: 45000,
    monthlyRevenue: 3450,
    lastOrderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    daysSinceLastOrder: 3,
    alerts: [
      {
        id: 'a1',
        clientId: 'c1',
        clientName: 'Brooklyn Burger',
        type: 'overdue_invoice',
        severity: 'high',
        title: 'Facture impayée',
        description: 'Facture #F-892 de 890€ en retard de 15 jours',
        actionLabel: 'Relancer',
        actionType: 'call',
        amount: 890,
        daysOverdue: 15,
        createdAt: new Date(),
      },
    ],
    address: {
      street: '45 Rue de la République',
      city: 'Marseille',
      postalCode: '13001',
      lat: 43.2965,
      lng: 5.3698,
    },
    contact: {
      name: 'Jean Dupont',
      phone: '06 12 34 56 78',
      email: 'contact@burgerhouse.fr',
    },
  },
  {
    id: 'c2',
    name: 'Napoli Pizza',
    type: 'Pizzeria',
    status: 'active',
    priceGrid: 'premium',
    yearlyRevenue: 32000,
    monthlyRevenue: 2800,
    lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    daysSinceLastOrder: 1,
    alerts: [],
    address: {
      street: '12 Avenue du Prado',
      city: 'Marseille',
      postalCode: '13008',
      lat: 43.2789,
      lng: 5.3891,
    },
    contact: {
      name: 'Marco Rossi',
      phone: '06 98 76 54 32',
      email: 'marco@pizzaexpress.fr',
    },
  },
  {
    id: 'c3',
    name: 'Kebab Istanbul',
    type: 'Kebab',
    status: 'at_risk',
    priceGrid: 'standard',
    yearlyRevenue: 18000,
    monthlyRevenue: 1200,
    lastOrderDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    daysSinceLastOrder: 21,
    alerts: [
      {
        id: 'a2',
        clientId: 'c3',
        clientName: 'Kebab Istanbul',
        type: 'behavior_change',
        severity: 'medium',
        title: 'Cheddar manquant',
        description: "N'a plus commandé de cheddar depuis 3 semaines",
        actionLabel: 'Voir offre',
        actionType: 'offer',
        createdAt: new Date(),
      },
      {
        id: 'a3',
        clientId: 'c3',
        clientName: 'Kebab Istanbul',
        type: 'at_risk',
        severity: 'high',
        title: 'Client à risque',
        description: 'Baisse de 40% des commandes ce mois',
        actionLabel: 'Appeler',
        actionType: 'call',
        createdAt: new Date(),
      },
    ],
    address: {
      street: '78 Cours Lieutaud',
      city: 'Marseille',
      postalCode: '13006',
      lat: 43.2912,
      lng: 5.3812,
    },
    contact: {
      name: 'Mehmet Yilmaz',
      phone: '06 45 67 89 01',
      email: 'kebab.istanbul@gmail.com',
    },
  },
  {
    id: 'c4',
    name: 'Tacos Avenue',
    type: 'Snack',
    status: 'inactive',
    priceGrid: 'standard',
    yearlyRevenue: 8000,
    monthlyRevenue: 0,
    lastOrderDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    daysSinceLastOrder: 45,
    alerts: [
      {
        id: 'a4',
        clientId: 'c4',
        clientName: 'Tacos Avenue',
        type: 'inactive',
        severity: 'high',
        title: 'Client inactif',
        description: 'Aucune commande depuis 45 jours',
        actionLabel: 'Réactiver',
        actionType: 'visit',
        createdAt: new Date(),
      },
    ],
    address: {
      street: '23 Boulevard Baille',
      city: 'Marseille',
      postalCode: '13005',
      lat: 43.2856,
      lng: 5.3956,
    },
    contact: {
      name: 'Ahmed Rahimi',
      phone: '06 23 45 67 89',
    },
  },
  {
    id: 'c5',
    name: 'Fast Chicken',
    type: 'Fast-food',
    status: 'active',
    priceGrid: 'premium',
    yearlyRevenue: 28000,
    monthlyRevenue: 2400,
    lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    daysSinceLastOrder: 5,
    alerts: [],
    address: {
      street: '56 Rue Saint-Ferréol',
      city: 'Marseille',
      postalCode: '13001',
      lat: 43.2945,
      lng: 5.3756,
    },
    contact: {
      name: 'Sophie Durand',
      phone: '06 78 90 12 34',
      email: 'contact@fastchicken.fr',
    },
  },
];

const MOCK_PROSPECTS = [
  {
    id: 'p1',
    name: 'Pizza Napoli',
    type: 'Pizzeria',
    score: 85,
    address: {
      street: '34 Rue Paradis',
      city: 'Marseille',
      postalCode: '13001',
      lat: 43.2934,
      lng: 5.3765,
    },
    phone: '06 11 22 33 44',
    distance: 200,
  },
  {
    id: 'p2',
    name: 'Tacos Factory',
    type: 'Fast-food',
    score: 72,
    address: {
      street: '89 La Canebière',
      city: 'Marseille',
      postalCode: '13001',
      lat: 43.2978,
      lng: 5.3801,
    },
    phone: '06 55 66 77 88',
    distance: 450,
  },
];

const MOCK_USUAL_PRODUCTS: UsualProduct[] = [
  {
    id: 'prod1',
    name: 'Huile friture 10L',
    category: 'Huiles',
    unitPrice: 24.9,
    unit: 'bidon',
    avgQuantity: 2,
    lastOrderedQuantity: 2,
    frequency: '2x/semaine',
  },
  {
    id: 'prod2',
    name: 'Frites surgelées 5kg',
    category: 'Surgelés',
    unitPrice: 12.5,
    unit: 'sac',
    avgQuantity: 5,
    lastOrderedQuantity: 5,
    frequency: '2x/semaine',
  },
  {
    id: 'prod3',
    name: 'Cheddar tranché 1kg',
    category: 'Fromages',
    unitPrice: 8.9,
    unit: 'paquet',
    avgQuantity: 3,
    lastOrderedQuantity: 0,
    frequency: '1x/semaine',
    hasAlert: true,
    alertMessage: 'Pas commandé depuis 3 semaines',
    availablePromo: {
      percent: 8,
      newPrice: 8.19,
      reason: 'Relance client',
    },
  },
  {
    id: 'prod4',
    name: 'Sauce burger 500ml',
    category: 'Sauces',
    unitPrice: 4.5,
    unit: 'bouteille',
    avgQuantity: 10,
    lastOrderedQuantity: 10,
    frequency: '1x/semaine',
  },
  {
    id: 'prod5',
    name: 'Pain burger x48',
    category: 'Pains',
    unitPrice: 8.9,
    unit: 'carton',
    avgQuantity: 4,
    lastOrderedQuantity: 4,
    frequency: '2x/semaine',
  },
];

// ===== SERVICE FUNCTIONS =====

/**
 * Récupère le dashboard du commercial
 */
export async function getCommercialDashboard(
  _commercialId: string
): Promise<CommercialDashboard> {
  // Simuler un délai réseau
  await new Promise((resolve) => setTimeout(resolve, 300));

  const objectives: CommercialObjectives = {
    monthly: { target: 45000, current: 30150, percent: 67 },
    quarterly: { target: 135000, current: 98450, percent: 73 },
    newClients: { target: 5, current: 3 },
  };

  const today: TodayStats = {
    visitsPlanned: 5,
    visitsCompleted: 2,
    ordersCreated: 2,
    ordersAmount: 1240,
    callsMade: 8,
  };

  // Collecter toutes les alertes des clients
  const allAlerts = MOCK_CLIENTS.flatMap((c) => c.alerts);
  const overdueInvoices: InvoiceAlert[] = [
    {
      id: 'inv1',
      invoiceNumber: 'F-892',
      clientId: 'c1',
      clientName: 'Brooklyn Burger',
      amount: 890,
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      daysOverdue: 15,
    },
  ];

  const opportunities: AIOpportunity[] = [
    {
      id: 'opp1',
      type: 'route',
      title: 'Tournée optimisée',
      description:
        '3 clients dans ta zone n\'ont pas commandé cette semaine. Tournée optimale : 45min, 12km',
      impact: 'Potentiel 2 500€',
      clientIds: ['c3', 'c4', 'c5'],
      confidence: 'high',
    },
    {
      id: 'opp2',
      type: 'prospect',
      title: 'Prospect à proximité',
      description: 'Pizza Napoli (score 85) est à 200m de ta position',
      confidence: 'high',
    },
  ];

  const recentActivity: Activity[] = [
    {
      id: 'act1',
      type: 'order',
      clientId: 'c2',
      clientName: 'Napoli Pizza',
      description: 'Commande validée',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      amount: 458,
    },
    {
      id: 'act2',
      type: 'call',
      clientId: 'c1',
      clientName: 'Brooklyn Burger',
      description: 'Appel relance facture',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: 'act3',
      type: 'visit',
      clientId: 'c5',
      clientName: 'Fast Chicken',
      description: 'Visite commerciale',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  return {
    objectives,
    today,
    alerts: {
      clientsToCall: allAlerts.filter(
        (a) => a.type === 'inactive' || a.type === 'at_risk'
      ),
      overdueInvoices,
      behaviorAlerts: allAlerts.filter((a) => a.type === 'behavior_change'),
      opportunities,
      total: allAlerts.length + overdueInvoices.length,
    },
    recentActivity,
    suggestions: opportunities,
  };
}

/**
 * Récupère la liste des clients du commercial
 */
export async function getMyClients(
  _commercialId: string,
  filters?: ClientFilters
): Promise<CommercialClient[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let clients = [...MOCK_CLIENTS];

  // Filtrer par statut
  if (filters?.status && filters.status !== 'all') {
    clients = clients.filter((c) => c.status === filters.status);
  }

  // Recherche
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    clients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.type.toLowerCase().includes(search)
    );
  }

  // Tri
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case 'revenue':
        clients.sort((a, b) => b.yearlyRevenue - a.yearlyRevenue);
        break;
      case 'lastOrder':
        clients.sort(
          (a, b) => (a.daysSinceLastOrder || 999) - (b.daysSinceLastOrder || 999)
        );
        break;
      case 'alerts':
        clients.sort((a, b) => b.alerts.length - a.alerts.length);
        break;
      case 'name':
        clients.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  return clients;
}

/**
 * Récupère les détails d'un client
 */
export async function getClientDetails(
  clientId: string
): Promise<CommercialClient | null> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return MOCK_CLIENTS.find((c) => c.id === clientId) || null;
}

/**
 * Récupère les produits habituels d'un client
 */
export async function getUsualProducts(_clientId: string): Promise<UsualProduct[]> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return MOCK_USUAL_PRODUCTS;
}

/**
 * Récupère les données pour une commande rapide
 */
export async function getQuickOrderData(_clientId: string) {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const client = MOCK_CLIENTS.find((c) => c.id === _clientId);
  const usualProducts = MOCK_USUAL_PRODUCTS;

  // Calculer la remise client basée sur la grille tarifaire
  const discountByGrid: Record<string, number> = {
    standard: 0,
    premium: 5,
    gold: 10,
    vip: 15,
  };

  return {
    client,
    usualProducts,
    clientDiscount: discountByGrid[client?.priceGrid || 'standard'],
    deliverySlots: [
      { id: 'tomorrow_am', label: 'Demain matin (8h-12h)' },
      { id: 'tomorrow_pm', label: 'Demain après-midi (14h-18h)' },
      { id: 'day_after', label: 'Après-demain matin' },
    ],
  };
}

/**
 * Crée une commande rapide
 */
export async function createQuickOrder(
  _clientId: string,
  _commercialId: string,
  items: QuickOrderItem[],
  _options: {
    deliverySlot: string;
    notes?: string;
  }
): Promise<{ orderId: string; total: number }> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const total = items.reduce((sum, item) => sum + item.total, 0);

  // Simuler la création
  const orderId = `ORD-${Date.now()}`;

  return { orderId, total };
}

/**
 * Récupère les prospects du commercial
 */
export async function getMyProspects(_commercialId: string) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_PROSPECTS;
}

/**
 * Optimise une tournée
 */
export async function optimizeRoute(
  _startLocation: { lat: number; lng: number },
  stops: { id: string; lat: number; lng: number; name: string; type: 'client' | 'prospect' }[],
  _options?: { includeReturn?: boolean }
): Promise<OptimizedRoute> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Simulation d'optimisation (dans la vraie app, appeler OSRM)
  const orderedStops: RouteStop[] = stops.map((stop, index) => ({
    id: stop.id,
    name: stop.name,
    type: stop.type,
    address: 'Marseille',
    lat: stop.lat,
    lng: stop.lng,
    distanceFromPrev: index === 0 ? 2.5 : 1.5 + Math.random() * 3,
    durationFromPrev: index === 0 ? 10 : 5 + Math.floor(Math.random() * 10),
    priority: index < 2 ? 'high' : 'medium',
  }));

  const totalDistance = orderedStops.reduce(
    (sum, s) => sum + (s.distanceFromPrev || 0),
    0
  );
  const totalDuration = orderedStops.reduce(
    (sum, s) => sum + (s.durationFromPrev || 0),
    0
  );

  return {
    orderedStops,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDuration: Math.round(totalDuration),
    savings: {
      distance: 8.5,
      duration: 45,
      percentSaved: 35,
    },
  };
}

/**
 * Récupère les statistiques du commercial
 */
export async function getCommercialStats(
  _commercialId: string,
  period: 'month' | 'quarter' | 'year' = 'month'
) {
  await new Promise((resolve) => setTimeout(resolve, 250));

  return {
    revenue: {
      current: period === 'month' ? 30150 : period === 'quarter' ? 98450 : 380000,
      target: period === 'month' ? 45000 : period === 'quarter' ? 135000 : 500000,
      previousPeriod:
        period === 'month' ? 28500 : period === 'quarter' ? 92000 : 350000,
      growth: 5.8,
    },
    orders: {
      count: period === 'month' ? 47 : period === 'quarter' ? 142 : 520,
      avgBasket: 641,
      conversionRate: 68,
    },
    clients: {
      total: 23,
      active: 18,
      atRisk: 3,
      inactive: 2,
      newThisPeriod: 3,
    },
    visits: {
      completed: period === 'month' ? 35 : period === 'quarter' ? 98 : 380,
      planned: period === 'month' ? 40 : period === 'quarter' ? 120 : 450,
      successRate: 87,
    },
    ranking: {
      position: 2,
      total: 8,
      trend: 'up',
    },
  };
}

/**
 * Récupère l'agenda du commercial
 */
export async function getCommercialAgenda(
  _commercialId: string,
  _startDate: Date,
  _endDate: Date
) {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const events = [
    {
      id: 'ev1',
      type: 'visit',
      title: 'Visite Brooklyn Burger',
      clientId: 'c1',
      clientName: 'Brooklyn Burger',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000),
      end: new Date(Date.now() + 3 * 60 * 60 * 1000),
      notes: 'Récupérer paiement facture',
      priority: 'high',
    },
    {
      id: 'ev2',
      type: 'call',
      title: 'Appel Kebab Istanbul',
      clientId: 'c3',
      clientName: 'Kebab Istanbul',
      start: new Date(Date.now() + 4 * 60 * 60 * 1000),
      notes: 'Proposer promo cheddar',
      priority: 'medium',
    },
    {
      id: 'ev3',
      type: 'meeting',
      title: 'RDV Pizza Napoli',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
      notes: 'Premier contact - prospect score 85',
      priority: 'high',
    },
  ];

  const tasks = [
    {
      id: 'task1',
      title: 'Relancer devis Fast Chicken',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completed: false,
      priority: 'medium',
    },
    {
      id: 'task2',
      title: 'Envoyer catalogue Tacos Avenue',
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
      completed: false,
      priority: 'low',
    },
  ];

  return { events, tasks };
}

/**
 * Enregistre une visite
 */
export async function logVisit(
  _commercialId: string,
  _clientId: string,
  _data: {
    type: 'visit' | 'call' | 'email';
    notes?: string;
    outcome?: 'positive' | 'neutral' | 'negative';
    nextAction?: string;
    nextActionDate?: Date;
  }
) {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true, activityId: `act-${Date.now()}` };
}

/**
 * Ajoute une note à un client
 */
export async function addClientNote(
  _commercialId: string,
  _clientId: string,
  _note: string
) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { success: true, noteId: `note-${Date.now()}` };
}
