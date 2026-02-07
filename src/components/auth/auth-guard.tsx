'use client';

import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * AuthGuard - DÉSACTIVÉ TEMPORAIREMENT
 * Laisse passer tout le monde sans vérification
 */
export function AuthGuard({
  children,
}: AuthGuardProps) {
  // Auth désactivée - on affiche directement les enfants
  return <>{children}</>;
}

/**
 * GuestGuard - DÉSACTIVÉ TEMPORAIREMENT
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default AuthGuard;
