'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  loginWithEmail,
  logout as firebaseLogout,
  onAuthChange,
  resetPassword,
  AppUser
} from '@/services/firebase/auth';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setState({ user, loading: false, error: null });
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await loginWithEmail(email, password);
      setState({ user, loading: false, error: null });

      // Redirection selon le rôle
      if (user.role === 'livreur') {
        router.push('/livreur');
      } else {
        router.push('/');
      }

      return user;
    } catch (error: any) {
      const message = getErrorMessage(error.code);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await firebaseLogout();
      setState({ user: null, loading: false, error: null });
      router.push('/login');
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: 'Erreur lors de la déconnexion' }));
    }
  }, [router]);

  const sendPasswordReset = useCallback(async (email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await resetPassword(email);
      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error: any) {
      const message = getErrorMessage(error.code);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === 'admin',
    isCommercial: state.user?.role === 'commercial' || state.user?.role === 'admin',
    isLivreur: state.user?.role === 'livreur',
    login,
    logout,
    sendPasswordReset,
    clearError,
  };
}

// Messages d'erreur en français
function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé';
    case 'auth/user-not-found':
      return 'Aucun compte associé à cet email';
    case 'auth/wrong-password':
      return 'Mot de passe incorrect';
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard';
    case 'auth/network-request-failed':
      return 'Erreur réseau. Vérifiez votre connexion';
    default:
      return 'Une erreur est survenue. Réessayez';
  }
}
