/**
 * API Route: Envoi de devis par email
 * POST /api/email/send-devis
 *
 * Features:
 * - Rate limiting (10 emails / 5 min)
 * - Zod validation
 * - Error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendDevisEmail } from '@/services/email-service';
import { checkApiRateLimit, getRateLimitInfo } from '@/lib/rate-limiter';

// ============================================
// VALIDATION SCHEMA
// ============================================

const devisEmailSchema = z.object({
  devis: z.object({
    id: z.string().optional(),
    numero: z.string().min(1, 'Numéro devis requis'),
    clientNom: z.string().min(1, 'Nom client requis'),
    clientEmail: z.string().email('Email invalide'),
    clientTelephone: z.string().optional(),
    restaurantType: z.string().optional(),
    commercial: z.object({
      nom: z.string(),
      email: z.string().email().optional(),
      telephone: z.string().optional(),
    }).optional(),
    lignes: z.array(z.object({
      ref: z.string(),
      nom: z.string(),
      quantite: z.number().min(1),
      prixUnitaireHT: z.number(),
      tauxTVA: z.number().optional(),
    })).min(1, 'Au moins un produit requis'),
    totalHT: z.number(),
    totalTTC: z.number(),
    remiseGlobale: z.number().optional(),
    status: z.string().optional(),
    dateCreation: z.string().optional(),
    dateValidite: z.string().optional(),
  }),
  lienDevis: z.string().url('Lien invalide'),
  includeDetails: z.boolean().optional().default(true),
});

// ============================================
// API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const userId = request.headers.get('x-user-id');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || 'anonymous';
    const identifier = userId || ip;

    if (!checkApiRateLimit(identifier, 'EMAIL_SEND')) {
      const info = getRateLimitInfo(identifier);
      return NextResponse.json(
        {
          success: false,
          error: 'Limite d\'envoi atteinte. Veuillez patienter.',
          retryAfter: Math.ceil(info.resetIn / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(info.remaining),
            'Retry-After': String(Math.ceil(info.resetIn / 1000)),
          }
        }
      );
    }

    // 2. Parse et validation
    const body = await request.json();
    const validationResult = devisEmailSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: 'Données invalides',
          details: errors
        },
        { status: 400 }
      );
    }

    const { devis, lienDevis, includeDetails } = validationResult.data;

    // 3. Envoyer l'email
    const result = await sendDevisEmail({
      devis: devis as any, // Type casting pour compatibilité
      lienDevis,
      includeDetails: includeDetails ?? true
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // 4. Succès
    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Email envoyé à ${devis.clientEmail}`
    });

  } catch (error) {
    console.error('Erreur API send-devis:', error);

    // Erreur JSON parse
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Format JSON invalide' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur interne' },
      { status: 500 }
    );
  }
}
