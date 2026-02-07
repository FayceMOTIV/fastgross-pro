'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  // getLivreurPosition,
  updateLivreurPosition,
  subscribeToAllPositions,
  subscribeToLivreurPosition,
  updateDeliveryStatus,
  LivreurPosition
} from '@/services/firebase/realtime';

// Hook pour suivre tous les livreurs
export function useAllLivreurs() {
  const [positions, setPositions] = useState<Record<string, LivreurPosition>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAllPositions((data) => {
      setPositions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const livreursActifs = Object.values(positions).filter(
    p => p.status !== 'termine' && Date.now() - p.timestamp < 5 * 60 * 1000 // Actif si update < 5min
  );

  return {
    positions,
    livreursActifs,
    loading,
    count: livreursActifs.length,
  };
}

// Hook pour suivre un livreur spécifique
export function useLivreur(livreurId: string | null) {
  const [position, setPosition] = useState<LivreurPosition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!livreurId) {
      setPosition(null);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToLivreurPosition(livreurId, (data) => {
      setPosition(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [livreurId]);

  return { position, loading };
}

// Hook pour un livreur qui partage sa position
export function useLivreurTracking(livreurId: string, livreurNom: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await updateLivreurPosition(livreurId, {
            id: livreurId,
            nom: livreurNom,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            status: 'en_route',
          });
          setError(null);
        } catch {
          setError('Erreur de mise à jour position');
        }
      },
      (_err) => {
        setError(`Erreur GPS: ${_err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  }, [livreurId, livreurNom]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  const updateStatus = useCallback(async (status: LivreurPosition['status'], currentDelivery?: string) => {
    try {
      await updateLivreurPosition(livreurId, { status, currentDelivery });
    } catch {
      setError('Erreur de mise à jour statut');
    }
  }, [livreurId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    isTracking,
    error,
    startTracking,
    stopTracking,
    updateStatus,
  };
}

// Hook pour gérer le statut d'une livraison
export function useDeliveryStatus(deliveryId: string) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback(async (status: 'en_attente' | 'en_cours' | 'livree' | 'probleme') => {
    setUpdating(true);
    setError(null);
    try {
      await updateDeliveryStatus(deliveryId, status);
    } catch {
      setError('Erreur de mise à jour');
    } finally {
      setUpdating(false);
    }
  }, [deliveryId]);

  return { setStatus, updating, error };
}
