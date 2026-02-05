import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  push,
  child,
  DataSnapshot
} from 'firebase/database';
import { realtimeDb } from './config';

// Chemins Realtime Database
export const REALTIME_PATHS = {
  TRACKING: 'tracking',
  LIVREURS: 'livreurs',
  POSITIONS: 'positions',
  DELIVERIES_STATUS: 'deliveries_status',
} as const;

// Position d'un livreur
export interface LivreurPosition {
  id: string;
  nom: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
  status: 'en_route' | 'livraison' | 'pause' | 'termine';
  currentDelivery?: string;
}

// Mettre à jour la position d'un livreur
export const updateLivreurPosition = async (
  livreurId: string,
  position: Partial<LivreurPosition>
): Promise<void> => {
  const positionRef = ref(realtimeDb, `${REALTIME_PATHS.POSITIONS}/${livreurId}`);
  await update(positionRef, {
    ...position,
    timestamp: Date.now(),
  });
};

// Obtenir la position d'un livreur
export const getLivreurPosition = async (livreurId: string): Promise<LivreurPosition | null> => {
  const positionRef = ref(realtimeDb, `${REALTIME_PATHS.POSITIONS}/${livreurId}`);
  const snapshot = await get(positionRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Écouter les positions de tous les livreurs
export const subscribeToAllPositions = (
  callback: (positions: Record<string, LivreurPosition>) => void
) => {
  const positionsRef = ref(realtimeDb, REALTIME_PATHS.POSITIONS);
  return onValue(positionsRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });
};

// Écouter la position d'un livreur spécifique
export const subscribeToLivreurPosition = (
  livreurId: string,
  callback: (position: LivreurPosition | null) => void
) => {
  const positionRef = ref(realtimeDb, `${REALTIME_PATHS.POSITIONS}/${livreurId}`);
  return onValue(positionRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

// Mettre à jour le statut d'une livraison
export const updateDeliveryStatus = async (
  deliveryId: string,
  status: 'en_attente' | 'en_cours' | 'livree' | 'probleme'
): Promise<void> => {
  const statusRef = ref(realtimeDb, `${REALTIME_PATHS.DELIVERIES_STATUS}/${deliveryId}`);
  await set(statusRef, {
    status,
    updatedAt: Date.now(),
  });
};

// Écouter les statuts de livraison
export const subscribeToDeliveryStatuses = (
  callback: (statuses: Record<string, { status: string; updatedAt: number }>) => void
) => {
  const statusRef = ref(realtimeDb, REALTIME_PATHS.DELIVERIES_STATUS);
  return onValue(statusRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  });
};

// Supprimer la position d'un livreur (fin de journée)
export const removeLivreurPosition = async (livreurId: string): Promise<void> => {
  const positionRef = ref(realtimeDb, `${REALTIME_PATHS.POSITIONS}/${livreurId}`);
  await remove(positionRef);
};
