/**
 * usePermissions Hook
 * Easy permission checking for components
 */

import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook for checking permissions in components
 */
export function usePermissions() {
  const { can, canAction, isRoleAtLeast, currentRole, roleInfo, ROLES, PERMISSIONS } = useOrg()
  const { isAuthenticated } = useAuth()

  return {
    // Quick permission checks
    can,
    canAction,
    isRoleAtLeast,

    // Role info
    currentRole,
    roleInfo,
    isAuthenticated,

    // Common permission shortcuts
    canManageTeam: can('team:manage'),
    canInviteMembers: can('team:invite'),
    canManageSettings: can('settings:update'),
    canManageIntegrations: can('integrations:manage'),
    canViewAnalytics: can('analytics:read'),
    canExportData: can('analytics:export'),

    // Prospect permissions
    canCreateProspects: can('prospects:create'),
    canEditProspects: can('prospects:update'),
    canDeleteProspects: can('prospects:delete'),
    canExportProspects: can('prospects:export'),
    canImportProspects: can('prospects:import'),

    // Sequence permissions
    canCreateSequences: can('sequences:create'),
    canEditSequences: can('sequences:update'),
    canDeleteSequences: can('sequences:delete'),
    canActivateSequences: can('sequences:activate'),

    // Template permissions
    canCreateTemplates: can('templates:create'),
    canEditTemplates: can('templates:update'),
    canDeleteTemplates: can('templates:delete'),

    // Channel permissions
    canConfigureChannels: can('channels:configure'),

    // Role checks
    isOwner: currentRole === 'owner',
    isAdmin: isRoleAtLeast('admin'),
    isManager: isRoleAtLeast('manager'),
    isMember: isRoleAtLeast('member'),
    isViewer: currentRole === 'viewer',

    // Static exports
    ROLES,
    PERMISSIONS,
  }
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission(WrappedComponent, requiredPermission) {
  return function PermissionWrapper(props) {
    const { can } = usePermissions()

    if (!can(requiredPermission)) {
      return null
    }

    return <WrappedComponent {...props} />
  }
}

/**
 * Component for conditional rendering based on permissions
 */
export function RequirePermission({ permission, role, fallback = null, children }) {
  const { can, isRoleAtLeast } = usePermissions()

  if (permission && !can(permission)) {
    return fallback
  }

  if (role && !isRoleAtLeast(role)) {
    return fallback
  }

  return children
}

/**
 * Component that shows content only for specific roles
 */
export function RoleGuard({ minRole, fallback = null, children }) {
  const { isRoleAtLeast } = usePermissions()

  if (!isRoleAtLeast(minRole)) {
    return fallback
  }

  return children
}

export default usePermissions
