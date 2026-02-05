"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  type ClientsFilter,
} from "@/services/clients-service";
import type { Client } from "@/types";

const QUERY_KEY = "clients";

export function useClients(filters?: ClientsFilter) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () => getClients(filters, { pageSize: 50 }),
  });

  return {
    clients: data?.clients || [],
    isLoading,
    error,
    refetch,
  };
}

export function useClient(id: string | null) {
  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => (id ? getClientById(id) : null),
    enabled: !!id,
  });

  return {
    client,
    isLoading,
    error,
  };
}

export function useClientStats(commercialId?: string) {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, "stats", commercialId],
    queryFn: () => getClientStats(commercialId),
  });

  return {
    stats: stats || { total: 0, active: 0, prospect: 0, inactive: 0 },
    isLoading,
    error,
  };
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    createClient: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      updateClient(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });

  return {
    updateClient: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    deleteClient: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Combined hook for full CRUD operations
export function useClientsCRUD(initialFilters?: ClientsFilter) {
  const [filters, setFilters] = useState<ClientsFilter>(initialFilters || {});
  const { clients, isLoading, error, refetch } = useClients(filters);
  const { createClient, isLoading: isCreating } = useCreateClient();
  const { updateClient, isLoading: isUpdating } = useUpdateClient();
  const { deleteClient, isLoading: isDeleting } = useDeleteClient();
  const { stats } = useClientStats();

  const handleSearch = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleFilterStatus = useCallback((status: Client["status"] | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const handleFilterType = useCallback((type: Client["type"] | undefined) => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  return {
    clients,
    stats,
    filters,
    isLoading: isLoading || isCreating || isUpdating || isDeleting,
    error,
    refetch,
    createClient,
    updateClient: (id: string, data: Partial<Client>) => updateClient({ id, data }),
    deleteClient,
    handleSearch,
    handleFilterStatus,
    handleFilterType,
  };
}
