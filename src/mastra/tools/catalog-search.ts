/**
 * Tool: Recherche dans le catalogue DISTRAM
 * Interroge Firestore pour trouver les produits correspondants
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

// Schéma de sortie pour un produit
const ProductSchema = z.object({
  ref: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  unit: z.string(),
  description: z.string(),
});

const InputSchema = z.object({
  query: z.string().describe("Terme de recherche : nom produit, catégorie, ou type de cuisine"),
  category: z.string().optional().describe("Catégorie : viandes, sauces, pains, fromages, boissons, épicerie, surgelés"),
  maxResults: z.number().optional().describe("Nombre maximum de résultats (défaut: 10)"),
});

export const catalogSearch = createTool({
  id: "search-catalog",
  description: `Recherche dans le catalogue de 98 produits DISTRAM.
Peut chercher par nom, catégorie, type de cuisine, ou ingrédient.
Catégories disponibles: viandes, sauces, pains, fromages, boissons, épicerie, surgelés.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    products: z.array(ProductSchema),
    totalFound: z.number(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      const productsRef = collection(db, "products");
      let q = query(productsRef, limit(input.maxResults || 10));

      // Si une catégorie est spécifiée, filtrer par catégorie
      if (input.category) {
        q = query(
          productsRef,
          where("category", "==", input.category.toLowerCase()),
          limit(input.maxResults || 10)
        );
      }

      const snapshot = await getDocs(q);
      const products: z.infer<typeof ProductSchema>[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const searchTerms = input.query.toLowerCase();

        // Recherche textuelle simple
        const nameMatch = data.name?.toLowerCase().includes(searchTerms);
        const descMatch = data.description?.toLowerCase().includes(searchTerms);
        const catMatch = data.category?.toLowerCase().includes(searchTerms);

        if (nameMatch || descMatch || catMatch || !input.query) {
          products.push({
            ref: data.ref || doc.id,
            name: data.name || "Produit sans nom",
            category: data.category || "Non catégorisé",
            price: data.price || 0,
            unit: data.unit || "unité",
            description: data.description || "",
          });
        }
      });

      return {
        products: products.slice(0, input.maxResults || 10),
        totalFound: products.length,
      };
    } catch (error) {
      console.error("Erreur catalogSearch:", error);
      return {
        products: [],
        totalFound: 0,
      };
    }
  },
});
