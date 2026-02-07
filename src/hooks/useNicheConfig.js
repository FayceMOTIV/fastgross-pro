/**
 * useNicheConfig - Hook pour la configuration de la niche de prospection
 */

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '../contexts/OrgContext'
import { db } from '../lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { DEFAULT_EMAIL_TEMPLATE, AUTOPILOT_CONFIG } from '../engine/config'

// Suggestions de secteurs d'activite
export const SECTOR_SUGGESTIONS = [
  'Restaurant',
  'Boulangerie',
  'Coiffeur',
  'Salon de beaute',
  'Garage automobile',
  'Plombier',
  'Electricien',
  'Agence immobiliere',
  'Avocat',
  'Medecin',
  'Dentiste',
  'Pharmacie',
  'Hotel',
  'Chambre d\'hotes',
  'Fleuriste',
  'Bijouterie',
  'Opticien',
  'Veterinaire',
  'Architecte',
  'Artisan',
  'Cave a vin',
  'Traiteur',
  'Boucherie',
  'Fromagerie',
  'Epicerie fine'
]

// Configuration par defaut
const DEFAULT_CONFIG = {
  enabled: false,
  // Etape 1 - Cible
  sector: '',
  keywords: [],
  location: '',
  radius: 50,
  // Etape 2 - Filtres
  excludeKeywords: [],
  onlyWithWebsite: true,
  excludeContacted: true,
  prospectsPerDay: 30,
  // Etape 3 - Email
  emailTemplate: DEFAULT_EMAIL_TEMPLATE,
  signature: '',
  senderName: '',
  // Etape 4 - Comptes (reference)
  selectedAccountIds: [],
  // Etape 5 - Planification
  sendHour: AUTOPILOT_CONFIG.defaultSendHour,
  sendMinute: AUTOPILOT_CONFIG.defaultSendMinute,
  timezone: AUTOPILOT_CONFIG.defaultTimezone,
  emailsPerDay: AUTOPILOT_CONFIG.defaultEmailsPerDay,
  sendDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  pauseWeekends: true,
  // Google CSE (optionnel)
  googleCseApiKey: '',
  googleCseCxId: '',
  useDirectories: true
}

export function useNicheConfig() {
  const { currentOrg } = useOrg()
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Charger la configuration
  useEffect(() => {
    if (!currentOrg?.id) {
      setConfig(DEFAULT_CONFIG)
      setLoading(false)
      return
    }

    const configRef = doc(db, 'organizations', currentOrg.id, 'autopilotConfig', 'settings')

    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snapshot.data() })
      } else {
        setConfig(DEFAULT_CONFIG)
      }
      setLoading(false)
    }, (err) => {
      console.error('Error fetching niche config:', err)
      setError(err)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentOrg?.id])

  // Sauvegarder la configuration
  const saveConfig = useCallback(async (updates) => {
    if (!currentOrg?.id) throw new Error('Organisation non selectionnee')

    setSaving(true)
    setError(null)

    try {
      const configRef = doc(db, 'organizations', currentOrg.id, 'autopilotConfig', 'settings')

      const newConfig = {
        ...config,
        ...updates,
        updatedAt: serverTimestamp()
      }

      await setDoc(configRef, newConfig, { merge: true })
      setConfig(newConfig)
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [currentOrg?.id, config])

  // Mettre a jour un champ
  const updateField = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }, [])

  // Ajouter un mot-cle
  const addKeyword = useCallback((keyword) => {
    if (!keyword.trim()) return
    setConfig(prev => ({
      ...prev,
      keywords: [...new Set([...prev.keywords, keyword.trim()])]
    }))
  }, [])

  // Supprimer un mot-cle
  const removeKeyword = useCallback((keyword) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }))
  }, [])

  // Ajouter un mot-cle a exclure
  const addExcludeKeyword = useCallback((keyword) => {
    if (!keyword.trim()) return
    setConfig(prev => ({
      ...prev,
      excludeKeywords: [...new Set([...prev.excludeKeywords, keyword.trim()])]
    }))
  }, [])

  // Supprimer un mot-cle a exclure
  const removeExcludeKeyword = useCallback((keyword) => {
    setConfig(prev => ({
      ...prev,
      excludeKeywords: prev.excludeKeywords.filter(k => k !== keyword)
    }))
  }, [])

  // Mettre a jour le template email
  const updateEmailTemplate = useCallback((field, value) => {
    setConfig(prev => ({
      ...prev,
      emailTemplate: {
        ...prev.emailTemplate,
        [field]: value
      }
    }))
  }, [])

  // Reinitialiser le template email
  const resetEmailTemplate = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      emailTemplate: DEFAULT_EMAIL_TEMPLATE
    }))
  }, [])

  // Ajouter/retirer un jour d'envoi
  const toggleSendDay = useCallback((day) => {
    setConfig(prev => ({
      ...prev,
      sendDays: prev.sendDays.includes(day)
        ? prev.sendDays.filter(d => d !== day)
        : [...prev.sendDays, day]
    }))
  }, [])

  // Valider la configuration
  const validateConfig = useCallback(() => {
    const errors = []

    if (!config.sector && config.keywords.length === 0) {
      errors.push('Vous devez definir un secteur ou des mots-cles')
    }

    if (!config.location) {
      errors.push('Vous devez definir une localisation')
    }

    if (!config.emailTemplate?.subject || !config.emailTemplate?.body) {
      errors.push('Le template email est incomplet')
    }

    if (config.sendDays.length === 0) {
      errors.push('Vous devez selectionner au moins un jour d\'envoi')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }, [config])

  // Activer l'autopilot avec la config actuelle
  const activateAutoPilot = useCallback(async () => {
    const validation = validateConfig()
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '))
    }

    await saveConfig({ enabled: true })
  }, [validateConfig, saveConfig])

  // Desactiver l'autopilot
  const deactivateAutoPilot = useCallback(async () => {
    await saveConfig({ enabled: false })
  }, [saveConfig])

  // Tester la cle Google CSE
  const testGoogleCse = useCallback(async () => {
    if (!config.googleCseApiKey || !config.googleCseCxId) {
      throw new Error('Cle API ou CX ID manquant')
    }

    const testQuery = config.keywords[0] || config.sector || 'test'
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1` +
      `?key=${config.googleCseApiKey}` +
      `&cx=${config.googleCseCxId}` +
      `&q=${encodeURIComponent(testQuery)}&num=1`
    )

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message)
    }

    return { success: true, results: data.searchInformation?.totalResults || 0 }
  }, [config])

  return {
    config,
    loading,
    saving,
    error,
    saveConfig,
    updateField,
    addKeyword,
    removeKeyword,
    addExcludeKeyword,
    removeExcludeKeyword,
    updateEmailTemplate,
    resetEmailTemplate,
    toggleSendDay,
    validateConfig,
    activateAutoPilot,
    deactivateAutoPilot,
    testGoogleCse,
    SECTOR_SUGGESTIONS
  }
}

export default useNicheConfig
