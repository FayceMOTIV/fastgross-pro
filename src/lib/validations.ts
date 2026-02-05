/**
 * Schémas de validation Zod pour les APIs
 * Validation côté serveur pour toutes les entrées utilisateur
 */

import { z } from 'zod';

// ============================================
// UTILITAIRES
// ============================================

// Téléphone français
const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;

// Code postal français
const postalCodeRegex = /^[0-9]{5}$/;

// ============================================
// SCHEMAS CLIENT
// ============================================

export const clientSchema = z.object({
  nom: z.string().min(2, 'Nom requis (min 2 caractères)').max(100),
  type: z.enum(['kebab', 'tacos', 'pizza', 'burger', 'snack', 'restaurant']),
  adresse: z.string().min(5, 'Adresse requise'),
  ville: z.string().min(2, 'Ville requise'),
  codePostal: z.string().regex(postalCodeRegex, 'Code postal invalide'),
  telephone: z.string().regex(phoneRegex, 'Téléphone invalide').optional(),
  email: z.string().email('Email invalide'),
  depot: z.enum(['lyon', 'montpellier', 'bordeaux']),
  commercial: z.string().optional(),
});

export const clientUpdateSchema = clientSchema.partial();

// ============================================
// SCHEMAS DEVIS
// ============================================

export const devisProductSchema = z.object({
  ref: z.string().min(1, 'Référence requise'),
  name: z.string().min(1, 'Nom du produit requis'),
  quantity: z.number().min(1, 'Quantité min 1'),
  priceHT: z.number().positive('Prix doit être positif'),
  tva: z.number().min(0).max(100).default(20),
});

export const devisSchema = z.object({
  clientId: z.string().optional(),
  clientEmail: z.string().email('Email client invalide'),
  clientName: z.string().min(2, 'Nom client requis'),
  restaurantName: z.string().min(2, 'Nom du restaurant requis'),
  products: z.array(devisProductSchema).min(1, 'Au moins un produit requis'),
  remise: z.number().min(0).max(100).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

export const devisEmailSchema = z.object({
  to: z.string().email('Email destinataire invalide'),
  clientName: z.string().min(2),
  restaurantName: z.string().min(2),
  devisNumber: z.string().min(1),
  totalTTC: z.number().positive(),
  products: z.array(devisProductSchema),
  validUntil: z.string().optional(),
  commercialName: z.string().optional(),
  commercialPhone: z.string().optional(),
  commercialEmail: z.string().email().optional(),
});

// ============================================
// SCHEMAS COMMANDE
// ============================================

export const orderProductSchema = z.object({
  productId: z.string().min(1),
  ref: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().min(1),
  priceHT: z.number().positive(),
});

export const orderSchema = z.object({
  clientId: z.string().min(1, 'Client requis'),
  products: z.array(orderProductSchema).min(1, 'Au moins un produit requis'),
  deliveryDate: z.string().datetime('Date de livraison invalide'),
  deliveryAddress: z.string().min(5).optional(),
  notes: z.string().max(500).optional(),
  priority: z.enum(['normale', 'urgente']).default('normale'),
  paymentMethod: z.enum(['virement', 'cheque', 'especes', 'cb']).optional(),
});

// ============================================
// SCHEMAS SCAN MENU
// ============================================

export const scanMenuSchema = z.object({
  imageBase64: z.string().min(100, 'Image requise'),
  clientId: z.string().optional(),
  restaurantName: z.string().optional(),
  restaurantType: z.enum(['kebab', 'tacos', 'pizza', 'burger', 'snack', 'restaurant']).optional(),
});

export const scanResultSchema = z.object({
  type: z.string(),
  plats: z.array(z.string()),
  ingredients: z.array(z.string()),
  produitsRecommandes: z.array(z.object({
    ref: z.string(),
    nom: z.string(),
    categorie: z.string(),
    prix: z.number(),
    quantiteSuggeree: z.number(),
  })),
  analyse: z.string(),
  confidence: z.number().min(0).max(1),
});

// ============================================
// SCHEMAS CHAT IA
// ============================================

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message vide').max(2000, 'Message trop long'),
  role: z.enum(['user', 'assistant']).default('user'),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    userId: z.string().optional(),
    depot: z.enum(['lyon', 'montpellier', 'bordeaux']).optional(),
    currentPage: z.string().optional(),
  }).optional(),
  history: z.array(chatMessageSchema).max(20).optional(),
});

// ============================================
// SCHEMAS AUTH
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe min 6 caractères'),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[a-z]/, 'Au moins une minuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  confirmPassword: z.string(),
  nom: z.string().min(2, 'Nom requis'),
  prenom: z.string().min(2, 'Prénom requis'),
  role: z.enum(['commercial', 'manager', 'admin', 'client']).default('commercial'),
  depot: z.enum(['lyon', 'montpellier', 'bordeaux']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// ============================================
// SCHEMAS PROSPECTION
// ============================================

export const prospectionRequestSchema = z.object({
  clientName: z.string().min(2),
  restaurantType: z.enum(['kebab', 'tacos', 'pizza', 'burger', 'snack', 'restaurant']),
  location: z.string().min(2),
  existingProducts: z.array(z.string()).optional(),
  budget: z.enum(['small', 'medium', 'large']).optional(),
});

// ============================================
// HELPERS
// ============================================

/**
 * Valide les données et retourne le résultat formaté
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: Record<string, string[]>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return { success: false, errors };
}

/**
 * Middleware de validation pour API routes
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const result = validateData(schema, body);

      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: result.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return handler(result.data, req);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

// ============================================
// TYPES EXPORTÉS
// ============================================

export type ClientInput = z.infer<typeof clientSchema>;
export type DevisInput = z.infer<typeof devisSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type ScanMenuInput = z.infer<typeof scanMenuSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
