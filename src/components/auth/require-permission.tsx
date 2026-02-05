'use client';

import { useEffect, ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Permission, UserRole, ROLE_PERMISSIONS, MODE_CONFIGS } from '@/types/roles';

interface RequirePermissionProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  role?: UserRole;
  roles?: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Composant pour protéger l'accès à certaines parties de l'UI
 * Basé sur les permissions ou les rôles de l'utilisateur
 */
export function RequirePermission({
  children,
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  redirectTo,
}: RequirePermissionProps) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  // Récupérer les permissions de l'utilisateur
  const userRole = user?.role as UserRole | undefined;
  const userPermissions = userRole ? ROLE_PERMISSIONS[userRole] : [];

  // Fonctions de vérification
  const hasPermission = (perm: Permission): boolean => {
    return userPermissions.includes(perm);
  };

  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some((p) => userPermissions.includes(p));
  };

  const isRole = (r: UserRole): boolean => {
    return userRole === r;
  };

  const hasAnyRole = (rs: UserRole[]): boolean => {
    return rs.some((r) => userRole === r);
  };

  useEffect(() => {
    if (!isLoading && !user && redirectTo) {
      router.push(redirectTo);
    }
  }, [isLoading, user, redirectTo, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Non connecté
  if (!user) {
    if (redirectTo) {
      return null; // Will redirect in useEffect
    }
    return <>{fallback}</>;
  }

  // Vérifier le rôle unique
  if (role && !isRole(role)) {
    return <>{fallback}</>;
  }

  // Vérifier les rôles multiples
  if (roles && !hasAnyRole(roles)) {
    return <>{fallback}</>;
  }

  // Vérifier la permission unique
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Vérifier les permissions multiples (OR logic)
  if (permissions && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Composant pour afficher/masquer du contenu basé sur les permissions
 * Ne redirige pas, affiche juste ou cache le contenu
 */
export function ShowIfPermission({
  children,
  permission,
  permissions,
  role,
  roles,
}: Omit<RequirePermissionProps, 'fallback' | 'redirectTo'>) {
  return (
    <RequirePermission
      permission={permission}
      permissions={permissions}
      role={role}
      roles={roles}
      fallback={null}
    >
      {children}
    </RequirePermission>
  );
}

/**
 * HOC pour protéger une page entière
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  requiredPermission: Permission
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();
    const userRole = user?.role as UserRole | undefined;
    const userPermissions = userRole ? ROLE_PERMISSIONS[userRole] : [];

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      } else if (!isLoading && user && !userPermissions.includes(requiredPermission)) {
        // Rediriger vers la home du rôle
        const homeRoute = userRole ? MODE_CONFIGS[userRole].homePath : '/';
        router.push(homeRoute);
      }
    }, [isLoading, user, userPermissions, userRole, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Chargement...</div>
        </div>
      );
    }

    if (!user || !userPermissions.includes(requiredPermission)) {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC pour protéger une page par rôle
 */
export function withRole<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();
    const userRole = user?.role as UserRole | undefined;

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      } else if (!isLoading && user && userRole && !allowedRoles.includes(userRole)) {
        // Rediriger vers la home du rôle
        const homeRoute = MODE_CONFIGS[userRole].homePath;
        router.push(homeRoute);
      }
    }, [isLoading, user, userRole, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Chargement...</div>
        </div>
      );
    }

    if (!user || !userRole || !allowedRoles.includes(userRole)) {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Hook pour vérifier les permissions dans les composants
 */
export function usePermissions() {
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole | undefined;
  const userPermissions = userRole ? ROLE_PERMISSIONS[userRole] : [];

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => userPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => userPermissions.includes(p));
  };

  const isRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const isAnyRole = (roles: UserRole[]): boolean => {
    return roles.some((r) => userRole === r);
  };

  const canAccess = (path: string): boolean => {
    if (!userRole) return false;
    const config = MODE_CONFIGS[userRole];
    if (config.allowedPaths.includes('*')) return true;
    return config.allowedPaths.some(
      (p) => path === p || path.startsWith(`${p}/`)
    );
  };

  return {
    user,
    role: userRole,
    permissions: userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAnyRole,
    canAccess,
  };
}

/**
 * Composant pour afficher un message d'accès refusé
 */
export function AccessDenied({
  message = "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
  showHomeLink = true,
}: {
  message?: string;
  showHomeLink?: boolean;
}) {
  const { user } = useAuthStore();
  const userRole = user?.role as UserRole | undefined;
  const homeRoute = userRole ? MODE_CONFIGS[userRole].homePath : '/';

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
      <p className="text-muted-foreground max-w-md mb-6">{message}</p>
      {showHomeLink && (
        <a
          href={homeRoute}
          className="text-primary hover:underline font-medium"
        >
          Retourner à l'accueil
        </a>
      )}
    </div>
  );
}
