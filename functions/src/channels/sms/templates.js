/**
 * SMS Templates - 160 caracteres max
 *
 * Templates optimises pour GSM-7 encoding
 * Variables: {prenom}, {nom}, {entreprise}, {secteur}
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { isGSM7, getSegmentCount } from './sender.js';

const db = getFirestore();

// ============================================
// TEMPLATES PAR DEFAUT (GSM-7, <160 chars)
// ============================================
export const DEFAULT_SMS_TEMPLATES = {
  // Introduction courte
  intro_short: {
    name: 'Introduction courte',
    content: 'Bonjour {prenom}, je travaille avec des {secteur} comme {entreprise}. Un echange de 10min cette semaine ? STOP au 36XXX',
    category: 'intro',
    charCount: 142
  },

  // Suivi apres email
  follow_up_email: {
    name: 'Suivi email',
    content: '{prenom}, suite a mon email, seriez-vous dispo pour un appel de 10min ? Cordialement. STOP au 36XXX',
    category: 'follow_up',
    charCount: 108
  },

  // Proposition de valeur
  value_prop: {
    name: 'Proposition de valeur',
    content: '{prenom}, nous aidons les {secteur} a gagner du temps. Interesse par un echange rapide ? STOP au 36XXX',
    category: 'value',
    charCount: 112
  },

  // Rappel RDV
  reminder: {
    name: 'Rappel rendez-vous',
    content: 'Bonjour {prenom}, rappel de notre RDV demain. Au plaisir ! STOP au 36XXX',
    category: 'reminder',
    charCount: 79
  },

  // Relance douce
  soft_follow: {
    name: 'Relance douce',
    content: '{prenom}, je me permets de revenir vers vous. Avez-vous eu le temps de reflechir ? STOP au 36XXX',
    category: 'follow_up',
    charCount: 103
  },

  // Dernier message
  breakup: {
    name: 'Dernier message',
    content: '{prenom}, je comprends que ce n\'est peut-etre pas le bon moment. Je reste dispo si besoin. STOP au 36XXX',
    category: 'breakup',
    charCount: 112
  },

  // Etude de cas
  case_study: {
    name: 'Etude de cas',
    content: '{prenom}, {entreprise} similaire a augmente son CA de 30%. Interesse par un retour d\'experience ? STOP au 36XXX',
    category: 'value',
    charCount: 118
  },

  // Question directe
  direct_question: {
    name: 'Question directe',
    content: '{prenom}, une question: quel est votre plus grand defi actuellement chez {entreprise} ? STOP au 36XXX',
    category: 'engagement',
    charCount: 106
  }
};

// ============================================
// CREER UN TEMPLATE PERSONNALISE
// ============================================
export async function createSMSTemplate(orgId, templateData) {
  const result = {
    success: false,
    templateId: null,
    warnings: [],
    error: null
  };

  try {
    const { name, content, category = 'custom' } = templateData;

    // Valider le contenu
    const validation = validateSMSContent(content);
    result.warnings = validation.warnings;

    if (!validation.valid) {
      result.error = validation.error;
      return result;
    }

    // Creer le template
    const templateRef = await db.collection('organizations').doc(orgId)
      .collection('channelTemplates').add({
        channel: 'sms',
        name,
        content,
        category,
        charCount: content.length,
        segmentCount: getSegmentCount(content),
        encoding: isGSM7(content) ? 'GSM-7' : 'UCS-2',
        hasStop: content.toUpperCase().includes('STOP'),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

    result.success = true;
    result.templateId = templateRef.id;
    return result;

  } catch (error) {
    console.error('createSMSTemplate error:', error);
    result.error = error.message;
    return result;
  }
}

// ============================================
// OBTENIR LES TEMPLATES
// ============================================
export async function getSMSTemplates(orgId, category = null) {
  try {
    let query = db.collection('organizations').doc(orgId)
      .collection('channelTemplates')
      .where('channel', '==', 'sms');

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

    // Ajouter les templates par defaut
    for (const [key, template] of Object.entries(DEFAULT_SMS_TEMPLATES)) {
      if (!category || template.category === category) {
        templates.push({
          id: `default_${key}`,
          isDefault: true,
          channel: 'sms',
          ...template
        });
      }
    }

    return templates;

  } catch (error) {
    console.error('getSMSTemplates error:', error);
    return Object.entries(DEFAULT_SMS_TEMPLATES).map(([key, template]) => ({
      id: `default_${key}`,
      isDefault: true,
      channel: 'sms',
      ...template
    }));
  }
}

// ============================================
// VALIDER CONTENU SMS
// ============================================
export function validateSMSContent(content) {
  const result = {
    valid: true,
    error: null,
    warnings: [],
    details: {
      charCount: content.length,
      segmentCount: getSegmentCount(content),
      encoding: isGSM7(content) ? 'GSM-7' : 'UCS-2',
      hasStop: content.toUpperCase().includes('STOP')
    }
  };

  // Trop long
  if (content.length > 320) {
    result.valid = false;
    result.error = 'Message trop long (max 320 caracteres recommande)';
    return result;
  }

  // Avertissement longueur
  if (result.details.segmentCount > 1) {
    result.warnings.push(`Message sur ${result.details.segmentCount} segments (cout x${result.details.segmentCount})`);
  }

  // Pas de STOP
  if (!result.details.hasStop) {
    result.warnings.push('Le message ne contient pas de mention STOP (obligatoire CNIL)');
  }

  // UCS-2 encoding
  if (result.details.encoding === 'UCS-2') {
    result.warnings.push('Le message contient des caracteres speciaux (emojis, accents rares) - limite 70 chars/segment');
  }

  // Variables non remplacees
  const unreplacedVars = content.match(/\{[a-z_]+\}/gi);
  if (unreplacedVars) {
    result.details.variables = unreplacedVars;
  }

  return result;
}

// ============================================
// PREVISUALISER AVEC VARIABLES
// ============================================
export function previewSMSTemplate(content, prospect = {}) {
  const variables = {
    '{prenom}': prospect.firstName || 'Jean',
    '{nom}': prospect.lastName || 'Dupont',
    '{entreprise}': prospect.company || 'Entreprise ABC',
    '{poste}': prospect.position || 'Directeur',
    '{ville}': prospect.city || 'Paris',
    '{secteur}': prospect.sector || 'PME'
  };

  let preview = content;
  for (const [key, value] of Object.entries(variables)) {
    preview = preview.replace(new RegExp(key, 'gi'), value);
  }

  return {
    preview,
    charCount: preview.length,
    segmentCount: getSegmentCount(preview),
    encoding: isGSM7(preview) ? 'GSM-7' : 'UCS-2'
  };
}

// ============================================
// OPTIMISER POUR GSM-7
// ============================================
export function optimizeForGSM7(content) {
  // Remplacements courants pour rester en GSM-7
  const replacements = {
    'é': 'e',
    'è': 'e',
    'ê': 'e',
    'ë': 'e',
    'à': 'a',
    'â': 'a',
    'ä': 'a',
    'î': 'i',
    'ï': 'i',
    'ô': 'o',
    'ö': 'o',
    'ù': 'u',
    'û': 'u',
    'ü': 'u',
    'ç': 'c',
    'œ': 'oe',
    'æ': 'ae',
    ''': "'",
    ''': "'",
    '"': '"',
    '"': '"',
    '…': '...',
    '–': '-',
    '—': '-'
  };

  let optimized = content;
  for (const [from, to] of Object.entries(replacements)) {
    optimized = optimized.replace(new RegExp(from, 'g'), to);
  }

  return {
    original: content,
    optimized,
    originalEncoding: isGSM7(content) ? 'GSM-7' : 'UCS-2',
    optimizedEncoding: isGSM7(optimized) ? 'GSM-7' : 'UCS-2',
    charsSaved: content.length - optimized.length
  };
}

// ============================================
// GENERER SMS DEPUIS EMAIL
// ============================================
export function emailToSMS(emailContent, maxLength = 155) {
  // Extraire le premier paragraphe significatif
  const lines = emailContent
    .replace(/<[^>]*>/g, '') // Supprimer HTML
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 20 && l.length < 200);

  if (lines.length === 0) {
    return null;
  }

  let sms = lines[0];

  // Tronquer si trop long
  if (sms.length > maxLength) {
    sms = sms.substring(0, maxLength - 3) + '...';
  }

  // Ajouter STOP
  sms += ' STOP au 36XXX';

  return {
    content: sms,
    ...validateSMSContent(sms).details
  };
}
