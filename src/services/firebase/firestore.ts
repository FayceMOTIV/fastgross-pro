import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  DocumentData,
  QueryConstraint,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  CLIENTS: 'clients',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  DELIVERIES: 'deliveries',
  QUOTES: 'quotes',
  ALERTS: 'alerts',
  PROSPECTS: 'prospects',
  DEMO_REQUESTS: 'demo_requests',
  CHURN_ANALYSES: 'churn_analyses',
  ROUTE_OPTIMIZATIONS: 'route_optimizations',
  STOCK_PREDICTIONS: 'stock_predictions',
} as const;

// Generic CRUD operations
export const getAll = async <T>(collectionName: string): Promise<T[]> => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

export const getById = async <T>(collectionName: string, id: string): Promise<T | null> => {
  const docRef = doc(db, collectionName, id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T : null;
};

export const create = async <T extends DocumentData>(collectionName: string, data: T): Promise<string> => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const update = async <T extends DocumentData>(collectionName: string, id: string, data: Partial<T>): Promise<void> => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const remove = async (collectionName: string, id: string): Promise<void> => {
  await deleteDoc(doc(db, collectionName, id));
};

// Query with filters
export const queryCollection = async <T>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> => {
  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
};

// Real-time listeners
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints?: { field: string; operator: any; value: any }[]
) => {
  let q: any = collection(db, collectionName);

  if (constraints && constraints.length > 0) {
    const queryConstraints = constraints.map(c => where(c.field, c.operator, c.value));
    q = query(q, ...queryConstraints);
  }

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
    callback(data);
  });
};

export const subscribeToDocument = <T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
) => {
  const docRef = doc(db, collectionName, docId);
  return onSnapshot(docRef, (snapshot: DocumentSnapshot<DocumentData>) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as T);
    } else {
      callback(null);
    }
  });
};

// Helpers
export { where, orderBy, limit, Timestamp };
