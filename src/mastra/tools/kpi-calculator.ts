/**
 * Tool: Calculateur de KPIs DISTRAM
 * Calcule les indicateurs business en temps réel depuis Firestore
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

const KPIResultSchema = z.object({
  metric: z.string(),
  value: z.number(),
  unit: z.string(),
  trend: z.number().optional(),
  comparison: z.object({
    previousValue: z.number(),
    percentChange: z.number(),
    period: z.string(),
  }).optional(),
  breakdown: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })).optional(),
});

const InputSchema = z.object({
  metric: z.enum(["ca", "commandes", "clients", "conversion", "panier_moyen"]).describe("La métrique à calculer"),
  period: z.enum(["today", "week", "month", "quarter", "year"]).optional().describe("Période d'analyse (défaut: month)"),
  depot: z.string().optional().describe("Filtrer par dépôt: lyon, montpellier, bordeaux"),
  commercialId: z.string().optional().describe("Filtrer par commercial"),
  compareWithPrevious: z.boolean().optional().describe("Comparer avec la période précédente (défaut: true)"),
});

export const kpiCalculator = createTool({
  id: "calculate-kpi",
  description: `Calcule les KPIs business DISTRAM en temps réel.
Métriques disponibles: ca (chiffre d'affaires), commandes, clients, conversion, panier_moyen.
Peut filtrer par période, dépôt, commercial.`,
  inputSchema: InputSchema,
  outputSchema: KPIResultSchema,
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      // Calcul des dates de période
      const now = new Date();
      let startDate: Date;
      let previousStartDate: Date;
      let previousEndDate: Date;

      const period = input.period || "month";
      switch (period) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(previousStartDate.getDate() - 1);
          previousEndDate = new Date(startDate);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          previousStartDate = new Date(startDate);
          previousStartDate.setDate(previousStartDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case "quarter":
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          previousStartDate = new Date(now.getFullYear(), quarterMonth - 3, 1);
          previousEndDate = new Date(now.getFullYear(), quarterMonth, 0);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }

      // Construire les requêtes Firestore
      const ordersRef = collection(db, "orders");
      const constraints = [
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("status", "in", ["confirmed", "preparing", "delivering", "delivered"]),
      ];

      if (input.depot) {
        constraints.push(where("depot", "==", input.depot));
      }
      if (input.commercialId) {
        constraints.push(where("commercialId", "==", input.commercialId));
      }

      const currentQuery = query(ordersRef, ...constraints);
      const currentSnapshot = await getDocs(currentQuery);

      // Calcul selon la métrique
      let value = 0;
      let unit = "";
      const breakdown: Array<{label: string; value: number}> = [];

      switch (input.metric) {
        case "ca":
          unit = "€";
          currentSnapshot.forEach((doc) => {
            value += doc.data().totalTTC || 0;
          });
          value = Math.round(value * 100) / 100;
          break;

        case "commandes":
          unit = "commandes";
          value = currentSnapshot.size;
          break;

        case "clients":
          unit = "clients";
          const uniqueClients = new Set<string>();
          currentSnapshot.forEach((doc) => {
            if (doc.data().clientId) {
              uniqueClients.add(doc.data().clientId);
            }
          });
          value = uniqueClients.size;
          break;

        case "panier_moyen":
          unit = "€";
          let totalCA = 0;
          currentSnapshot.forEach((doc) => {
            totalCA += doc.data().totalTTC || 0;
          });
          value = currentSnapshot.size > 0 ? Math.round((totalCA / currentSnapshot.size) * 100) / 100 : 0;
          break;

        case "conversion":
          unit = "%";
          // Nécessiterait les données de prospects - valeur estimée
          const prospectsRef = collection(db, "prospects");
          const prospectsSnapshot = await getDocs(prospectsRef);
          const totalProspects = prospectsSnapshot.size;
          const convertedClients = currentSnapshot.size;
          value = totalProspects > 0 ? Math.round((convertedClients / totalProspects) * 10000) / 100 : 0;
          break;
      }

      // Calcul de la comparaison avec période précédente
      let comparison;
      const compareWithPrevious = input.compareWithPrevious !== false;
      if (compareWithPrevious) {
        const previousConstraints = [
          where("createdAt", ">=", Timestamp.fromDate(previousStartDate)),
          where("createdAt", "<=", Timestamp.fromDate(previousEndDate)),
          where("status", "in", ["confirmed", "preparing", "delivering", "delivered"]),
        ];

        if (input.depot) {
          previousConstraints.push(where("depot", "==", input.depot));
        }
        if (input.commercialId) {
          previousConstraints.push(where("commercialId", "==", input.commercialId));
        }

        const previousQuery = query(ordersRef, ...previousConstraints);
        const previousSnapshot = await getDocs(previousQuery);

        let previousValue = 0;
        switch (input.metric) {
          case "ca":
            previousSnapshot.forEach((doc) => {
              previousValue += doc.data().totalTTC || 0;
            });
            break;
          case "commandes":
            previousValue = previousSnapshot.size;
            break;
          case "clients":
            const prevClients = new Set<string>();
            previousSnapshot.forEach((doc) => {
              if (doc.data().clientId) prevClients.add(doc.data().clientId);
            });
            previousValue = prevClients.size;
            break;
          case "panier_moyen":
            let prevTotal = 0;
            previousSnapshot.forEach((doc) => {
              prevTotal += doc.data().totalTTC || 0;
            });
            previousValue = previousSnapshot.size > 0 ? prevTotal / previousSnapshot.size : 0;
            break;
        }

        const percentChange = previousValue > 0
          ? Math.round(((value - previousValue) / previousValue) * 10000) / 100
          : 0;

        comparison = {
          previousValue: Math.round(previousValue * 100) / 100,
          percentChange,
          period: `${period} précédent`,
        };
      }

      return {
        metric: input.metric,
        value,
        unit,
        trend: comparison?.percentChange,
        comparison,
        breakdown: breakdown.length > 0 ? breakdown : undefined,
      };
    } catch (error) {
      console.error("Erreur kpiCalculator:", error);
      return {
        metric: input.metric,
        value: 0,
        unit: "N/A",
      };
    }
  },
});
