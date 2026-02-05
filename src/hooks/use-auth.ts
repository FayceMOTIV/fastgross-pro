"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import {
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthChange,
  resetPassword,
  changePassword,
  updateUserProfile,
  updateFCMToken,
  hasRole,
  isAdmin,
} from "@/services/auth-service";
import { requestNotificationPermission } from "@/services/notifications-service";
import type { User, UserRole } from "@/types";
import { Permission, ROLE_PERMISSIONS, MODE_CONFIGS } from "@/types/roles";

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } = useAuthStore();

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setUser(authUser);

      // Request notification permission and update FCM token if logged in
      if (authUser) {
        const token = await requestNotificationPermission();
        if (token) {
          await updateFCMToken(authUser.id, token);
        }
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  // Sign in
  const signIn = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      setLoading(true);
      try {
        const authUser = await authSignIn(email, password);
        setUser(authUser);
        return authUser;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [setUser, setLoading]
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }, [logout, router]);

  // Request password reset
  const requestPasswordReset = useCallback(async (email: string) => {
    await resetPassword(email);
  }, []);

  // Change password
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await changePassword(currentPassword, newPassword);
    },
    []
  );

  // Update profile
  const updateProfile = useCallback(
    async (data: Partial<Pick<User, "displayName" | "telephone" | "avatar">>) => {
      if (!user) throw new Error("No user logged in");
      await updateUserProfile(user.id, data);
      setUser({ ...user, ...data });
    },
    [user, setUser]
  );

  // Check if user has role
  const checkRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      return hasRole(user, roles);
    },
    [user]
  );

  // Check if user is admin
  const checkIsAdmin = useCallback((): boolean => {
    return isAdmin(user);
  }, [user]);

  // Get user permissions based on role
  const getUserPermissions = useCallback((): Permission[] => {
    if (!user?.role) return [];
    return ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
  }, [user]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      const permissions = getUserPermissions();
      return permissions.includes(permission);
    },
    [getUserPermissions]
  );

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      const userPermissions = getUserPermissions();
      return permissions.some((p) => userPermissions.includes(p));
    },
    [getUserPermissions]
  );

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      const userPermissions = getUserPermissions();
      return permissions.every((p) => userPermissions.includes(p));
    },
    [getUserPermissions]
  );

  // Get the home path for the current user's role
  const getHomePath = useCallback((): string => {
    if (!user?.role) return "/login";
    const config = MODE_CONFIGS[user.role as keyof typeof MODE_CONFIGS];
    return config?.homePath || "/";
  }, [user]);

  // Check if user can access a specific path
  const canAccessPath = useCallback(
    (path: string): boolean => {
      if (!user?.role) return false;
      const config = MODE_CONFIGS[user.role as keyof typeof MODE_CONFIGS];
      if (!config) return false;
      if (config.allowedPaths.includes("*")) return true;
      return config.allowedPaths.some(
        (p) => path === p || path.startsWith(`${p}/`)
      );
    },
    [user]
  );

  return {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    updateProfile,
    checkRole,
    checkIsAdmin,
    // New permission-based methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getHomePath,
    canAccessPath,
    permissions: getUserPermissions(),
  };
}

// Hook for protected routes
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User doesn't have required role, redirect to their home path
        const config = MODE_CONFIGS[user.role as keyof typeof MODE_CONFIGS];
        const homePath = config?.homePath || "/";
        router.push(homePath);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  return { user, isLoading };
}

// Hook for checking permissions in components
export function usePermission(permission: Permission): boolean {
  const { user } = useAuthStore();
  if (!user?.role) return false;
  const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
  return permissions.includes(permission);
}

// Hook for getting the user's mode configuration
export function useUserMode() {
  const { user } = useAuthStore();
  const role = user?.role as keyof typeof MODE_CONFIGS | undefined;
  const config = role ? MODE_CONFIGS[role] : null;
  const permissions = role ? ROLE_PERMISSIONS[role] : [];

  return {
    role,
    config,
    permissions,
    isDesktop: config?.layout === "desktop",
    isMobile: config?.layout === "mobile",
    isResponsive: config?.layout === "responsive",
    showSidebar: config?.showSidebar ?? false,
    showBottomNav: config?.showBottomNav ?? false,
    homePath: config?.homePath ?? "/",
  };
}
