'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { UserRole, MODE_CONFIGS } from '@/types/roles';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * AuthGuard - Protège les routes nécessitant une authentification
 *
 * Usage:
 * <AuthGuard>
 *   {children} // Requiert juste d'être connecté
 * </AuthGuard>
 *
 * <AuthGuard allowedRoles={['admin', 'commercial']}>
 *   {children} // Requiert un rôle spécifique
 * </AuthGuard>
 */
export function AuthGuard({
  children,
  allowedRoles,
  requireAuth = true,
  redirectTo = '/login',
}: AuthGuardProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    // Si l'authentification est requise et l'utilisateur n'est pas connecté
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Si des rôles spécifiques sont requis
    if (allowedRoles && user) {
      const userRole = user.role as UserRole;
      if (!allowedRoles.includes(userRole)) {
        // Rediriger vers la home page du rôle de l'utilisateur
        const homeRoute = MODE_CONFIGS[userRole]?.homePath || '/';
        router.push(homeRoute);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, requireAuth, redirectTo, router]);

  // Affichage pendant le chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'authentification est requise mais l'utilisateur n'est pas connecté
  if (requireAuth && !isAuthenticated) {
    return null; // Le useEffect va rediriger
  }

  // Vérification des rôles
  if (allowedRoles && user) {
    const userRole = user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return null; // Le useEffect va rediriger
    }
  }

  return <>{children}</>;
}

/**
 * GuestGuard - Pour les pages accessibles uniquement aux utilisateurs non connectés (login, register)
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // Rediriger vers la home page du rôle
      const userRole = user.role as UserRole;
      const homeRoute = MODE_CONFIGS[userRole]?.homePath || '/';
      router.push(homeRoute);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Le useEffect va rediriger
  }

  return <>{children}</>;
}

export default AuthGuard;
