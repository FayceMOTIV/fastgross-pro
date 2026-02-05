"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  assignDriver,
  getOrderStats,
  getOrdersByDeliveryDate,
  type OrdersFilter,
} from "@/services/orders-service";
import type { Order, OrderStatus } from "@/types";

const QUERY_KEY = "orders";

export function useOrders(filters?: OrdersFilter) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => getOrders(filters, { pageSize: 50 }),
  });

  return {
    orders: data?.orders || [],
    isLoading,
    error,
    refetch,
  };
}

export function useOrder(id: string | null) {
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => (id ? getOrderById(id) : null),
    enabled: !!id,
  });

  return {
    order,
    isLoading,
    error,
  };
}

export function useOrderStats(dateFrom?: Date) {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, "stats", dateFrom?.toISOString()],
    queryFn: () => getOrderStats(dateFrom),
  });

  return {
    stats: stats || { total: 0, pending: 0, delivering: 0, delivered: 0, revenue: 0 },
    isLoading,
    error,
  };
}

export function useTodayOrders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, "today", today.toISOString()],
    queryFn: () => getOrdersByDeliveryDate(today),
  });

  return {
    orders: orders || [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    createOrder: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      updateOrder(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });

  return {
    updateOrder: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    deleteOrder: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });

  return {
    updateStatus: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useAssignDriver() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      assignDriver(orderId, driverId),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orderId] });
    },
  });

  return {
    assignDriver: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Combined hook for full order management
export function useOrdersCRUD(initialFilters?: OrdersFilter) {
  const [filters, setFilters] = useState<OrdersFilter>(initialFilters || {});
  const { orders, isLoading, error, refetch } = useOrders(filters);
  const { createOrder, isLoading: isCreating } = useCreateOrder();
  const { updateOrder, isLoading: isUpdating } = useUpdateOrder();
  const { deleteOrder, isLoading: isDeleting } = useDeleteOrder();
  const { updateStatus, isLoading: isUpdatingStatus } = useUpdateOrderStatus();
  const { assignDriver, isLoading: isAssigning } = useAssignDriver();
  const { stats } = useOrderStats();

  const handleFilterStatus = useCallback((status: OrderStatus | OrderStatus[] | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const handleFilterClient = useCallback((clientId: string | undefined) => {
    setFilters((prev) => ({ ...prev, clientId }));
  }, []);

  const handleFilterDateRange = useCallback((from?: Date, to?: Date) => {
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  return {
    orders,
    stats,
    filters,
    isLoading: isLoading || isCreating || isUpdating || isDeleting || isUpdatingStatus || isAssigning,
    error,
    refetch,
    createOrder,
    updateOrder: (id: string, data: Partial<Order>) => updateOrder({ id, data }),
    deleteOrder,
    updateStatus: (id: string, status: OrderStatus) => updateStatus({ id, status }),
    assignDriver: (orderId: string, driverId: string) => assignDriver({ orderId, driverId }),
    handleFilterStatus,
    handleFilterClient,
    handleFilterDateRange,
  };
}
