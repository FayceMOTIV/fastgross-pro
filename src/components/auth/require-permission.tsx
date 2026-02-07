'use client';

import { ComponentType } from 'react';

interface RequirePermissionProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * RequirePermission - DÉSACTIVÉ TEMPORAIREMENT
 * Laisse passer tout le monde sans vérification
 */
export function RequirePermission({ children }: RequirePermissionProps) {
  return <>{children}</>;
}

/**
 * ShowIfPermission - DÉSACTIVÉ TEMPORAIREMENT
 */
export function ShowIfPermission({
  children,
}: Omit<RequirePermissionProps, 'fallback' | 'redirectTo'>) {
  return <>{children}</>;
}

/**
 * HOC withPermission - DÉSACTIVÉ TEMPORAIREMENT
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  _requiredPermission: string
) {
  return function ProtectedComponent(props: P) {
    return <Component {...props} />;
  };
}

/**
 * HOC withRole - DÉSACTIVÉ TEMPORAIREMENT
 */
export function withRole<P extends object>(
  Component: ComponentType<P>,
  _allowedRoles: string[]
) {
  return function ProtectedComponent(props: P) {
    return <Component {...props} />;
  };
}

/**
 * Hook usePermissions - DÉSACTIVÉ TEMPORAIREMENT
 * Retourne un utilisateur fictif avec toutes les permissions
 */
export function usePermissions() {
  return {
    user: { role: 'admin', displayName: 'Demo User' },
    role: 'admin' as const,
    permissions: ['*'],
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    isRole: () => true,
    isAnyRole: () => true,
    canAccess: () => true,
  };
}

/**
 * AccessDenied - DÉSACTIVÉ (ne devrait jamais s'afficher)
 */
export function AccessDenied() {
  return null;
}
