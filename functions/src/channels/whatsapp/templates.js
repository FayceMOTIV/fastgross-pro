/**
 * WhatsApp Templates - Meta Business Manager
 *
 * Gestion des templates WhatsApp:
 * - Templates pre-approuves par Meta
 * - Categories: marketing, utility, authentication
 * - Sync avec Meta Business Manager
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// ============================================
// META API CONFIG
// ============================================
const META_API_VERSION = 'v18.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================
// CATEGORIES DE TEMPLATES
// ============================================
export const TEMPLATE_CATEGORIES = {
  MARKETING: 'MARKETING',       // Promotions, offres
  UTILITY: 'UTILITY',           // Confirmations, rappels
  AUTHENTICATION: 'AUTHENTICATION' // OTP, verification
};

// ============================================
// TEMPLATES PAR DEFAUT (a creer dans Meta)
// ============================================
export const DEFAULT_TEMPLATES = {
  // Introduction B2B
  b2b_introduction: {
    name: 'b2b_introduction_fr',
    category: 'MARKETING',
    language: 'fr',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '{{1}} pour {{2}}'
      },
      {
        type: 'BODY',
        text: 'Bonjour {{1}},\n\nJe suis {{2}} de {{3}}. Nous aidons les entreprises comme {{4}} a {{5}}.\n\nSeriez-vous disponible pour un echange de 10 minutes ?'
      },
      {
        type: 'FOOTER',
        text: 'Repondez STOP pour ne plus recevoir de messages'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Oui, interesse' },
          { type: 'QUICK_REPLY', text: 'Pas maintenant' },
          { type: 'QUICK_REPLY', text: 'Se desinscrire' }
        ]
      }
    ],
    bodyVariables: ['prenom', 'commercial', 'entreprise_source', 'entreprise_cible', 'benefice']
  },

  // Suivi apres email
  follow_up_email: {
    name: 'follow_up_email_fr',
    category: 'MARKETING',
    language: 'fr',
    components: [
      {
        type: 'BODY',
        text: 'Bonjour {{1}},\n\nJe me permets de vous recontacter suite a mon email. Avez-vous eu l\'occasion d\'y jeter un oeil ?\n\nJe reste a votre disposition pour en discuter.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Oui, parlons-en' },
          { type: 'QUICK_REPLY', text: 'Rappeler plus tard' }
        ]
      }
    ],
    bodyVariables: ['prenom']
  },

  // Partage de valeur
  value_share: {
    name: 'value_share_fr',
    category: 'MARKETING',
    language: 'fr',
    components: [
      {
        type: 'BODY',
        text: 'Bonjour {{1}},\n\n{{2}} a recemment augmente son {{3}} de {{4}}% grace a notre solution.\n\nSouhaitez-vous decouvrir comment ?'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Oui, je veux savoir' },
          { type: 'QUICK_REPLY', text: 'Non merci' }
        ]
      }
    ],
    bodyVariables: ['prenom', 'reference', 'kpi', 'pourcentage']
  },

  // Rappel RDV
  appointment_reminder: {
    name: 'appointment_reminder_fr',
    category: 'UTILITY',
    language: 'fr',
    components: [
      {
        type: 'BODY',
        text: 'Bonjour {{1}},\n\nRappel de notre rendez-vous prevu le {{2}} a {{3}}.\n\nA bientot !'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Confirme' },
          { type: 'QUICK_REPLY', text: 'Reporter' }
        ]
      }
    ],
    bodyVariables: ['prenom', 'date', 'heure']
  },

  // Dernier message
  breakup_message: {
    name: 'breakup_message_fr',
    category: 'MARKETING',
    language: 'fr',
    components: [
      {
        type: 'BODY',
        text: 'Bonjour {{1}},\n\nJe comprends que ce n\'est peut-etre pas le bon moment.\n\nJe reste a votre disposition si vos besoins evoluent. N\'hesitez pas a me recontacter !'
      }
    ],
    bodyVariables: ['prenom']
  }
};

// ============================================
// OBTENIR TEMPLATE APPROUVE
// ============================================
export async function getApprovedTemplate(orgId, templateName) {
  try {
    // 1. Chercher dans les templates de l'org
    const templateRef = db.collection('organizations').doc(orgId)
      .collection('channelTemplates')
      .where('channel', '==', 'whatsapp')
      .where('name', '==', templateName)
      .limit(1);

    const snapshot = await templateRef.get();

    if (!snapshot.empty) {
      const template = snapshot.docs[0].data();
      if (template.status === 'APPROVED') {
        return template;
      }
    }

    // 2. Chercher dans les templates par defaut
    const defaultTemplate = Object.values(DEFAULT_TEMPLATES).find(t => t.name === templateName);
    if (defaultTemplate) {
      return defaultTemplate;
    }

    return null;

  } catch (error) {
    console.error('getApprovedTemplate error:', error);
    return null;
  }
}

// ============================================
// LISTER TEMPLATES APPROUVES
// ============================================
export async function listApprovedTemplates(orgId, category = null) {
  try {
    let query = db.collection('organizations').doc(orgId)
      .collection('channelTemplates')
      .where('channel', '==', 'whatsapp')
      .where('status', '==', 'APPROVED');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();

    const templates = [];
    snapshot.forEach(doc => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ajouter templates par defaut
    for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
      if (!category || template.category === category) {
        templates.push({
          id: `default_${key}`,
          isDefault: true,
          status: 'APPROVED',
          ...template
        });
      }
    }

    return templates;

  } catch (error) {
    console.error('listApprovedTemplates error:', error);
    return Object.entries(DEFAULT_TEMPLATES).map(([key, template]) => ({
      id: `default_${key}`,
      isDefault: true,
      status: 'APPROVED',
      ...template
    }));
  }
}

// ============================================
// SYNC TEMPLATES DEPUIS META
// ============================================
export async function syncTemplatesFromMeta(orgId) {
  const results = {
    synced: 0,
    errors: [],
    templates: []
  };

  try {
    // Recuperer config Meta
    const configRef = db.collection('organizations').doc(orgId)
      .collection('integrations').doc('whatsapp');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      results.errors.push('WhatsApp not configured');
      return results;
    }

    const config = configSnap.data();
    const { businessAccountId, accessToken } = config;

    // Appeler Meta API
    const url = `${META_API_BASE}/${businessAccountId}/message_templates`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      results.errors.push(error.error?.message || 'Meta API error');
      return results;
    }

    const data = await response.json();
    const metaTemplates = data.data || [];

    // Sauvegarder en local
    const batch = db.batch();

    for (const metaTemplate of metaTemplates) {
      const templateRef = db.collection('organizations').doc(orgId)
        .collection('channelTemplates').doc(`wa_${metaTemplate.id}`);

      batch.set(templateRef, {
        channel: 'whatsapp',
        metaId: metaTemplate.id,
        name: metaTemplate.name,
        status: metaTemplate.status,
        category: metaTemplate.category,
        language: metaTemplate.language,
        components: metaTemplate.components,
        syncedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      results.synced++;
      results.templates.push({
        id: metaTemplate.id,
        name: metaTemplate.name,
        status: metaTemplate.status
      });
    }

    await batch.commit();

    return results;

  } catch (error) {
    console.error('syncTemplatesFromMeta error:', error);
    results.errors.push(error.message);
    return results;
  }
}

// ============================================
// SOUMETTRE TEMPLATE POUR APPROBATION
// ============================================
export async function submitTemplateForApproval(orgId, templateData) {
  const result = {
    success: false,
    templateId: null,
    status: null,
    error: null
  };

  try {
    // Recuperer config Meta
    const configRef = db.collection('organizations').doc(orgId)
      .collection('integrations').doc('whatsapp');
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      result.error = 'WhatsApp not configured';
      return result;
    }

    const config = configSnap.data();
    const { businessAccountId, accessToken } = config;

    // Construire le payload
    const payload = {
      name: templateData.name,
      language: templateData.language || 'fr',
      category: templateData.category || 'MARKETING',
      components: templateData.components
    };

    // Soumettre a Meta
    const url = `${META_API_BASE}/${businessAccountId}/message_templates`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      result.error = data.error?.message || 'Failed to submit template';
      return result;
    }

    // Sauvegarder localement
    const templateRef = await db.collection('organizations').doc(orgId)
      .collection('channelTemplates').add({
        channel: 'whatsapp',
        metaId: data.id,
        name: templateData.name,
        status: 'PENDING',
        category: templateData.category || 'MARKETING',
        language: templateData.language || 'fr',
        components: templateData.components,
        submittedAt: FieldValue.serverTimestamp()
      });

    result.success = true;
    result.templateId = templateRef.id;
    result.metaId = data.id;
    result.status = 'PENDING';

    return result;

  } catch (error) {
    console.error('submitTemplateForApproval error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// VALIDER PARAMETRES TEMPLATE
// ============================================
export function validateTemplateParams(template, params) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!template.bodyVariables) {
    return result;
  }

  // Verifier que tous les parametres requis sont fournis
  const requiredCount = template.bodyVariables.length;
  const providedCount = params?.length || 0;

  if (providedCount < requiredCount) {
    result.valid = false;
    result.errors.push(`Missing parameters: expected ${requiredCount}, got ${providedCount}`);
  }

  // Verifier la longueur des parametres
  if (params) {
    params.forEach((param, idx) => {
      const value = param.text || param.value || '';
      if (value.length > 1024) {
        result.warnings.push(`Parameter ${idx + 1} exceeds 1024 characters`);
      }
      if (!value) {
        result.warnings.push(`Parameter ${idx + 1} is empty`);
      }
    });
  }

  return result;
}

// ============================================
// PREVISUALISER TEMPLATE
// ============================================
export function previewTemplate(template, params = {}) {
  let preview = '';

  if (!template.components) {
    return preview;
  }

  for (const component of template.components) {
    switch (component.type) {
      case 'HEADER':
        if (component.format === 'TEXT') {
          preview += `*${replaceParams(component.text, params)}*\n\n`;
        }
        break;

      case 'BODY':
        preview += replaceParams(component.text, params) + '\n';
        break;

      case 'FOOTER':
        preview += `\n_${component.text}_`;
        break;

      case 'BUTTONS':
        preview += '\n\n';
        component.buttons?.forEach((btn, idx) => {
          preview += `[${btn.text}] `;
        });
        break;
    }
  }

  return preview.trim();
}

function replaceParams(text, params) {
  let result = text;

  // Remplacer {{1}}, {{2}}, etc.
  for (let i = 1; i <= 10; i++) {
    const key = `{{${i}}}`;
    const value = params[i] || params[`${i}`] || `{{${i}}}`;
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return result;
}
