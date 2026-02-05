/**
 * Service Manager - Supervision d'équipe
 * Dashboard, équipe, validations, performances, rapports
 */

// ===== TYPES =====

export interface ManagerDashboard {
  overview: {
    todayRevenue: number;
    monthRevenue: number;
    monthTarget: number;
    monthProgress: number;
    ordersToday: number;
    deliveriesToday: number;
    growthVsLastMonth: number;
  };
  team: {
    commercials: {
      total: number;
      active: number;
      onField: number;
      absent: number;
    };
    drivers: {
      total: number;
      online: number;
      delivering: number;
      paused: number;
      offline: number;
    };
  };
  alerts: {
    critical: number;
    warnings: number;
    pendingValidations: number;
  };
  topPerformers: {
    commercials: { id: string; name: string; revenue: number; target: number; percent: number }[];
    drivers: { id: string; name: string; deliveries: number; successRate: number }[];
  };
  recentIssues: Issue[];
}

export interface Issue {
  id: string;
  type: 'unpaid' | 'churn_risk' | 'delivery_failed' | 'complaint' | 'stock';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: Date;
  relatedId?: string;
  relatedType?: 'client' | 'order' | 'invoice' | 'driver';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'commercial' | 'livreur';
  status: 'active' | 'on_field' | 'delivering' | 'pause' | 'absent' | 'offline';
  zone?: string;
  vehicleId?: string;
  vehicleType?: string;
  licensePlate?: string;
  joinedAt: Date;
  todayStats: {
    visits?: number;
    orders?: number;
    revenue?: number;
    deliveries?: number;
    completed?: number;
    failed?: number;
    distance?: number;
  };
  monthStats: {
    revenue?: number;
    target?: number;
    percent?: number;
    deliveries?: number;
    successRate?: number;
    newClients?: number;
  };
  currentLocation?: { lat: number; lng: number; address?: string };
  currentTask?: string;
}

export interface TeamMemberDetails extends TeamMember {
  clients?: { total: number; active: number; atRisk: number; inactive: number };
  recentActivity: ActivityItem[];
  performanceHistory: { month: string; revenue?: number; deliveries?: number }[];
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'visit' | 'call' | 'delivery' | 'status_change';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PendingValidation {
  id: string;
  type: 'order' | 'discount' | 'new_client' | 'price_change' | 'cancellation';
  createdAt: Date;
  requestedBy: { id: string; name: string };
  data: Record<string, unknown>;
  reason?: string;
  aiSuggestion?: string;
}

export interface TeamPerformance {
  period: string;
  totalRevenue: number;
  target: number;
  progress: number;
  ordersCount: number;
  avgBasket: number;
  newClients: number;
  conversionRate: number;
  commercialRanking: {
    id: string;
    name: string;
    revenue: number;
    target: number;
    percent: number;
    orders: number;
    newClients: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  driverRanking: {
    id: string;
    name: string;
    deliveries: number;
    successRate: number;
    avgTime: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

export interface Report {
  id: string;
  type: 'weekly' | 'monthly' | 'clients_risk' | 'prospection' | 'custom';
  title: string;
  generatedAt: Date;
  period?: { start: Date; end: Date };
  downloadUrl?: string;
}

// ===== MOCK DATA =====

const mockTeamMembers: TeamMember[] = [
  {
    id: 'com-001',
    name: 'Mohamed Karim',
    email: 'mohamed.k@fastgross.pro',
    phone: '06 12 34 56 78',
    role: 'commercial',
    status: 'on_field',
    zone: 'Marseille Nord',
    joinedAt: new Date('2022-03-15'),
    todayStats: {
      visits: 3,
      orders: 2,
      revenue: 1840,
    },
    monthStats: {
      revenue: 52000,
      target: 50000,
      percent: 104,
      newClients: 3,
    },
    currentLocation: { lat: 43.3125, lng: 5.3720, address: 'Rue de la République, Marseille' },
    currentTask: 'Visite client Kebab Istanbul',
  },
  {
    id: 'com-002',
    name: 'Sarah Martin',
    email: 'sarah.m@fastgross.pro',
    phone: '06 23 45 67 89',
    role: 'commercial',
    status: 'on_field',
    zone: 'Marseille Sud',
    joinedAt: new Date('2022-06-01'),
    todayStats: {
      visits: 4,
      orders: 1,
      revenue: 920,
    },
    monthStats: {
      revenue: 48500,
      target: 50000,
      percent: 97,
      newClients: 2,
    },
    currentLocation: { lat: 43.2725, lng: 5.3934, address: 'Avenue du Prado, Marseille' },
    currentTask: 'Prospection secteur',
  },
  {
    id: 'com-003',
    name: 'Pierre Durand',
    email: 'pierre.d@fastgross.pro',
    phone: '06 34 56 78 90',
    role: 'commercial',
    status: 'absent',
    zone: 'Marseille Est',
    joinedAt: new Date('2023-01-10'),
    todayStats: {
      visits: 0,
      orders: 0,
      revenue: 0,
    },
    monthStats: {
      revenue: 28000,
      target: 50000,
      percent: 56,
      newClients: 1,
    },
  },
  {
    id: 'com-004',
    name: 'Ahmed Benali',
    email: 'ahmed.b@fastgross.pro',
    phone: '06 45 67 89 01',
    role: 'commercial',
    status: 'active',
    zone: 'Marseille Centre',
    joinedAt: new Date('2023-06-15'),
    todayStats: {
      visits: 2,
      orders: 2,
      revenue: 1560,
    },
    monthStats: {
      revenue: 41200,
      target: 50000,
      percent: 82,
      newClients: 2,
    },
    currentLocation: { lat: 43.2965, lng: 5.3698, address: 'Bureau FastGross' },
    currentTask: 'Appels prospects',
  },
  {
    id: 'drv-001',
    name: 'Karim Larbi',
    email: 'karim.l@fastgross.pro',
    phone: '06 56 78 90 12',
    role: 'livreur',
    status: 'delivering',
    vehicleId: 'VEH-001',
    vehicleType: 'Renault Master',
    licensePlate: 'AB-123-CD',
    joinedAt: new Date('2023-03-15'),
    todayStats: {
      deliveries: 8,
      completed: 6,
      failed: 0,
      distance: 28,
    },
    monthStats: {
      deliveries: 156,
      successRate: 99.2,
    },
    currentLocation: { lat: 43.2955, lng: 5.3745, address: 'Rue de la Paix, Marseille' },
    currentTask: 'Livraison Burger House',
  },
  {
    id: 'drv-002',
    name: 'Omar Sadi',
    email: 'omar.s@fastgross.pro',
    phone: '06 67 89 01 23',
    role: 'livreur',
    status: 'delivering',
    vehicleId: 'VEH-002',
    vehicleType: 'Mercedes Sprinter',
    licensePlate: 'CD-456-EF',
    joinedAt: new Date('2023-05-01'),
    todayStats: {
      deliveries: 7,
      completed: 5,
      failed: 0,
      distance: 32,
    },
    monthStats: {
      deliveries: 142,
      successRate: 98.5,
    },
    currentLocation: { lat: 43.2895, lng: 5.3912, address: 'Avenue des Fleurs, Marseille' },
    currentTask: 'Livraison Snack Gourmet',
  },
  {
    id: 'drv-003',
    name: 'Youssef Moha',
    email: 'youssef.m@fastgross.pro',
    phone: '06 78 90 12 34',
    role: 'livreur',
    status: 'pause',
    vehicleId: 'VEH-003',
    vehicleType: 'Renault Trafic',
    licensePlate: 'EF-789-GH',
    joinedAt: new Date('2023-07-15'),
    todayStats: {
      deliveries: 6,
      completed: 5,
      failed: 1,
      distance: 25,
    },
    monthStats: {
      deliveries: 138,
      successRate: 97.8,
    },
    currentTask: 'Pause déjeuner',
  },
];

const mockValidations: PendingValidation[] = [
  {
    id: 'val-001',
    type: 'order',
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    requestedBy: { id: 'com-001', name: 'Mohamed Karim' },
    data: {
      orderId: 'CMD-2024-0925',
      clientName: 'Mega Burger',
      amount: 2450,
      itemCount: 14,
      marginPercent: 14.2,
    },
    reason: 'Montant élevé (seuil: 2 000€)',
  },
  {
    id: 'val-002',
    type: 'discount',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    requestedBy: { id: 'com-002', name: 'Sarah Martin' },
    data: {
      clientName: 'Kebab du Coin',
      productName: 'Cheddar tranché 1kg',
      originalPrice: 8.90,
      proposedPrice: 7.57,
      discountPercent: 15,
      marginAfter: 6.8,
    },
    reason: 'Client inactif depuis 3 semaines',
    aiSuggestion: '-12% max pour garder 8% de marge',
  },
  {
    id: 'val-003',
    type: 'new_client',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    requestedBy: { id: 'com-001', name: 'Mohamed Karim' },
    data: {
      clientName: 'Fast Chicken',
      type: 'Fast-food',
      zone: 'Marseille Nord',
      proposedGrid: 'Standard (-10%)',
      estimatedPotential: 2000,
    },
  },
];

const mockIssues: Issue[] = [
  {
    id: 'issue-001',
    type: 'unpaid',
    severity: 'critical',
    title: '3 factures impayées > 30 jours',
    description: 'Montant total: 4 230€',
    timestamp: new Date(),
    relatedType: 'invoice',
  },
  {
    id: 'issue-002',
    type: 'churn_risk',
    severity: 'critical',
    title: '2 clients à risque de churn',
    description: 'Pizza Express et Sushi Corner - inactifs depuis 2 semaines',
    timestamp: new Date(),
    relatedType: 'client',
  },
  {
    id: 'issue-003',
    type: 'delivery_failed',
    severity: 'warning',
    title: 'Livraison échouée',
    description: 'Client absent - Tacos Factory',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    relatedType: 'order',
  },
];

// ===== HELPER =====

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== DASHBOARD =====

export async function getManagerDashboard(_managerId: string): Promise<ManagerDashboard> {
  await simulateDelay(300);

  const commercials = mockTeamMembers.filter(m => m.role === 'commercial');
  const drivers = mockTeamMembers.filter(m => m.role === 'livreur');

  return {
    overview: {
      todayRevenue: 12450,
      monthRevenue: 324000,
      monthTarget: 450000,
      monthProgress: 72,
      ordersToday: 34,
      deliveriesToday: 28,
      growthVsLastMonth: 8,
    },
    team: {
      commercials: {
        total: commercials.length,
        active: commercials.filter(c => c.status === 'active').length,
        onField: commercials.filter(c => c.status === 'on_field').length,
        absent: commercials.filter(c => c.status === 'absent').length,
      },
      drivers: {
        total: drivers.length,
        online: drivers.filter(d => ['delivering', 'active'].includes(d.status)).length,
        delivering: drivers.filter(d => d.status === 'delivering').length,
        paused: drivers.filter(d => d.status === 'pause').length,
        offline: drivers.filter(d => d.status === 'offline').length,
      },
    },
    alerts: {
      critical: mockIssues.filter(i => i.severity === 'critical').length,
      warnings: mockIssues.filter(i => i.severity === 'warning').length,
      pendingValidations: mockValidations.length,
    },
    topPerformers: {
      commercials: commercials
        .filter(c => c.monthStats.revenue)
        .sort((a, b) => (b.monthStats.revenue || 0) - (a.monthStats.revenue || 0))
        .slice(0, 3)
        .map(c => ({
          id: c.id,
          name: c.name,
          revenue: c.monthStats.revenue || 0,
          target: c.monthStats.target || 50000,
          percent: c.monthStats.percent || 0,
        })),
      drivers: drivers
        .filter(d => d.monthStats.deliveries)
        .sort((a, b) => (b.monthStats.deliveries || 0) - (a.monthStats.deliveries || 0))
        .slice(0, 3)
        .map(d => ({
          id: d.id,
          name: d.name,
          deliveries: d.monthStats.deliveries || 0,
          successRate: d.monthStats.successRate || 0,
        })),
    },
    recentIssues: mockIssues,
  };
}

// ===== ÉQUIPE =====

export async function getTeamMembers(
  _managerId: string,
  filters?: { role?: 'commercial' | 'livreur'; status?: string }
): Promise<TeamMember[]> {
  await simulateDelay(300);

  let members = [...mockTeamMembers];

  if (filters?.role) {
    members = members.filter(m => m.role === filters.role);
  }

  if (filters?.status) {
    members = members.filter(m => m.status === filters.status);
  }

  return members;
}

export async function getTeamMemberDetails(memberId: string): Promise<TeamMemberDetails | null> {
  await simulateDelay(300);

  const member = mockTeamMembers.find(m => m.id === memberId);
  if (!member) return null;

  const isCommercial = member.role === 'commercial';

  return {
    ...member,
    clients: isCommercial ? {
      total: 23,
      active: 18,
      atRisk: 3,
      inactive: 2,
    } : undefined,
    recentActivity: [
      {
        id: 'act-001',
        type: isCommercial ? 'order' : 'delivery',
        description: isCommercial
          ? 'Commande #924 (Burger House) - 458€'
          : 'Livraison effectuée - Burger House',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: 'act-002',
        type: isCommercial ? 'visit' : 'delivery',
        description: isCommercial
          ? 'Visite Kebab Istanbul'
          : 'Livraison effectuée - Pizza Express',
        timestamp: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        id: 'act-003',
        type: isCommercial ? 'order' : 'status_change',
        description: isCommercial
          ? 'Commande #923 (Pizza Express) - 612€'
          : 'Statut: En livraison',
        timestamp: new Date(Date.now() - 150 * 60 * 1000),
      },
      {
        id: 'act-004',
        type: 'status_change',
        description: 'Début de journée',
        timestamp: new Date(new Date().setHours(8, 30)),
      },
    ],
    performanceHistory: [
      { month: 'Sep', revenue: isCommercial ? 42000 : undefined, deliveries: isCommercial ? undefined : 135 },
      { month: 'Oct', revenue: isCommercial ? 45000 : undefined, deliveries: isCommercial ? undefined : 142 },
      { month: 'Nov', revenue: isCommercial ? 48000 : undefined, deliveries: isCommercial ? undefined : 148 },
      { month: 'Déc', revenue: isCommercial ? 51000 : undefined, deliveries: isCommercial ? undefined : 152 },
      { month: 'Jan', revenue: isCommercial ? (member.monthStats.revenue || 0) : undefined, deliveries: isCommercial ? undefined : (member.monthStats.deliveries || 0) },
    ],
  };
}

// ===== VALIDATIONS =====

export async function getPendingValidations(_managerId: string): Promise<PendingValidation[]> {
  await simulateDelay(200);
  return mockValidations;
}

export async function approveValidation(validationId: string, _notes?: string): Promise<void> {
  await simulateDelay(500);
  const index = mockValidations.findIndex(v => v.id === validationId);
  if (index >= 0) {
    mockValidations.splice(index, 1);
  }
}

export async function rejectValidation(validationId: string, _reason: string): Promise<void> {
  await simulateDelay(500);
  const index = mockValidations.findIndex(v => v.id === validationId);
  if (index >= 0) {
    mockValidations.splice(index, 1);
  }
}

export async function modifyAndApprove(
  validationId: string,
  _modifications: Record<string, unknown>
): Promise<void> {
  await simulateDelay(500);
  const index = mockValidations.findIndex(v => v.id === validationId);
  if (index >= 0) {
    mockValidations.splice(index, 1);
  }
}

// ===== PERFORMANCES =====

export async function getTeamPerformances(
  _managerId: string,
  _period: 'week' | 'month' | 'quarter'
): Promise<TeamPerformance> {
  await simulateDelay(400);

  const commercials = mockTeamMembers.filter(m => m.role === 'commercial');
  const drivers = mockTeamMembers.filter(m => m.role === 'livreur');

  return {
    period: 'Janvier 2024',
    totalRevenue: 324000,
    target: 450000,
    progress: 72,
    ordersCount: 892,
    avgBasket: 363,
    newClients: 12,
    conversionRate: 24,
    commercialRanking: commercials
      .map(c => ({
        id: c.id,
        name: c.name,
        revenue: c.monthStats.revenue || 0,
        target: c.monthStats.target || 50000,
        percent: c.monthStats.percent || 0,
        orders: Math.round((c.monthStats.revenue || 0) / 350),
        newClients: c.monthStats.newClients || 0,
        trend: (c.monthStats.percent || 0) >= 100 ? 'up' : (c.monthStats.percent || 0) >= 80 ? 'stable' : 'down' as 'up' | 'down' | 'stable',
      }))
      .sort((a, b) => b.revenue - a.revenue),
    driverRanking: drivers
      .map(d => ({
        id: d.id,
        name: d.name,
        deliveries: d.monthStats.deliveries || 0,
        successRate: d.monthStats.successRate || 0,
        avgTime: 18 + Math.random() * 5,
        trend: (d.monthStats.successRate || 0) >= 99 ? 'up' : (d.monthStats.successRate || 0) >= 97 ? 'stable' : 'down' as 'up' | 'down' | 'stable',
      }))
      .sort((a, b) => b.deliveries - a.deliveries),
  };
}

// ===== RAPPORTS =====

export async function getReportHistory(_managerId: string): Promise<Report[]> {
  await simulateDelay(200);

  return [
    {
      id: 'rep-001',
      type: 'weekly',
      title: 'Rapport hebdomadaire - Semaine 4',
      generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      period: {
        start: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      downloadUrl: '/reports/weekly-w4.pdf',
    },
    {
      id: 'rep-002',
      type: 'monthly',
      title: 'Rapport mensuel - Décembre 2023',
      generatedAt: new Date('2024-01-02'),
      period: {
        start: new Date('2023-12-01'),
        end: new Date('2023-12-31'),
      },
      downloadUrl: '/reports/monthly-dec2023.pdf',
    },
    {
      id: 'rep-003',
      type: 'clients_risk',
      title: 'Clients à risque - Janvier',
      generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      downloadUrl: '/reports/clients-risk-jan.pdf',
    },
  ];
}

export async function generateReport(
  _type: Report['type'],
  _params?: Record<string, unknown>
): Promise<Report> {
  await simulateDelay(2000);

  return {
    id: `rep-${Date.now()}`,
    type: 'custom',
    title: 'Rapport personnalisé',
    generatedAt: new Date(),
    downloadUrl: '/reports/custom-report.pdf',
  };
}

// ===== LABELS =====

export const TEAM_MEMBER_STATUS_LABELS: Record<TeamMember['status'], { label: string; color: string; bgColor: string }> = {
  active: { label: 'Au bureau', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  on_field: { label: 'Sur le terrain', color: 'text-green-600', bgColor: 'bg-green-100' },
  delivering: { label: 'En livraison', color: 'text-green-600', bgColor: 'bg-green-100' },
  pause: { label: 'En pause', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  absent: { label: 'Absent', color: 'text-red-600', bgColor: 'bg-red-100' },
  offline: { label: 'Hors ligne', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export const VALIDATION_TYPE_LABELS: Record<PendingValidation['type'], { label: string; icon: string }> = {
  order: { label: 'Commande', icon: '📦' },
  discount: { label: 'Remise', icon: '🏷️' },
  new_client: { label: 'Nouveau client', icon: '👤' },
  price_change: { label: 'Modification prix', icon: '💰' },
  cancellation: { label: 'Annulation', icon: '❌' },
};

export const ISSUE_TYPE_LABELS: Record<Issue['type'], { label: string; icon: string }> = {
  unpaid: { label: 'Factures impayées', icon: '💰' },
  churn_risk: { label: 'Risque de churn', icon: '⚠️' },
  delivery_failed: { label: 'Livraison échouée', icon: '🚚' },
  complaint: { label: 'Réclamation', icon: '📢' },
  stock: { label: 'Rupture de stock', icon: '📦' },
};
