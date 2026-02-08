/**
 * Tool: Optimisation de routes VROOM
 * Appelle l'API VROOM pour calculer les tournées optimales
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

// Coordonnées des dépôts DISTRAM
const DEPOTS = {
  lyon: { lat: 45.7640, lng: 4.8357, name: "Dépôt Lyon" },
  montpellier: { lat: 43.6108, lng: 3.8767, name: "Dépôt Montpellier" },
  bordeaux: { lat: 44.8378, lng: -0.5792, name: "Dépôt Bordeaux" },
};

const RouteStopSchema = z.object({
  orderId: z.string(),
  clientName: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  estimatedArrival: z.string(),
  estimatedDuration: z.number(),
  priority: z.number(),
});

const OptimizedRouteSchema = z.object({
  vehicleId: z.string(),
  driverName: z.string().optional(),
  stops: z.array(RouteStopSchema),
  totalDistance: z.number(),
  totalDuration: z.number(),
  startTime: z.string(),
  endTime: z.string(),
});

const InputSchema = z.object({
  depot: z.enum(["lyon", "montpellier", "bordeaux"]).describe("Dépôt de départ"),
  date: z.string().describe("Date des livraisons (YYYY-MM-DD)"),
  vehicleCount: z.number().optional().describe("Nombre de véhicules disponibles (défaut: 2)"),
});

export const vroomOptimize = createTool({
  id: "optimize-routes",
  description: `Calcule les routes de livraison optimales via VROOM.
Prend en compte: positions GPS, fenêtres horaires, capacités véhicules.
Retourne l'ordre optimal des livraisons avec temps estimés.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    routes: z.array(OptimizedRouteSchema),
    totalOrders: z.number(),
    unassignedOrders: z.number(),
    optimizationTime: z.number(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    const startTime = Date.now();

    try {
      // Récupérer les commandes du jour pour le dépôt
      const targetDate = new Date(input.date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const ordersRef = collection(db, "orders");
      const ordersQuery = query(
        ordersRef,
        where("depot", "==", input.depot),
        where("status", "in", ["confirmed", "preparing"]),
        where("deliveryDate", ">=", Timestamp.fromDate(targetDate)),
        where("deliveryDate", "<", Timestamp.fromDate(nextDate))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders: Array<{
        id: string;
        clientName: string;
        address: string;
        lat: number;
        lng: number;
        priority: number;
        timeWindow?: [number, number];
      }> = [];

      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lat && data.lng) {
          orders.push({
            id: doc.id,
            clientName: data.clientName || "Client",
            address: data.deliveryAddress || data.address || "",
            lat: data.lat,
            lng: data.lng,
            priority: data.priority || 1,
            timeWindow: data.deliveryTimeWindow,
          });
        }
      });

      if (orders.length === 0) {
        return {
          routes: [],
          totalOrders: 0,
          unassignedOrders: 0,
          optimizationTime: Date.now() - startTime,
        };
      }

      // Préparer la requête VROOM
      const depotCoords = DEPOTS[input.depot];
      const vehicleCount = input.vehicleCount || 2;
      const vroomRequest = {
        vehicles: Array.from({ length: vehicleCount }, (_, i) => ({
          id: i + 1,
          start: [depotCoords.lng, depotCoords.lat],
          end: [depotCoords.lng, depotCoords.lat],
          capacity: [1000], // kg
          time_window: [8 * 3600, 18 * 3600], // 8h-18h en secondes
        })),
        jobs: orders.map((order, index) => ({
          id: index + 1,
          location: [order.lng, order.lat],
          service: 600, // 10 minutes par livraison
          priority: order.priority,
          time_windows: order.timeWindow
            ? [[order.timeWindow[0] * 3600, order.timeWindow[1] * 3600]]
            : undefined,
        })),
      };

      // Appel à l'API VROOM (localhost:3000 ou env variable)
      const vroomUrl = process.env.VROOM_API_URL || "http://localhost:3000";

      let vroomResult: { routes?: Array<{ vehicle: number; steps: Array<{ type: string; id: number; arrival: number; service?: number }>; distance: number; duration: number }>; unassigned?: unknown[] } | undefined;
      try {
        const response = await fetch(vroomUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vroomRequest),
        });

        if (response.ok) {
          vroomResult = await response.json();
        }
      } catch {
        // VROOM non disponible - utiliser un tri simple par distance
        console.warn("VROOM API non disponible, utilisation du tri par distance");
      }

      // Construire les routes optimisées
      const routes: z.infer<typeof OptimizedRouteSchema>[] = [];

      if (vroomResult?.routes) {
        // Parser la réponse VROOM
        for (const route of vroomResult.routes) {
          const stops: z.infer<typeof RouteStopSchema>[] = [];
          let currentTime = 8 * 3600; // Départ à 8h

          for (const step of route.steps) {
            if (step.type === "job") {
              const orderIndex = step.id - 1;
              const order = orders[orderIndex];

              stops.push({
                orderId: order.id,
                clientName: order.clientName,
                address: order.address,
                lat: order.lat,
                lng: order.lng,
                estimatedArrival: new Date(targetDate.getTime() + step.arrival * 1000).toISOString(),
                estimatedDuration: step.service || 600,
                priority: order.priority,
              });

              currentTime = step.arrival + (step.service || 600);
            }
          }

          routes.push({
            vehicleId: `V${route.vehicle}`,
            stops,
            totalDistance: Math.round(route.distance / 1000 * 10) / 10, // km
            totalDuration: Math.round(route.duration / 60), // minutes
            startTime: new Date(targetDate.getTime() + 8 * 3600 * 1000).toISOString(),
            endTime: new Date(targetDate.getTime() + currentTime * 1000).toISOString(),
          });
        }
      } else {
        // Fallback: répartition simple
        const ordersPerVehicle = Math.ceil(orders.length / vehicleCount);

        for (let v = 0; v < vehicleCount; v++) {
          const vehicleOrders = orders.slice(v * ordersPerVehicle, (v + 1) * ordersPerVehicle);
          if (vehicleOrders.length === 0) continue;

          // Tri par distance depuis le dépôt
          vehicleOrders.sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.lat - depotCoords.lat, 2) + Math.pow(a.lng - depotCoords.lng, 2));
            const distB = Math.sqrt(Math.pow(b.lat - depotCoords.lat, 2) + Math.pow(b.lng - depotCoords.lng, 2));
            return distA - distB;
          });

          const stops: z.infer<typeof RouteStopSchema>[] = [];
          let currentTime = 8 * 60; // 8h en minutes

          vehicleOrders.forEach((order) => {
            currentTime += 15; // 15 min entre chaque arrêt
            stops.push({
              orderId: order.id,
              clientName: order.clientName,
              address: order.address,
              lat: order.lat,
              lng: order.lng,
              estimatedArrival: new Date(targetDate.getTime() + currentTime * 60 * 1000).toISOString(),
              estimatedDuration: 10,
              priority: order.priority,
            });
            currentTime += 10; // 10 min pour la livraison
          });

          routes.push({
            vehicleId: `V${v + 1}`,
            stops,
            totalDistance: vehicleOrders.length * 5, // Estimation 5km entre arrêts
            totalDuration: currentTime - 8 * 60,
            startTime: new Date(targetDate.getTime() + 8 * 3600 * 1000).toISOString(),
            endTime: new Date(targetDate.getTime() + currentTime * 60 * 1000).toISOString(),
          });
        }
      }

      return {
        routes,
        totalOrders: orders.length,
        unassignedOrders: vroomResult?.unassigned?.length || 0,
        optimizationTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Erreur vroomOptimize:", error);
      return {
        routes: [],
        totalOrders: 0,
        unassignedOrders: 0,
        optimizationTime: Date.now() - startTime,
      };
    }
  },
});
