'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAll,
  getById,
  create,
  update,
  remove,
  subscribeToCollection,
  COLLECTIONS
} from '@/services/firebase/firestore';

interface UseFirestoreState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

interface UseFirestoreOptions {
  realtime?: boolean;
  filters?: { field: string; operator: any; value: any }[];
}

export function useFirestoreCollection<T>(
  collectionName: string,
  options: UseFirestoreOptions = {}
) {
  const [state, setState] = useState<UseFirestoreState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const { realtime = false, filters } = options;

  useEffect(() => {
    if (realtime) {
      // Mode temps réel avec listener
      const unsubscribe = subscribeToCollection<T>(
        collectionName,
        (data) => {
          setState({ data, loading: false, error: null });
        },
        filters
      );
      return () => unsubscribe();
    } else {
      // Mode one-shot
      const fetchData = async () => {
        try {
          const data = await getAll<T>(collectionName);
          setState({ data, loading: false, error: null });
        } catch (error: any) {
          setState({ data: [], loading: false, error: error.message });
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, realtime]);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await getAll<T>(collectionName);
      setState({ data, loading: false, error: null });
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, [collectionName]);

  const add = useCallback(async (data: Omit<T, 'id'>) => {
    try {
      const id = await create(collectionName, data as any);
      if (!realtime) await refresh();
      return id;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [collectionName, realtime, refresh]);

  const updateItem = useCallback(async (id: string, data: Partial<T>) => {
    try {
      await update(collectionName, id, data as any);
      if (!realtime) await refresh();
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [collectionName, realtime, refresh]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await remove(collectionName, id);
      if (!realtime) await refresh();
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, [collectionName, realtime, refresh]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refresh,
    add,
    update: updateItem,
    delete: deleteItem,
  };
}

export function useFirestoreDocument<T>(collectionName: string, docId: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const doc = await getById<T>(collectionName, docId);
        setData(doc);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionName, docId]);

  const updateDoc = useCallback(async (data: Partial<T>) => {
    if (!docId) return;
    try {
      await update(collectionName, docId, data as any);
      setData(prev => prev ? { ...prev, ...data } : null);
    } catch (err: any) {
      throw new Error(err.message);
    }
  }, [collectionName, docId]);

  const deleteDoc = useCallback(async () => {
    if (!docId) return;
    try {
      await remove(collectionName, docId);
      setData(null);
    } catch (err: any) {
      throw new Error(err.message);
    }
  }, [collectionName, docId]);

  return { data, loading, error, update: updateDoc, delete: deleteDoc };
}

// Hook spécialisé pour les clients
export function useClients(options?: UseFirestoreOptions) {
  return useFirestoreCollection<any>(COLLECTIONS.CLIENTS, options);
}

// Hook spécialisé pour les commandes
export function useOrders(options?: UseFirestoreOptions) {
  return useFirestoreCollection<any>(COLLECTIONS.ORDERS, options);
}

// Hook spécialisé pour les produits
export function useProducts(options?: UseFirestoreOptions) {
  return useFirestoreCollection<any>(COLLECTIONS.PRODUCTS, options);
}

// Hook spécialisé pour les alertes
export function useAlerts(options?: UseFirestoreOptions) {
  return useFirestoreCollection<any>(COLLECTIONS.ALERTS, { realtime: true, ...options });
}
