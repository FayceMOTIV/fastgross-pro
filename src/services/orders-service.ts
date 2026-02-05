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
  startAfter,
  DocumentSnapshot,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderStatus } from "@/types";

const COLLECTION_NAME = "orders";

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CMD-${year}${month}-${random}`;
}

// Convert Firestore document to Order type
function docToOrder(doc: DocumentSnapshot): Order {
  const data = doc.data();
  if (!data) throw new Error("Document data is undefined");

  return {
    id: doc.id,
    numero: data.numero || generateOrderNumber(),
    clientId: data.clientId,
    clientNom: data.clientNom || data.clientName || '',
    status: data.status,
    items: data.items || [],
    totalHT: data.totalHT || data.subtotal || 0,
    remise: data.remise || data.discount || 0,
    totalTTC: data.totalTTC || data.total || 0,
    dateLivraison: data.dateLivraison?.toDate() || data.deliveryDate?.toDate(),
    creneauLivraison: data.creneauLivraison || data.deliverySlot,
    livreurId: data.livreurId || data.assignedTo,
    notes: data.notes,
    commercial: data.commercial || data.createdBy || '',
    depot: data.depot || 'lyon',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export interface OrdersFilter {
  status?: OrderStatus | OrderStatus[];
  clientId?: string;
  livreurId?: string;
  commercial?: string;
  depot?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

// Get all orders with optional filters and pagination
export async function getOrders(
  filters?: OrdersFilter,
  pagination?: PaginationOptions
): Promise<{ orders: Order[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      constraints.push(where("status", "in", filters.status));
    } else {
      constraints.push(where("status", "==", filters.status));
    }
  }

  if (filters?.clientId) {
    constraints.push(where("clientId", "==", filters.clientId));
  }

  if (filters?.livreurId) {
    constraints.push(where("livreurId", "==", filters.livreurId));
  }

  if (filters?.commercial) {
    constraints.push(where("commercial", "==", filters.commercial));
  }

  if (filters?.depot) {
    constraints.push(where("depot", "==", filters.depot));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (pagination?.pageSize) {
    constraints.push(limit(pagination.pageSize));
  }

  if (pagination?.lastDoc) {
    constraints.push(startAfter(pagination.lastDoc));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  let orders = snapshot.docs.map(docToOrder);
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  // Date filtering (client-side due to Firestore limitations with compound queries)
  if (filters?.dateFrom) {
    orders = orders.filter((order) => order.createdAt >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    orders = orders.filter((order) => order.createdAt <= filters.dateTo!);
  }

  return { orders, lastDoc };
}

// Get single order by ID
export async function getOrderById(id: string): Promise<Order | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docToOrder(docSnap);
}

// Create new order
export async function createOrder(
  data: Omit<Order, "id" | "numero" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const orderData: Record<string, unknown> = {
    ...data,
    numero: generateOrderNumber(),
    createdAt: now,
    updatedAt: now,
  };

  if (data.dateLivraison) {
    orderData.dateLivraison = Timestamp.fromDate(new Date(data.dateLivraison));
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), orderData);
  return docRef.id;
}

// Update existing order
export async function updateOrder(
  id: string,
  data: Partial<Omit<Order, "id" | "numero" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  if (data.dateLivraison) {
    updateData.dateLivraison = Timestamp.fromDate(new Date(data.dateLivraison));
  }

  await updateDoc(docRef, updateData);
}

// Delete order
export async function deleteOrder(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// Update order status
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status,
    updatedAt: Timestamp.now(),
  });
}

// Assign driver to order
export async function assignDriver(orderId: string, livreurId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, orderId);
  await updateDoc(docRef, {
    livreurId,
    status: "en_preparation",
    updatedAt: Timestamp.now(),
  });
}

// Get order stats
export async function getOrderStats(dateFrom?: Date): Promise<{
  total: number;
  brouillon: number;
  validee: number;
  en_preparation: number;
  en_livraison: number;
  livree: number;
  annulee: number;
  caTotal: number;
}> {
  const constraints: QueryConstraint[] = [];

  if (dateFrom) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(dateFrom)));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  const stats = {
    total: 0,
    brouillon: 0,
    validee: 0,
    en_preparation: 0,
    en_livraison: 0,
    livree: 0,
    annulee: 0,
    caTotal: 0,
  };

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    stats.total++;

    const status = data.status as OrderStatus;
    if (status && status in stats) {
      stats[status as keyof typeof stats]++;
    }

    if (status === "livree") {
      stats.caTotal += data.totalTTC || data.total || 0;
    }
  });

  return stats;
}

// Get orders for a specific date (delivery date)
export async function getOrdersByDeliveryDate(date: Date): Promise<Order[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, COLLECTION_NAME),
    where("dateLivraison", ">=", Timestamp.fromDate(startOfDay)),
    where("dateLivraison", "<=", Timestamp.fromDate(endOfDay)),
    orderBy("dateLivraison", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToOrder);
}

// Get orders by depot
export async function getOrdersByDepot(depot: string): Promise<Order[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("depot", "==", depot),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToOrder);
}

// Get today's orders
export async function getTodayOrders(): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, COLLECTION_NAME),
    where("createdAt", ">=", Timestamp.fromDate(today)),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToOrder);
}
