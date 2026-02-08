/**
 * Tool: Consultation des commandes DISTRAM
 * Interroge Firestore pour récupérer les commandes
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit, Timestamp, QueryConstraint } from "firebase/firestore";

const OrderSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  status: z.string(),
  totalTTC: z.number(),
  itemCount: z.number(),
  createdAt: z.string(),
  deliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

const InputSchema = z.object({
  clientId: z.string().optional().describe("ID du client pour filtrer"),
  status: z.string().optional().describe("Statut de la commande"),
  dateFrom: z.string().optional().describe("Date de début (YYYY-MM-DD)"),
  dateTo: z.string().optional().describe("Date de fin (YYYY-MM-DD)"),
  maxResults: z.number().optional().describe("Nombre maximum de résultats (défaut: 20)"),
});

export const orderLookup = createTool({
  id: "lookup-orders",
  description: `Consulte les commandes dans Firestore.
Peut filtrer par client, période, statut.
Statuts possibles: pending, confirmed, preparing, delivering, delivered, cancelled.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    orders: z.array(OrderSchema),
    totalFound: z.number(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      const ordersRef = collection(db, "orders");
      const constraints: QueryConstraint[] = [];

      // Filtres conditionnels
      if (input.clientId) {
        constraints.push(where("clientId", "==", input.clientId));
      }
      if (input.status) {
        constraints.push(where("status", "==", input.status));
      }
      if (input.dateFrom) {
        const fromDate = new Date(input.dateFrom);
        constraints.push(where("createdAt", ">=", Timestamp.fromDate(fromDate)));
      }
      if (input.dateTo) {
        const toDate = new Date(input.dateTo);
        toDate.setHours(23, 59, 59);
        constraints.push(where("createdAt", "<=", Timestamp.fromDate(toDate)));
      }

      constraints.push(orderBy("createdAt", "desc"));
      constraints.push(limit(input.maxResults || 20));

      const q = query(ordersRef, ...constraints);
      const snapshot = await getDocs(q);
      const orders: z.infer<typeof OrderSchema>[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          orderId: doc.id,
          orderNumber: data.orderNumber || doc.id.slice(0, 8).toUpperCase(),
          clientId: data.clientId || "",
          clientName: data.clientName || "Client inconnu",
          status: data.status || "pending",
          totalTTC: data.totalTTC || 0,
          itemCount: data.items?.length || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          deliveryDate: data.deliveryDate?.toDate?.()?.toISOString(),
          deliveryAddress: data.deliveryAddress,
          notes: data.notes,
        });
      });

      return {
        orders,
        totalFound: orders.length,
      };
    } catch (error) {
      console.error("Erreur orderLookup:", error);
      return {
        orders: [],
        totalFound: 0,
      };
    }
  },
});
