/**
 * Tool: Informations client DISTRAM
 * Récupère les infos d'un client depuis Firestore
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, orderBy, limit } from "firebase/firestore";

const ClientSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  type: z.string(),
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  depot: z.string(),
  commercialId: z.string().optional(),
  commercialName: z.string().optional(),
  status: z.string(),
  lastOrderDate: z.string().optional(),
  totalOrders: z.number(),
  totalRevenue: z.number(),
  notes: z.string().optional(),
  deliveryInstructions: z.string().optional(),
});

const InputSchema = z.object({
  clientId: z.string().optional().describe("ID du client Firestore"),
  clientName: z.string().optional().describe("Nom du client pour recherche"),
});

export const clientInfo = createTool({
  id: "get-client-info",
  description: `Récupère les informations détaillées d'un client DISTRAM.
Peut chercher par ID ou par nom.
Inclut l'historique des commandes et les notes spéciales.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    client: ClientSchema.nullable(),
    recentOrders: z.array(z.object({
      orderId: z.string(),
      date: z.string(),
      total: z.number(),
      status: z.string(),
    })),
    found: z.boolean(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      let clientData: z.infer<typeof ClientSchema> | null = null;

      // Recherche par ID
      if (input.clientId) {
        const clientDoc = await getDoc(doc(db, "clients", input.clientId));
        if (clientDoc.exists()) {
          const data = clientDoc.data();
          clientData = {
            clientId: clientDoc.id,
            name: data.name || "Client sans nom",
            type: data.type || "restaurant",
            address: data.address || "",
            city: data.city || "",
            phone: data.phone || "",
            email: data.email,
            depot: data.depot || "lyon",
            commercialId: data.commercialId,
            commercialName: data.commercialName,
            status: data.status || "active",
            lastOrderDate: data.lastOrderDate?.toDate?.()?.toISOString(),
            totalOrders: data.totalOrders || 0,
            totalRevenue: data.totalRevenue || 0,
            notes: data.notes,
            deliveryInstructions: data.deliveryInstructions,
          };
        }
      }

      // Recherche par nom si pas trouvé par ID
      if (!clientData && input.clientName) {
        const clientsRef = collection(db, "clients");
        const q = query(
          clientsRef,
          where("name", ">=", input.clientName),
          where("name", "<=", input.clientName + "\uf8ff"),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const clientDoc = snapshot.docs[0];
          const data = clientDoc.data();
          clientData = {
            clientId: clientDoc.id,
            name: data.name || "Client sans nom",
            type: data.type || "restaurant",
            address: data.address || "",
            city: data.city || "",
            phone: data.phone || "",
            email: data.email,
            depot: data.depot || "lyon",
            commercialId: data.commercialId,
            commercialName: data.commercialName,
            status: data.status || "active",
            lastOrderDate: data.lastOrderDate?.toDate?.()?.toISOString(),
            totalOrders: data.totalOrders || 0,
            totalRevenue: data.totalRevenue || 0,
            notes: data.notes,
            deliveryInstructions: data.deliveryInstructions,
          };
        }
      }

      // Récupérer les commandes récentes
      const recentOrders: Array<{orderId: string; date: string; total: number; status: string}> = [];
      if (clientData) {
        const ordersRef = collection(db, "orders");
        const ordersQuery = query(
          ordersRef,
          where("clientId", "==", clientData.clientId),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        ordersSnapshot.forEach((orderDoc) => {
          const orderData = orderDoc.data();
          recentOrders.push({
            orderId: orderDoc.id,
            date: orderData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            total: orderData.totalTTC || 0,
            status: orderData.status || "pending",
          });
        });
      }

      return {
        client: clientData,
        recentOrders,
        found: clientData !== null,
      };
    } catch (error) {
      console.error("Erreur clientInfo:", error);
      return {
        client: null,
        recentOrders: [],
        found: false,
      };
    }
  },
});
