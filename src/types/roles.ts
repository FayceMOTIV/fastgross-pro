/**
 * Types pour la gestion des rôles utilisateur et des permissions
 * Système de modes adaptatifs selon le poste de l'utilisateur
 */

// ===== RÔLES =====
export type UserRole = 'admin' | 'manager' | 'commercial' | 'livreur' | 'client';

export interface UserWithRole {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  permissions: Permission[];
  assignedZone?: string; // Pour commerciaux/livreurs
  assignedClients?: string[]; // Pour commerciaux
  managerId?: string; // Qui supervise cet utilisateur
  vehicleInfo?: VehicleInfo; // Pour livreurs
  isActive: boolean;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface VehicleInfo {
  type: string;
  plate: string;
  model: string;
}

// ===== PERMISSIONS =====
export type Permission =
  // Dashboard
  | 'dashboard:view'
  | 'dashboard:analytics'
  // Clients
  | 'clients:view'
  | 'clients:create'
  | 'clients:edit'
  | 'clients:delete'
  | 'clients:view_all' // Voir tous les clients (vs juste les siens)
  // Commandes
  | 'orders:view'
  | 'orders:create'
  | 'orders:edit'
  | 'orders:validate'
  | 'orders:cancel'
  // Livraisons
  | 'deliveries:view'
  | 'deliveries:assign'
  | 'deliveries:complete'
  // Prospection
  | 'prospects:view'
  | 'prospects:create'
  | 'prospects:convert'
  // Factures
  | 'invoices:view'
  | 'invoices:create'
  | 'invoices:send_reminder'
  // Paramètres
  | 'settings:view'
  | 'settings:edit'
  | 'settings:users'
  | 'settings:pricing'
  // Marketing
  | 'marketing:view'
  | 'marketing:create'
  | 'marketing:analytics'
  // Chat
  | 'chat:view'
  | 'chat:send'
  // Tracking
  | 'tracking:view'
  | 'tracking:manage';

// ===== PERMISSIONS PAR RÔLE =====
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Tout
    'dashboard:view',
    'dashboard:analytics',
    'clients:view',
    'clients:create',
    'clients:edit',
    'clients:delete',
    'clients:view_all',
    'orders:view',
    'orders:create',
    'orders:edit',
    'orders:validate',
    'orders:cancel',
    'deliveries:view',
    'deliveries:assign',
    'deliveries:complete',
    'prospects:view',
    'prospects:create',
    'prospects:convert',
    'invoices:view',
    'invoices:create',
    'invoices:send_reminder',
    'settings:view',
    'settings:edit',
    'settings:users',
    'settings:pricing',
    'marketing:view',
    'marketing:create',
    'marketing:analytics',
    'chat:view',
    'chat:send',
    'tracking:view',
    'tracking:manage',
  ],
  manager: [
    'dashboard:view',
    'dashboard:analytics',
    'clients:view',
    'clients:view_all',
    'orders:view',
    'orders:validate',
    'deliveries:view',
    'deliveries:assign',
    'prospects:view',
    'invoices:view',
    'invoices:send_reminder',
    'settings:view',
    'marketing:view',
    'marketing:analytics',
    'chat:view',
    'chat:send',
    'tracking:view',
  ],
  commercial: [
    'dashboard:view',
    'clients:view',
    'clients:create',
    'clients:edit',
    'orders:view',
    'orders:create',
    'prospects:view',
    'prospects:create',
    'prospects:convert',
    'invoices:view',
    'chat:view',
    'chat:send',
  ],
  livreur: [
    'deliveries:view',
    'deliveries:complete',
    'chat:view',
    'chat:send',
  ],
  client: [
    'orders:view',
    'orders:create',
    'invoices:view',
    'chat:view',
    'chat:send',
  ],
};

// ===== LABELS DES RÔLES =====
export const ROLE_LABELS: Record<UserRole, { label: string; icon: string; color: string }> = {
  admin: { label: 'Administrateur', icon: '👑', color: 'text-purple-600' },
  manager: { label: 'Manager', icon: '📊', color: 'text-blue-600' },
  commercial: { label: 'Commercial', icon: '👔', color: 'text-green-600' },
  livreur: { label: 'Livreur', icon: '🚚', color: 'text-orange-600' },
  client: { label: 'Client B2B', icon: '🏪', color: 'text-gray-600' },
};

// ===== CONFIG DES MODES =====
export interface ModeConfig {
  role: UserRole;
  homePath: string; // Page d'accueil du mode
  allowedPaths: string[]; // Routes autorisées
  layout: 'desktop' | 'mobile' | 'responsive';
  showSidebar: boolean;
  showBottomNav: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export const MODE_CONFIGS: Record<UserRole, ModeConfig> = {
  admin: {
    role: 'admin',
    homePath: '/',
    allowedPaths: ['*'], // Tout
    layout: 'desktop',
    showSidebar: true,
    showBottomNav: false,
  },
  manager: {
    role: 'manager',
    homePath: '/supervision',
    allowedPaths: [
      '/supervision',
      '/analytics',
      '/team',
      '/alerts',
      '/clients',
      '/orders',
      '/tracking',
      '/chat',
    ],
    layout: 'desktop',
    showSidebar: true,
    showBottomNav: false,
  },
  commercial: {
    role: 'commercial',
    homePath: '/commercial',
    allowedPaths: ['/commercial', '/commercial/*'],
    layout: 'mobile',
    showSidebar: false,
    showBottomNav: true,
  },
  livreur: {
    role: 'livreur',
    homePath: '/livreur',
    allowedPaths: ['/livreur', '/livreur/*'],
    layout: 'mobile',
    showSidebar: false,
    showBottomNav: true,
  },
  client: {
    role: 'client',
    homePath: '/portail',
    allowedPaths: ['/portail', '/portail/*'],
    layout: 'responsive',
    showSidebar: false,
    showBottomNav: true,
  },
};

// ===== ZONES GÉOGRAPHIQUES =====
export interface Zone {
  id: string;
  name: string;
  description?: string;
  postalCodes?: string[];
  isActive: boolean;
}

export const DEFAULT_ZONES: Zone[] = [
  { id: 'marseille-nord', name: 'Marseille Nord', isActive: true },
  { id: 'marseille-sud', name: 'Marseille Sud', isActive: true },
  { id: 'marseille-centre', name: 'Marseille Centre', isActive: true },
  { id: 'aix', name: 'Aix-en-Provence', isActive: true },
  { id: 'aubagne', name: 'Aubagne / La Ciotat', isActive: true },
  { id: 'vitrolles', name: 'Vitrolles / Marignane', isActive: true },
];

// ===== USER CREATION =====
export interface CreateUserData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  assignedZone?: string;
  assignedClients?: string[];
  managerId?: string;
  vehicleInfo?: VehicleInfo;
}

export interface UpdateUserData {
  displayName?: string;
  role?: UserRole;
  assignedZone?: string;
  assignedClients?: string[];
  managerId?: string;
  vehicleInfo?: VehicleInfo;
  isActive?: boolean;
}

// ===== FILTRES UTILISATEURS =====
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  zone?: string;
  search?: string;
}
