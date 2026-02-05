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
import type { Client } from "@/types";

const COLLECTION_NAME = "clients";

// Convert Firestore document to Client type
function docToClient(doc: DocumentSnapshot): Client {
  const data = doc.data();
  if (!data) throw new Error("Document data is undefined");

  return {
    id: doc.id,
    nom: data.nom || data.name,
    type: data.type,
    adresse: data.adresse || data.address?.street || '',
    codePostal: data.codePostal || data.address?.postalCode || '',
    ville: data.ville || data.address?.city || '',
    telephone: data.telephone || data.contact?.phone || '',
    email: data.email || data.contact?.email,
    siret: data.siret,
    caAnnuel: data.caAnnuel || 0,
    frequenceCommande: data.frequenceCommande || 'hebdo',
    panierMoyen: data.panierMoyen || 0,
    commercial: data.commercial || data.commercialId || '',
    depot: data.depot || 'lyon',
    riskScore: data.riskScore || data.score || 0,
    status: data.status,
    coordonnees: data.coordonnees,
    notes: data.notes,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export interface ClientsFilter {
  status?: Client["status"];
  type?: Client["type"];
  commercial?: string;
  depot?: Client["depot"];
  searchQuery?: string;
}

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

// Get all clients with optional filters and pagination
export async function getClients(
  filters?: ClientsFilter,
  pagination?: PaginationOptions
): Promise<{ clients: Client[]; lastDoc: DocumentSnapshot | null }> {
  const constraints: QueryConstraint[] = [];

  if (filters?.status) {
    constraints.push(where("status", "==", filters.status));
  }

  if (filters?.type) {
    constraints.push(where("type", "==", filters.type));
  }

  if (filters?.commercial) {
    constraints.push(where("commercial", "==", filters.commercial));
  }

  if (filters?.depot) {
    constraints.push(where("depot", "==", filters.depot));
  }

  constraints.push(orderBy("nom", "asc"));

  if (pagination?.pageSize) {
    constraints.push(limit(pagination.pageSize));
  }

  if (pagination?.lastDoc) {
    constraints.push(startAfter(pagination.lastDoc));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  const clients = snapshot.docs.map(docToClient);
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  // Client-side search filtering (Firestore doesn't support full-text search)
  let filteredClients = clients;
  if (filters?.searchQuery) {
    const search = filters.searchQuery.toLowerCase();
    filteredClients = clients.filter(
      (client) =>
        client.nom.toLowerCase().includes(search) ||
        client.ville.toLowerCase().includes(search) ||
        client.telephone.includes(search)
    );
  }

  return { clients: filteredClients, lastDoc };
}

// Get single client by ID
export async function getClientById(id: string): Promise<Client | null> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;
  return docToClient(docSnap);
}

// Create new client
export async function createClient(
  data: Omit<Client, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Update existing client
export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// Delete client
export async function deleteClient(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

// Get clients by IDs
export async function getClientsByIds(ids: string[]): Promise<Client[]> {
  if (ids.length === 0) return [];

  const clients: Client[] = [];
  // Firestore 'in' query limited to 10 items, so we batch
  const batches = [];
  for (let i = 0; i < ids.length; i += 10) {
    batches.push(ids.slice(i, i + 10));
  }

  for (const batch of batches) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("__name__", "in", batch)
    );
    const snapshot = await getDocs(q);
    clients.push(...snapshot.docs.map(docToClient));
  }

  return clients;
}

// Get client stats
export async function getClientStats(commercial?: string): Promise<{
  total: number;
  actif: number;
  prospect: number;
  inactif: number;
  perdu: number;
}> {
  const constraints: QueryConstraint[] = [];
  if (commercial) {
    constraints.push(where("commercial", "==", commercial));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  const stats = { total: 0, actif: 0, prospect: 0, inactif: 0, perdu: 0 };
  snapshot.docs.forEach((doc) => {
    stats.total++;
    const status = doc.data().status as Client["status"];
    if (status && status in stats) {
      stats[status as keyof typeof stats]++;
    }
  });

  return stats;
}

// Get at-risk clients (high riskScore)
export async function getAtRiskClients(threshold: number = 70): Promise<Client[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("riskScore", ">=", threshold),
    where("status", "==", "actif"),
    orderBy("riskScore", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToClient);
}

// Get clients by depot
export async function getClientsByDepot(depot: Client["depot"]): Promise<Client[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("depot", "==", depot),
    orderBy("nom", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToClient);
}
