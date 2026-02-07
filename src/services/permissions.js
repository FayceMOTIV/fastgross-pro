/**
 * RBAC Permission System v2.0
 * Role hierarchy: owner > admin > manager > member > viewer
 */

// Role definitions with hierarchy levels
export const ROLES = {
  owner: {
    level: 100,
    label: 'Proprietaire',
    description: 'Controle total, facturation, suppression',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  admin: {
    level: 80,
    label: 'Administrateur',
    description: 'Gestion equipe, integrations, parametres',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  manager: {
    level: 60,
    label: 'Manager',
    description: 'Gestion prospects, sequences, templates',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  member: {
    level: 40,
    label: 'Membre',
    description: 'Creation et modification, pas de suppression',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
  },
  viewer: {
    level: 20,
    label: 'Observateur',
    description: 'Lecture seule, aucune modification',
    color: 'text-dark-400',
    bg: 'bg-dark-800',
    border: 'border-dark-700',
  },
}

// Permission definitions
export const PERMISSIONS = {
  // Organization
  'org:read': { minRole: 'viewer', label: 'Voir organisation' },
  'org:update': { minRole: 'admin', label: 'Modifier organisation' },
  'org:delete': { minRole: 'owner', label: 'Supprimer organisation' },
  'org:billing': { minRole: 'owner', label: 'Gerer facturation' },

  // Team
  'team:read': { minRole: 'viewer', label: 'Voir equipe' },
  'team:invite': { minRole: 'admin', label: 'Inviter membres' },
  'team:manage': { minRole: 'admin', label: 'Gerer roles' },
  'team:remove': { minRole: 'owner', label: 'Supprimer membres' },

  // Prospects
  'prospects:read': { minRole: 'viewer', label: 'Voir prospects' },
  'prospects:create': { minRole: 'member', label: 'Creer prospects' },
  'prospects:update': { minRole: 'member', label: 'Modifier prospects' },
  'prospects:delete': { minRole: 'manager', label: 'Supprimer prospects' },
  'prospects:export': { minRole: 'manager', label: 'Exporter prospects' },
  'prospects:import': { minRole: 'member', label: 'Importer prospects' },

  // Templates
  'templates:read': { minRole: 'viewer', label: 'Voir templates' },
  'templates:create': { minRole: 'member', label: 'Creer templates' },
  'templates:update': { minRole: 'member', label: 'Modifier templates' },
  'templates:delete': { minRole: 'manager', label: 'Supprimer templates' },

  // Sequences
  'sequences:read': { minRole: 'viewer', label: 'Voir sequences' },
  'sequences:create': { minRole: 'member', label: 'Creer sequences' },
  'sequences:update': { minRole: 'member', label: 'Modifier sequences' },
  'sequences:delete': { minRole: 'manager', label: 'Supprimer sequences' },
  'sequences:activate': { minRole: 'member', label: 'Activer sequences' },

  // Interactions
  'interactions:read': { minRole: 'viewer', label: 'Voir interactions' },
  'interactions:create': { minRole: 'member', label: 'Creer interactions' },
  'interactions:update': { minRole: 'member', label: 'Modifier interactions' },

  // Channels
  'channels:read': { minRole: 'viewer', label: 'Voir canaux' },
  'channels:configure': { minRole: 'admin', label: 'Configurer canaux' },

  // Integrations
  'integrations:read': { minRole: 'admin', label: 'Voir integrations' },
  'integrations:manage': { minRole: 'admin', label: 'Gerer integrations' },

  // Settings
  'settings:read': { minRole: 'viewer', label: 'Voir parametres' },
  'settings:update': { minRole: 'admin', label: 'Modifier parametres' },

  // Analytics
  'analytics:read': { minRole: 'viewer', label: 'Voir analytics' },
  'analytics:export': { minRole: 'manager', label: 'Exporter analytics' },

  // Audit
  'audit:read': { minRole: 'admin', label: 'Voir audit log' },
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole, permission) {
  const roleData = ROLES[userRole]
  const permData = PERMISSIONS[permission]

  if (!roleData || !permData) return false

  const minRoleData = ROLES[permData.minRole]
  if (!minRoleData) return false

  return roleData.level >= minRoleData.level
}

/**
 * Check if a role is at or above a minimum role level
 */
export function hasMinRole(userRole, minRole) {
  const roleData = ROLES[userRole]
  const minRoleData = ROLES[minRole]

  if (!roleData || !minRoleData) return false

  return roleData.level >= minRoleData.level
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role) {
  return Object.entries(PERMISSIONS)
    .filter(([_, perm]) => hasPermission(role, perm))
    .map(([key, _]) => key)
}

/**
 * Check if user can perform an action on a resource
 */
export function canPerform(userRole, action, resource) {
  const permission = `${resource}:${action}`
  return hasPermission(userRole, permission)
}

/**
 * Get role display info
 */
export function getRoleInfo(role) {
  return ROLES[role] || ROLES.viewer
}

/**
 * Get available roles for assignment (can only assign roles below own level)
 */
export function getAssignableRoles(userRole) {
  const userLevel = ROLES[userRole]?.level || 0

  return Object.entries(ROLES)
    .filter(([_, data]) => data.level < userLevel)
    .map(([key, data]) => ({ value: key, ...data }))
}

/**
 * Check if user can manage another user's role
 */
export function canManageUser(managerRole, targetRole) {
  const managerLevel = ROLES[managerRole]?.level || 0
  const targetLevel = ROLES[targetRole]?.level || 0

  // Can only manage users with lower role level
  // Admin required minimum to manage anyone
  return managerLevel >= ROLES.admin.level && managerLevel > targetLevel
}

export default {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasMinRole,
  getPermissionsForRole,
  canPerform,
  getRoleInfo,
  getAssignableRoles,
  canManageUser,
}
