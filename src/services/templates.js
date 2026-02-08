/**
 * Templates Service v2.0
 * Multi-channel message templates
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Template categories
export const TEMPLATE_CATEGORIES = {
  prospection: { label: 'Prospection', icon: 'Target', color: 'text-brand-400' },
  followup: { label: 'Relance', icon: 'RefreshCw', color: 'text-blue-400' },
  nurturing: { label: 'Nurturing', icon: 'Heart', color: 'text-pink-400' },
  closing: { label: 'Closing', icon: 'Trophy', color: 'text-amber-400' },
  reactivation: { label: 'Reactivation', icon: 'RotateCcw', color: 'text-purple-400' },
  custom: { label: 'Personnalise', icon: 'Edit', color: 'text-dark-400' },
}

// Template variables
export const TEMPLATE_VARIABLES = {
  // Prospect
  '{{prenom}}': { label: 'Prenom', example: 'Marie' },
  '{{nom}}': { label: 'Nom', example: 'Dupont' },
  '{{email}}': { label: 'Email', example: 'marie@example.com' },
  '{{entreprise}}': { label: 'Entreprise', example: 'Acme Corp' },
  '{{poste}}': { label: 'Poste', example: 'Directrice Marketing' },
  '{{ville}}': { label: 'Ville', example: 'Paris' },

  // Sender
  '{{expediteur_prenom}}': { label: 'Prenom expediteur', example: 'Jean' },
  '{{expediteur_nom}}': { label: 'Nom expediteur', example: 'Martin' },
  '{{expediteur_email}}': { label: 'Email expediteur', example: 'jean@company.com' },
  '{{expediteur_signature}}': { label: 'Signature', example: 'Jean Martin - CEO' },

  // Dynamic
  '{{date}}': { label: 'Date du jour', example: '15 janvier 2025' },
  '{{heure}}': { label: 'Heure', example: '14h30' },
  '{{lien_calendrier}}': { label: 'Lien Calendly', example: 'https://calendly.com/...' },
  '{{lien_desinscription}}': { label: 'Desinscription', example: 'https://...' },
}

// Channel-specific constraints
export const CHANNEL_CONSTRAINTS = {
  email: {
    maxSubjectLength: 100,
    maxContentLength: 10000,
    supportsHtml: true,
    supportsAttachments: true,
  },
  sms: {
    maxContentLength: 160,
    supportsHtml: false,
    supportsAttachments: false,
    charCountWarning: 'SMS > 160 caracteres = 2 SMS factures',
  },
  whatsapp: {
    maxContentLength: 4096,
    supportsHtml: false,
    supportsAttachments: true,
  },
  instagram_dm: {
    maxContentLength: 1000,
    supportsHtml: false,
    supportsAttachments: true,
  },
  voicemail: {
    maxContentLength: 500,
    supportsHtml: false,
    supportsAttachments: false,
    note: 'Texte converti en audio (TTS)',
  },
  courrier: {
    maxContentLength: 5000,
    supportsHtml: true,
    supportsAttachments: false,
    note: 'Format lettre A4',
  },
}

/**
 * Get templates collection reference
 */
function templatesRef(orgId) {
  return collection(db, 'organizations', orgId, 'templates')
}

/**
 * Create a new template
 */
export async function createTemplate(orgId, templateData, createdBy) {
  const templateRef = doc(templatesRef(orgId))

  const template = {
    name: templateData.name,
    description: templateData.description || null,
    channel: templateData.channel || 'email',
    category: templateData.category || 'custom',

    // Content
    subject: templateData.subject || null, // Email only
    content: templateData.content || '',
    htmlContent: templateData.htmlContent || null, // Email only

    // Voicemail specific
    voiceConfig:
      templateData.channel === 'voicemail'
        ? {
            voice: templateData.voiceConfig?.voice || 'fr-FR-Standard-A',
            speed: templateData.voiceConfig?.speed || 1.0,
            pitch: templateData.voiceConfig?.pitch || 0,
          }
        : null,

    // Courrier specific
    courrierConfig:
      templateData.channel === 'courrier'
        ? {
            format: templateData.courrierConfig?.format || 'A4',
            color: templateData.courrierConfig?.color || false,
            envelope: templateData.courrierConfig?.envelope || 'standard',
          }
        : null,

    // Usage stats
    stats: {
      usageCount: 0,
      lastUsedAt: null,
      avgOpenRate: null,
      avgClickRate: null,
      avgReplyRate: null,
    },

    // Tags for organization
    tags: templateData.tags || [],
    isDefault: templateData.isDefault || false,
    isShared: templateData.isShared || false,

    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy?.uid || null,
  }

  await setDoc(templateRef, template)

  return { id: templateRef.id, ...template }
}

/**
 * Get template by ID
 */
export async function getTemplate(orgId, templateId) {
  const templateDoc = await getDoc(doc(templatesRef(orgId), templateId))
  if (!templateDoc.exists()) return null
  return { id: templateDoc.id, ...templateDoc.data() }
}

/**
 * Get all templates with filters
 */
export async function getTemplates(orgId, options = {}) {
  const { channel, category, search, tags } = options

  let q = query(templatesRef(orgId), orderBy('updatedAt', 'desc'))

  if (channel) {
    q = query(templatesRef(orgId), where('channel', '==', channel), orderBy('updatedAt', 'desc'))
  }

  const snapshot = await getDocs(q)
  let templates = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Client-side filtering
  if (category) {
    templates = templates.filter((t) => t.category === category)
  }

  if (tags?.length > 0) {
    templates = templates.filter((t) => tags.some((tag) => t.tags?.includes(tag)))
  }

  if (search) {
    const searchLower = search.toLowerCase()
    templates = templates.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.subject?.toLowerCase().includes(searchLower) ||
        t.content?.toLowerCase().includes(searchLower)
    )
  }

  return templates
}

/**
 * Update template
 */
export async function updateTemplate(orgId, templateId, updates) {
  const templateRef = doc(templatesRef(orgId), templateId)

  await updateDoc(templateRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete template
 */
export async function deleteTemplate(orgId, templateId) {
  await deleteDoc(doc(templatesRef(orgId), templateId))
}

/**
 * Duplicate template
 */
export async function duplicateTemplate(orgId, templateId, createdBy) {
  const original = await getTemplate(orgId, templateId)
  if (!original) throw new Error('Template non trouve')

  const newTemplate = await createTemplate(
    orgId,
    {
      ...original,
      name: `${original.name} (copie)`,
      isDefault: false,
    },
    createdBy
  )

  return newTemplate
}

/**
 * Record template usage
 */
export async function recordTemplateUsage(orgId, templateId) {
  await updateDoc(doc(templatesRef(orgId), templateId), {
    'stats.usageCount': increment(1),
    'stats.lastUsedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Update template stats from campaign results
 */
export async function updateTemplateStats(orgId, templateId, stats) {
  const template = await getTemplate(orgId, templateId)
  if (!template) return

  // Calculate running averages
  const currentStats = template.stats || {}
  const usageCount = currentStats.usageCount || 1

  await updateDoc(doc(templatesRef(orgId), templateId), {
    'stats.avgOpenRate': calculateAverage(currentStats.avgOpenRate, stats.openRate, usageCount),
    'stats.avgClickRate': calculateAverage(currentStats.avgClickRate, stats.clickRate, usageCount),
    'stats.avgReplyRate': calculateAverage(currentStats.avgReplyRate, stats.replyRate, usageCount),
  })
}

function calculateAverage(currentAvg, newValue, count) {
  if (newValue === null || newValue === undefined) return currentAvg
  if (currentAvg === null || currentAvg === undefined) return newValue
  return (currentAvg * (count - 1) + newValue) / count
}

/**
 * Parse template content with variables
 */
export function parseTemplate(content, variables) {
  let parsed = content

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g')
    parsed = parsed.replace(regex, value || '')
  })

  return parsed
}

/**
 * Validate template content
 */
export function validateTemplate(template) {
  const errors = []
  const constraints = CHANNEL_CONSTRAINTS[template.channel]

  if (!constraints) {
    errors.push('Canal non supporte')
    return errors
  }

  if (!template.name?.trim()) {
    errors.push('Nom requis')
  }

  if (!template.content?.trim()) {
    errors.push('Contenu requis')
  }

  if (template.channel === 'email' && !template.subject?.trim()) {
    errors.push('Objet email requis')
  }

  if (template.content?.length > constraints.maxContentLength) {
    errors.push(`Contenu trop long (max ${constraints.maxContentLength} caracteres)`)
  }

  if (template.subject?.length > (constraints.maxSubjectLength || 200)) {
    errors.push(`Objet trop long (max ${constraints.maxSubjectLength} caracteres)`)
  }

  return errors
}

/**
 * Get template preview with sample data
 */
export function getTemplatePreview(template, sampleProspect = {}) {
  const variables = {
    '{{prenom}}': sampleProspect.firstName || 'Marie',
    '{{nom}}': sampleProspect.lastName || 'Dupont',
    '{{email}}': sampleProspect.email || 'marie@example.com',
    '{{entreprise}}': sampleProspect.company || 'Acme Corp',
    '{{poste}}': sampleProspect.jobTitle || 'Directrice Marketing',
    '{{ville}}': sampleProspect.city || 'Paris',
    '{{date}}': new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    '{{heure}}': new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    '{{expediteur_prenom}}': 'Jean',
    '{{expediteur_nom}}': 'Martin',
    '{{expediteur_email}}': 'jean@company.com',
    '{{expediteur_signature}}': 'Jean Martin\nCEO - My Company',
    '{{lien_calendrier}}': 'https://calendly.com/example',
    '{{lien_desinscription}}': 'https://example.com/unsubscribe',
  }

  return {
    subject: template.subject ? parseTemplate(template.subject, variables) : null,
    content: parseTemplate(template.content, variables),
  }
}

/**
 * Subscribe to templates changes
 */
export function subscribeToTemplates(orgId, callback) {
  return onSnapshot(query(templatesRef(orgId), orderBy('updatedAt', 'desc')), (snapshot) => {
    const templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(templates)
  })
}

/**
 * Create default templates for new org
 */
export async function createDefaultTemplates(orgId, createdBy) {
  const defaultTemplates = [
    {
      name: 'Premier contact',
      channel: 'email',
      category: 'prospection',
      subject: 'Question pour {{entreprise}}',
      content: `Bonjour {{prenom}},

Je me permets de vous contacter car j'ai remarque que {{entreprise}} pourrait beneficier de notre solution.

Seriez-vous disponible pour un echange de 15 minutes cette semaine ?

Bien cordialement,
{{expediteur_signature}}`,
      isDefault: true,
    },
    {
      name: 'Relance douce',
      channel: 'email',
      category: 'followup',
      subject: 'Suite a mon message',
      content: `Bonjour {{prenom}},

Je reviens vers vous suite a mon precedent message.

Avez-vous eu l'occasion d'y reflechir ?

{{expediteur_prenom}}`,
      isDefault: true,
    },
    {
      name: 'SMS de relance',
      channel: 'sms',
      category: 'followup',
      content: `Bonjour {{prenom}}, c'est {{expediteur_prenom}}. Je vous ai envoye un email recemment. Avez-vous 5 min pour en discuter ?`,
      isDefault: true,
    },
  ]

  const batch = writeBatch(db)

  defaultTemplates.forEach((template) => {
    const templateRef = doc(templatesRef(orgId))
    batch.set(templateRef, {
      ...template,
      stats: { usageCount: 0, lastUsedAt: null },
      tags: [],
      isShared: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: createdBy?.uid || null,
    })
  })

  await batch.commit()
}

export default {
  TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
  CHANNEL_CONSTRAINTS,
  createTemplate,
  getTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  recordTemplateUsage,
  updateTemplateStats,
  parseTemplate,
  validateTemplate,
  getTemplatePreview,
  subscribeToTemplates,
  createDefaultTemplates,
}
