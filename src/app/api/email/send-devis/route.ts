/**
 * API Route: Envoi de devis par email
 * POST /api/email/send-devis
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDevisEmail } from '@/services/email-service';
import { Devis } from '@/types/devis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { devis, lienDevis, includeDetails } = body as {
      devis: Devis;
      lienDevis: string;
      includeDetails?: boolean;
    };

    // Validation
    if (!devis) {
      return NextResponse.json(
        { success: false, error: 'Devis manquant' },
        { status: 400 }
      );
    }

    if (!devis.clientEmail) {
      return NextResponse.json(
        { success: false, error: 'Email client manquant' },
        { status: 400 }
      );
    }

    if (!lienDevis) {
      return NextResponse.json(
        { success: false, error: 'Lien devis manquant' },
        { status: 400 }
      );
    }

    // Envoyer l'email
    const result = await sendDevisEmail({
      devis,
      lienDevis,
      includeDetails: includeDetails ?? true
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Email envoyé à ${devis.clientEmail}`
    });

  } catch (error: any) {
    console.error('Erreur API send-devis:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
