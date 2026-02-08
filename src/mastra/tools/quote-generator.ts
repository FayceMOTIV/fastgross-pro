/**
 * Tool: Générateur de devis DISTRAM
 * Génère un devis PDF à partir d'une liste de produits
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const QuoteItemSchema = z.object({
  ref: z.string(),
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  unit: z.string(),
});

const InputSchema = z.object({
  clientId: z.string().describe("ID du client Firestore"),
  clientName: z.string().describe("Nom du client/restaurant"),
  items: z.array(QuoteItemSchema).describe("Liste des produits et quantités"),
  validityDays: z.number().optional().describe("Durée de validité du devis en jours (défaut: 30)"),
  notes: z.string().optional().describe("Notes additionnelles pour le devis"),
});

export const quoteGenerator = createTool({
  id: "generate-quote",
  description: `Génère un devis pour un client DISTRAM.
Calcule automatiquement les totaux HT et TTC (TVA 5.5% alimentaire).
Sauvegarde le devis dans Firestore et retourne un ID unique.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    quoteId: z.string(),
    quoteNumber: z.string(),
    totalHT: z.number(),
    totalTVA: z.number(),
    totalTTC: z.number(),
    createdAt: z.string(),
    validUntil: z.string(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      const TVA_RATE = 0.055; // TVA 5.5% alimentaire

      // Calcul des totaux
      let totalHT = 0;
      const itemsWithTotal = input.items.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        totalHT += lineTotal;
        return {
          ...item,
          lineTotal,
        };
      });

      const totalTVA = totalHT * TVA_RATE;
      const totalTTC = totalHT + totalTVA;

      // Génération du numéro de devis
      const now = new Date();
      const quoteNumber = `DEV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

      // Date de validité
      const validUntil = new Date(now);
      validUntil.setDate(validUntil.getDate() + (input.validityDays || 30));

      // Sauvegarde dans Firestore
      const quoteData = {
        quoteNumber,
        clientId: input.clientId,
        clientName: input.clientName,
        items: itemsWithTotal,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTVA: Math.round(totalTVA * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        validUntil: validUntil.toISOString(),
        notes: input.notes || "",
        status: "draft",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "quotes"), quoteData);

      return {
        quoteId: docRef.id,
        quoteNumber,
        totalHT: Math.round(totalHT * 100) / 100,
        totalTVA: Math.round(totalTVA * 100) / 100,
        totalTTC: Math.round(totalTTC * 100) / 100,
        createdAt: now.toISOString(),
        validUntil: validUntil.toISOString(),
      };
    } catch (error) {
      console.error("Erreur quoteGenerator:", error);
      throw new Error("Impossible de générer le devis");
    }
  },
});
