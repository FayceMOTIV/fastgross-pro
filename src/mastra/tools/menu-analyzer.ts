/**
 * Tool: Analyseur de menu via GPT-4o Vision
 * Analyse les images de menus de restaurants
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import OpenAI from "openai";

const DishSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  category: z.string(),
  confidence: z.enum(["haute", "moyenne", "basse"]),
});

const InputSchema = z.object({
  imageBase64: z.string().optional().describe("Image du menu encodée en base64"),
  imageUrl: z.string().optional().describe("URL de l'image (alternative au base64)"),
  restaurantType: z.string().optional().describe("Type de restaurant si connu (kebab, pizza, burger, etc.)"),
});

export const menuAnalyzer = createTool({
  id: "analyze-menu",
  description: `Analyse une image de menu de restaurant via GPT-4o Vision.
Identifie les plats, leurs ingrédients probables, et les catégories.
Retourne une liste structurée pour le matching avec le catalogue DISTRAM.`,
  inputSchema: InputSchema,
  outputSchema: z.object({
    dishes: z.array(DishSchema),
    restaurantType: z.string(),
    totalDishesFound: z.number(),
    analysisNotes: z.string().optional(),
  }),
  execute: async (input: z.infer<typeof InputSchema>) => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Préparer le contenu de l'image
      let imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage;

      if (input.imageBase64) {
        // Détecter le type MIME
        let mimeType = "image/jpeg";
        if (input.imageBase64.startsWith("/9j/")) {
          mimeType = "image/jpeg";
        } else if (input.imageBase64.startsWith("iVBOR")) {
          mimeType = "image/png";
        } else if (input.imageBase64.startsWith("R0lGOD")) {
          mimeType = "image/gif";
        }

        imageContent = {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${input.imageBase64}`,
            detail: "high",
          },
        };
      } else if (input.imageUrl) {
        imageContent = {
          type: "image_url",
          image_url: {
            url: input.imageUrl,
            detail: "high",
          },
        };
      } else {
        throw new Error("Aucune image fournie (imageBase64 ou imageUrl requis)");
      }

      // Prompt optimisé pour l'analyse de menu
      const systemPrompt = `Tu es un expert en analyse de menus de restaurants pour un grossiste alimentaire halal (DISTRAM).

Ton rôle:
1. Analyser l'image du menu fournie
2. Identifier chaque plat lisible
3. Déduire les ingrédients probables de chaque plat
4. Catégoriser les plats (viandes, sauces, accompagnements, boissons, desserts)

Pour chaque plat, donne un niveau de confiance:
- "haute" = plat clairement identifiable
- "moyenne" = plat probable mais pas certain
- "basse" = hypothèse basée sur le contexte

${input.restaurantType ? `Type de restaurant connu: ${input.restaurantType}` : ""}

Réponds UNIQUEMENT en JSON avec ce format:
{
  "dishes": [
    {
      "name": "Nom du plat",
      "ingredients": ["ingrédient1", "ingrédient2"],
      "category": "catégorie",
      "confidence": "haute|moyenne|basse"
    }
  ],
  "restaurantType": "type détecté (kebab, pizza, burger, asiatique, etc.)",
  "analysisNotes": "notes éventuelles sur la qualité de l'image ou difficultés"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse ce menu et identifie tous les plats avec leurs ingrédients probables." },
              imageContent,
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "{}";

      // Parser la réponse JSON
      let parsedResponse: { dishes?: Array<{ name?: string; ingredients?: string[]; category?: string; confidence?: string }>; restaurantType?: string; analysisNotes?: string };
      try {
        // Extraire le JSON de la réponse (au cas où il y a du texte autour)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Pas de JSON trouvé dans la réponse");
        }
      } catch {
        console.error("Erreur parsing JSON GPT-4o:", content);
        parsedResponse = {
          dishes: [],
          restaurantType: "inconnu",
          analysisNotes: "Erreur lors de l'analyse de l'image",
        };
      }

      // Valider et formater les plats
      const dishes: z.infer<typeof DishSchema>[] = (parsedResponse.dishes || []).map((dish) => {
        const conf = dish.confidence;
        const validConfidence: "haute" | "moyenne" | "basse" =
          conf === "haute" || conf === "moyenne" || conf === "basse" ? conf : "moyenne";
        return {
          name: dish.name || "Plat inconnu",
          ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
          category: dish.category || "autre",
          confidence: validConfidence,
        };
      });

      return {
        dishes,
        restaurantType: parsedResponse.restaurantType || input.restaurantType || "inconnu",
        totalDishesFound: dishes.length,
        analysisNotes: parsedResponse.analysisNotes,
      };
    } catch (error) {
      console.error("Erreur menuAnalyzer:", error);
      return {
        dishes: [],
        restaurantType: input.restaurantType || "inconnu",
        totalDishesFound: 0,
        analysisNotes: `Erreur lors de l'analyse: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      };
    }
  },
});
