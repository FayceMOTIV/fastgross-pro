/**
 * Voicemail Script Generator
 *
 * Generation de scripts pour voicemail:
 * - Templates personnalisables
 * - Variables dynamiques
 * - Duree optimale (20-30 sec)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { callAI } from '../../utils/gemini.js';

const getDb = () => getFirestore();

// ============================================
// DUREE OPTIMALE VOICEMAIL
// ============================================
const OPTIMAL_DURATION_SEC = 25; // 20-30 secondes
const WORDS_PER_SECOND = 2.5;    // Vitesse de parole moyenne
const MAX_WORDS = Math.round(OPTIMAL_DURATION_SEC * WORDS_PER_SECOND);

// ============================================
// TEMPLATES DE SCRIPTS PAR DEFAUT
// ============================================
export const DEFAULT_SCRIPT_TEMPLATES = {
  introduction: {
    id: 'introduction',
    name: 'Introduction',
    category: 'intro',
    template: `Bonjour {prenom}, c'est {commercial} de {entreprise_source}. Je me permets de vous laisser ce message car j'ai remarque que {entreprise} pourrait beneficier de {proposition_valeur}. N'hesitez pas a me rappeler au {numero_rappel}. A bientot.`,
    variables: ['prenom', 'commercial', 'entreprise_source', 'entreprise', 'proposition_valeur', 'numero_rappel'],
    estimatedDuration: 22
  },

  follow_up: {
    id: 'follow_up',
    name: 'Suivi',
    category: 'follow_up',
    template: `Bonjour {prenom}, c'est {commercial}. Je reviens vers vous suite a mon email. J'aimerais beaucoup echanger avec vous sur {sujet}. Vous pouvez me joindre au {numero_rappel}. Bonne journee.`,
    variables: ['prenom', 'commercial', 'sujet', 'numero_rappel'],
    estimatedDuration: 18
  },

  value_proposition: {
    id: 'value_proposition',
    name: 'Proposition de valeur',
    category: 'value',
    template: `Bonjour {prenom}, {commercial} de {entreprise_source}. Nous avons aide {reference} a {resultat}. Je serais ravi d'en discuter avec vous. Mon numero : {numero_rappel}.`,
    variables: ['prenom', 'commercial', 'entreprise_source', 'reference', 'resultat', 'numero_rappel'],
    estimatedDuration: 20
  },

  appointment_reminder: {
    id: 'appointment_reminder',
    name: 'Rappel RDV',
    category: 'reminder',
    template: `Bonjour {prenom}, juste un rappel pour notre rendez-vous prevu {date_rdv}. A bientot.`,
    variables: ['prenom', 'date_rdv'],
    estimatedDuration: 10
  },

  breakup: {
    id: 'breakup',
    name: 'Dernier message',
    category: 'breakup',
    template: `Bonjour {prenom}, c'est {commercial}. Je comprends que ce n'est peut-etre pas le bon moment. Je reste a votre disposition si vos besoins evoluent. Bonne continuation.`,
    variables: ['prenom', 'commercial'],
    estimatedDuration: 15
  }
};

// ============================================
// GENERER SCRIPT DEPUIS TEMPLATE
// ============================================
export async function generateScript(orgId, templateId, prospect, customVariables = {}) {
  try {
    // 1. Recuperer le template
    let template;

    // Chercher dans les templates custom
    const customRef = getDb().collection('organizations').doc(orgId)
      .collection('voicemailScripts').doc(templateId);
    const customSnap = await customRef.get();

    if (customSnap.exists) {
      template = customSnap.data();
    } else if (DEFAULT_SCRIPT_TEMPLATES[templateId]) {
      template = DEFAULT_SCRIPT_TEMPLATES[templateId];
    } else {
      return null;
    }

    // 2. Recuperer les infos de l'organisation
    const orgRef = getDb().collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    const org = orgSnap.exists ? orgSnap.data() : {};

    // 3. Construire les variables
    const variables = {
      // Prospect
      prenom: prospect.firstName || prospect.prenom || 'Monsieur/Madame',
      nom: prospect.lastName || prospect.nom || '',
      entreprise: prospect.company || prospect.entreprise || 'votre entreprise',
      poste: prospect.position || prospect.poste || '',
      ville: prospect.city || prospect.ville || '',
      secteur: prospect.sector || prospect.secteur || '',

      // Organisation
      commercial: org.commercialName || 'notre equipe',
      entreprise_source: org.name || 'Face Media Factory',
      numero_rappel: org.phoneNumber || '01 23 45 67 89',

      // Custom
      ...customVariables
    };

    // 4. Remplacer les variables
    let script = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      script = script.replace(new RegExp(`\\{${escapedKey}\\}`, 'gi'), value);
    }

    // 5. Verifier la longueur
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round(wordCount / WORDS_PER_SECOND);

    return {
      type: template.voiceId ? 'voice_clone' : 'tts',
      voiceId: template.voiceId,
      text: script,
      variables,
      wordCount,
      estimatedDuration,
      templateId,
      templateName: template.name
    };

  } catch (error) {
    console.error('generateScript error:', error);
    return null;
  }
}

// ============================================
// GENERER SCRIPT AVEC IA
// ============================================
export async function generateScriptWithAI(orgId, context) {
  try {
    const { prospect, objective, tone, icp } = context;

    const prompt = `Tu es un expert en prospection telephonique B2B.

Genere un script de voicemail de maximum 30 secondes (environ 60-70 mots) pour laisser un message vocal a un prospect.

PROSPECT:
- Prenom: ${prospect.firstName || 'le prospect'}
- Entreprise: ${prospect.company || 'son entreprise'}
- Secteur: ${prospect.sector || 'non specifie'}
- Ville: ${prospect.city || 'non specifiee'}

OBJECTIF: ${objective || 'Prise de contact initiale'}

TON: ${tone || 'professionnel mais chaleureux'}

OFFRE: ${icp?.offer || 'services de prospection'}

REGLES ABSOLUES:
1. Maximum 70 mots
2. Commencer par "Bonjour [prenom]"
3. Se presenter (nom et entreprise)
4. Une seule proposition de valeur claire
5. Terminer par numero de rappel ou incitation a rappeler
6. Ton naturel, pas robotique
7. Pas de jargon commercial

STRUCTURE:
1. Salutation + presentation (5 sec)
2. Raison de l'appel / valeur (15 sec)
3. Call-to-action + numero (5-10 sec)

Reponds UNIQUEMENT avec le script, sans explication.`;

    const response = await callAI(prompt, 200);

    if (!response) {
      return null;
    }

    // Nettoyer la reponse
    const script = response.trim().replace(/^["']|["']$/g, '');
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.round(wordCount / WORDS_PER_SECOND);

    return {
      type: 'tts',
      text: script,
      wordCount,
      estimatedDuration,
      generatedBy: 'ai',
      objective,
      tone
    };

  } catch (error) {
    console.error('generateScriptWithAI error:', error);
    return null;
  }
}

// ============================================
// CREER TEMPLATE PERSONNALISE
// ============================================
export async function createScriptTemplate(orgId, templateData) {
  try {
    const { name, template, category, voiceId } = templateData;

    // Valider
    const wordCount = template.split(/\s+/).length;
    if (wordCount > MAX_WORDS * 1.5) {
      return {
        success: false,
        error: `Script trop long (${wordCount} mots, max recommande: ${MAX_WORDS})`
      };
    }

    // Extraire les variables
    const variables = (template.match(/\{(\w+)\}/g) || [])
      .map(v => v.replace(/[{}]/g, ''));

    const ref = await getDb().collection('organizations').doc(orgId)
      .collection('voicemailScripts').add({
        name,
        template,
        category: category || 'custom',
        variables,
        voiceId,
        wordCount,
        estimatedDuration: Math.round(wordCount / WORDS_PER_SECOND),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

    return {
      success: true,
      templateId: ref.id
    };

  } catch (error) {
    console.error('createScriptTemplate error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// LISTER TEMPLATES
// ============================================
export async function listScriptTemplates(orgId, category = null) {
  try {
    let query = getDb().collection('organizations').doc(orgId)
      .collection('voicemailScripts');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();

    const customTemplates = snapshot.docs.map(doc => ({
      id: doc.id,
      isCustom: true,
      ...doc.data()
    }));

    // Ajouter templates par defaut
    const defaultTemplates = Object.values(DEFAULT_SCRIPT_TEMPLATES)
      .filter(t => !category || t.category === category)
      .map(t => ({ ...t, isCustom: false }));

    return [...customTemplates, ...defaultTemplates];

  } catch (error) {
    console.error('listScriptTemplates error:', error);
    return Object.values(DEFAULT_SCRIPT_TEMPLATES);
  }
}

// ============================================
// PREVISUALISER SCRIPT
// ============================================
export function previewScript(template, prospect, customVariables = {}) {
  const variables = {
    prenom: prospect?.firstName || '[Prenom]',
    nom: prospect?.lastName || '[Nom]',
    entreprise: prospect?.company || '[Entreprise]',
    ville: prospect?.city || '[Ville]',
    secteur: prospect?.sector || '[Secteur]',
    commercial: customVariables.commercial || '[Commercial]',
    entreprise_source: customVariables.entreprise_source || '[Votre Entreprise]',
    numero_rappel: customVariables.numero_rappel || '[Numero]',
    ...customVariables
  };

  let preview = template;
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    preview = preview.replace(new RegExp(`\\{${escapedKey}\\}`, 'gi'), value);
  }

  const wordCount = preview.split(/\s+/).length;

  return {
    text: preview,
    wordCount,
    estimatedDuration: Math.round(wordCount / WORDS_PER_SECOND),
    isOptimalLength: wordCount <= MAX_WORDS
  };
}

export { MAX_WORDS, OPTIMAL_DURATION_SEC, WORDS_PER_SECOND };
