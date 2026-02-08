/**
 * Service Email pour FastGross Pro - DISTRAM
 * Utilise SendGrid pour l'envoi d'emails transactionnels
 */

import sgMail from '@sendgrid/mail';
import { Devis, LigneDevis } from '@/types/devis';

// Configuration SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'devis@distram.fr';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'DISTRAM - Grossiste Halal';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Types
export interface DevisEmailData {
  devis: Devis;
  lienDevis: string;
  includeDetails?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Formater le prix en euros
const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

// Formater la date
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
};

// Générer le tableau HTML des lignes
const generateLignesTable = (lignes: LigneDevis[], title: string): string => {
  if (lignes.length === 0) return '';

  const rows = lignes.map(ligne => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px; color: #666;">${ligne.ref}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${ligne.nom}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${ligne.quantite} ${ligne.unite}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(ligne.prixUnitaire)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${ligne.remise > 0 ? `-${ligne.remise}%` : '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${formatPrice(ligne.quantite * ligne.prixUnitaire * (1 - ligne.remise / 100))}</td>
    </tr>
  `).join('');

  return `
    <h3 style="color: #333; margin: 24px 0 12px; font-size: 16px;">${title}</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Réf</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Désignation</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Qté</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">P.U. HT</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Remise</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

// Générer l'email HTML du devis
const generateDevisEmailHTML = ({ devis, lienDevis, includeDetails = true }: DevisEmailData): string => {
  const produitsTable = includeDetails ? generateLignesTable(devis.lignesProduits, 'Produits') : '';
  const emballagesTable = includeDetails ? generateLignesTable(devis.lignesEmballages, 'Emballages') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${devis.numero} - DISTRAM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">DISTRAM</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Grossiste Alimentaire Halal</p>
            </td>
          </tr>

          <!-- Devis Header -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 8px; color: #ea580c; font-size: 24px;">Devis ${devis.numero}</h2>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      Créé le ${formatDate(devis.dateCreation)} • Valide jusqu'au ${formatDate(devis.dateExpiration)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          ${devis.messageClient ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 4px 4px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">${devis.messageClient}</p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Client Info -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h3 style="margin: 0 0 12px; color: #333; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Client</h3>
                <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${devis.clientNom}</p>
                ${devis.clientAdresse ? `<p style="margin: 4px 0 0; color: #666; font-size: 14px;">${devis.clientAdresse}</p>` : ''}
                ${devis.clientTelephone ? `<p style="margin: 4px 0 0; color: #666; font-size: 14px;">Tél: ${devis.clientTelephone}</p>` : ''}
              </div>
            </td>
          </tr>

          <!-- Products Tables -->
          ${includeDetails ? `
          <tr>
            <td style="padding: 0 32px;">
              ${produitsTable}
              ${emballagesTable}
            </td>
          </tr>
          ` : ''}

          <!-- Totals -->
          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%"></td>
                  <td width="50%">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8f9fa; border-radius: 8px; padding: 16px;">
                      <tr>
                        <td style="padding: 8px 16px; color: #666;">Sous-total Produits HT</td>
                        <td style="padding: 8px 16px; text-align: right;">${formatPrice(devis.totalProduitsHT)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 16px; color: #666;">Sous-total Emballages HT</td>
                        <td style="padding: 8px 16px; text-align: right;">${formatPrice(devis.totalEmballagesHT)}</td>
                      </tr>
                      ${devis.remiseGlobale > 0 ? `
                      <tr>
                        <td style="padding: 8px 16px; color: #16a34a;">Remise globale (${devis.remiseGlobale}%)</td>
                        <td style="padding: 8px 16px; text-align: right; color: #16a34a;">-${formatPrice((devis.totalProduitsHT + devis.totalEmballagesHT) * devis.remiseGlobale / 100)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 8px 16px;"><hr style="border: none; border-top: 1px solid #ddd; margin: 0;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 16px; font-weight: 600;">Total HT</td>
                        <td style="padding: 8px 16px; text-align: right; font-weight: 600;">${formatPrice(devis.totalHT)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 16px; color: #666;">TVA (20%)</td>
                        <td style="padding: 8px 16px; text-align: right; color: #666;">${formatPrice(devis.tva)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 16px; font-size: 20px; font-weight: 700; color: #ea580c;">Total TTC</td>
                        <td style="padding: 12px 16px; text-align: right; font-size: 20px; font-weight: 700; color: #ea580c;">${formatPrice(devis.totalTTC)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 16px 32px 32px; text-align: center;">
              <a href="${lienDevis}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: #ffffff; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);">
                Voir le devis complet
              </a>
              <p style="margin: 16px 0 0; color: #999; font-size: 12px;">
                Ce lien est valide pendant ${devis.validite} jours
              </p>
            </td>
          </tr>

          <!-- Conditions -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="border-top: 1px solid #eee; padding-top: 24px;">
                <h4 style="margin: 0 0 12px; color: #333; font-size: 14px;">Conditions</h4>
                <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 13px; line-height: 1.8;">
                  <li><strong>Paiement:</strong> ${devis.conditionsPaiement}</li>
                  <li><strong>Livraison:</strong> ${devis.delaiLivraison}</li>
                  <li><strong>Validité:</strong> ${devis.validite} jours</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #1f2937; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 14px; font-weight: 600;">DISTRAM</p>
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 12px;">Lyon • Montpellier • Bordeaux</p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Commercial: ${devis.commercialNom} - ${devis.commercialEmail}
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer Note -->
        <p style="margin: 24px 0 0; color: #999; font-size: 11px; text-align: center;">
          Cet email a été envoyé automatiquement par DISTRAM.<br>
          Pour toute question, contactez votre commercial DISTRAM.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Générer l'email texte simple (fallback)
const generateDevisEmailText = ({ devis, lienDevis }: DevisEmailData): string => {
  return `
DEVIS ${devis.numero}
=====================

DISTRAM - Grossiste Alimentaire Halal

Client: ${devis.clientNom}
${devis.clientAdresse ? `Adresse: ${devis.clientAdresse}` : ''}
${devis.clientTelephone ? `Téléphone: ${devis.clientTelephone}` : ''}

${devis.messageClient ? `Message:\n${devis.messageClient}\n` : ''}

RÉCAPITULATIF
-------------
Produits HT: ${formatPrice(devis.totalProduitsHT)}
Emballages HT: ${formatPrice(devis.totalEmballagesHT)}
${devis.remiseGlobale > 0 ? `Remise globale: -${devis.remiseGlobale}%\n` : ''}
Total HT: ${formatPrice(devis.totalHT)}
TVA (20%): ${formatPrice(devis.tva)}
TOTAL TTC: ${formatPrice(devis.totalTTC)}

CONDITIONS
----------
Paiement: ${devis.conditionsPaiement}
Livraison: ${devis.delaiLivraison}
Validité: ${devis.validite} jours

CONSULTER LE DEVIS
------------------
${lienDevis}

---
Commercial: ${devis.commercialNom}
Email: ${devis.commercialEmail}
Dépôt: ${devis.depot.charAt(0).toUpperCase() + devis.depot.slice(1)}

DISTRAM - Lyon • Montpellier • Bordeaux
  `.trim();
};

/**
 * Envoyer un devis par email
 */
export async function sendDevisEmail(data: DevisEmailData): Promise<EmailResult> {
  const { devis } = data;

  // Vérifier les prérequis
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY non configurée');
    return {
      success: false,
      error: 'Service email non configuré'
    };
  }

  if (!devis.clientEmail) {
    return {
      success: false,
      error: 'Email client manquant'
    };
  }

  try {
    const msg = {
      to: devis.clientEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      replyTo: devis.commercialEmail || FROM_EMAIL,
      subject: `Devis ${devis.numero} - DISTRAM`,
      text: generateDevisEmailText(data),
      html: generateDevisEmailHTML(data),
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    const [response] = await sgMail.send(msg);

    console.log(`Email devis envoyé: ${devis.numero} -> ${devis.clientEmail}`);

    return {
      success: true,
      messageId: response.headers['x-message-id']
    };
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'envoi'
    };
  }
}

/**
 * Envoyer une notification au commercial quand un devis est consulté
 */
export async function sendDevisConsultedNotification(devis: Devis): Promise<EmailResult> {
  if (!SENDGRID_API_KEY) {
    return { success: false, error: 'Service email non configuré' };
  }

  if (!devis.commercialEmail) {
    return { success: false, error: 'Email commercial manquant' };
  }

  try {
    const msg = {
      to: devis.commercialEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: `🔔 Devis ${devis.numero} consulté par ${devis.clientNom}`,
      text: `
Le devis ${devis.numero} a été consulté par le client.

Client: ${devis.clientNom}
Montant: ${formatPrice(devis.totalTTC)}
Date: ${new Date().toLocaleString('fr-FR')}

Connectez-vous à la plateforme DISTRAM pour suivre ce devis.
      `.trim(),
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: #ea580c;">Devis consulté</h2>
          <p>Le devis <strong>${devis.numero}</strong> a été consulté par le client.</p>
          <ul>
            <li><strong>Client:</strong> ${devis.clientNom}</li>
            <li><strong>Montant:</strong> ${formatPrice(devis.totalTTC)}</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
          </ul>
          <p>Connectez-vous à la plateforme DISTRAM pour suivre ce devis.</p>
        </div>
      `
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer une notification quand un devis est accepté/refusé
 */
export async function sendDevisResponseNotification(
  devis: Devis,
  response: 'accepte' | 'refuse',
  commentaire?: string
): Promise<EmailResult> {
  if (!SENDGRID_API_KEY) {
    return { success: false, error: 'Service email non configuré' };
  }

  if (!devis.commercialEmail) {
    return { success: false, error: 'Email commercial manquant' };
  }

  const emoji = response === 'accepte' ? '✅' : '❌';
  const status = response === 'accepte' ? 'ACCEPTÉ' : 'REFUSÉ';
  const color = response === 'accepte' ? '#16a34a' : '#dc2626';

  try {
    const msg = {
      to: devis.commercialEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject: `${emoji} Devis ${devis.numero} ${status} par ${devis.clientNom}`,
      text: `
Le devis ${devis.numero} a été ${status.toLowerCase()} par le client.

Client: ${devis.clientNom}
Montant: ${formatPrice(devis.totalTTC)}
${commentaire ? `Commentaire: ${commentaire}` : ''}

${response === 'accepte' ? 'Félicitations ! Vous pouvez maintenant convertir ce devis en commande.' : 'N\'hésitez pas à recontacter le client pour comprendre ses besoins.'}
      `.trim(),
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: ${color};">Devis ${status}</h2>
          <p>Le devis <strong>${devis.numero}</strong> a été ${status.toLowerCase()} par le client.</p>
          <ul>
            <li><strong>Client:</strong> ${devis.clientNom}</li>
            <li><strong>Montant:</strong> ${formatPrice(devis.totalTTC)}</li>
            ${commentaire ? `<li><strong>Commentaire:</strong> ${commentaire}</li>` : ''}
          </ul>
          <p>${response === 'accepte'
            ? '🎉 Félicitations ! Vous pouvez maintenant convertir ce devis en commande.'
            : '💡 N\'hésitez pas à recontacter le client pour comprendre ses besoins.'
          }</p>
        </div>
      `
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
