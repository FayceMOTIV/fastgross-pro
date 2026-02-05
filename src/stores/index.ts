import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Client, Order, DriverLocation, Notification, DashboardStats } from '@/types';

// Auth Store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);

// Dashboard Store
interface DashboardState {
  stats: DashboardStats | null;
  recentOrders: Order[];
  recentClients: Client[];
  isLoading: boolean;
  setStats: (stats: DashboardStats) => void;
  setRecentOrders: (orders: Order[]) => void;
  setRecentClients: (clients: Client[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  stats: null,
  recentOrders: [],
  recentClients: [],
  isLoading: true,
  setStats: (stats) => set({ stats }),
  setRecentOrders: (recentOrders) => set({ recentOrders }),
  setRecentClients: (recentClients) => set({ recentClients }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Tracking Store (GPS)
interface TrackingState {
  drivers: Record<string, DriverLocation>;
  selectedDriver: string | null;
  isTracking: boolean;
  updateDriver: (id: string, location: DriverLocation) => void;
  removeDriver: (id: string) => void;
  selectDriver: (id: string | null) => void;
  setTracking: (tracking: boolean) => void;
  clearDrivers: () => void;
}

export const useTrackingStore = create<TrackingState>()((set) => ({
  drivers: {},
  selectedDriver: null,
  isTracking: false,
  updateDriver: (id, location) =>
    set((state) => ({
      drivers: { ...state.drivers, [id]: location },
    })),
  removeDriver: (id) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.drivers;
      return { drivers: rest };
    }),
  selectDriver: (selectedDriver) => set({ selectedDriver }),
  setTracking: (isTracking) => set({ isTracking }),
  clearDrivers: () => set({ drivers: {} }),
}));

// Notifications Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setNotifications: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
}));

// Chat Store
interface ChatState {
  activeChannel: string | null;
  unreadMessages: Record<string, number>;
  setActiveChannel: (channelId: string | null) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  activeChannel: null,
  unreadMessages: {},
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  incrementUnread: (channelId) =>
    set((state) => ({
      unreadMessages: {
        ...state.unreadMessages,
        [channelId]: (state.unreadMessages[channelId] || 0) + 1,
      },
    })),
  clearUnread: (channelId) =>
    set((state) => ({
      unreadMessages: { ...state.unreadMessages, [channelId]: 0 },
    })),
}));

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        return { theme: newTheme };
      }),
    }),
    { name: 'ui-storage' }
  )
);
