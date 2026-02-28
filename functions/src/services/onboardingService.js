/**
 * Onboarding Service — Wizard setup client en 5 etapes
 * Valide et sauvegarde la configuration initiale des canaux + prospection
 *
 * Etapes:
 * 1. Infos entreprise (nom, secteur, cible, site web)
 * 2. WhatsApp / Evolution API (URL, API key, instance, test connexion)
 * 3. Email (SMTP ou Instantly) (host, port, user, pass, from)
 * 4. Reseaux sociaux (Typefully, Instagram handle, LinkedIn API)
 * 5. Prospection (business hours, timezone, budget quotidien, lead factory)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import axios from 'axios'

const getDb = () => getFirestore()

// --- Validation helpers ---

function validateStep1(data) {
  const errors = []
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.push('Nom de l\'entreprise requis (min 2 caracteres)')
  }
  if (!data.industry || data.industry.trim().length < 2) {
    errors.push('Secteur d\'activite requis')
  }
  if (!data.targetAudience || data.targetAudience.trim().length < 5) {
    errors.push('Cible prospect requise (min 5 caracteres)')
  }
  return { valid: errors.length === 0, errors }
}

function validateStep2(data) {
  const errors = []
  if (data.whatsappEnabled) {
    if (!data.evolutionApiUrl || !data.evolutionApiUrl.startsWith('http')) {
      errors.push('URL Evolution API invalide (doit commencer par http)')
    }
    if (!data.evolutionApiKey || data.evolutionApiKey.length < 5) {
      errors.push('Cle API Evolution requise')
    }
    if (!data.evolutionInstanceName || data.evolutionInstanceName.length < 2) {
      errors.push('Nom d\'instance Evolution requis')
    }
  }
  return { valid: errors.length === 0, errors }
}

function validateStep3(data) {
  const errors = []
  if (data.emailEnabled) {
    if (data.emailProvider === 'smtp') {
      if (!data.smtpHost) errors.push('Serveur SMTP requis')
      if (!data.smtpUser) errors.push('Utilisateur SMTP requis')
      if (!data.smtpPass) errors.push('Mot de passe SMTP requis')
      if (!data.emailFrom) errors.push('Email expediteur requis')
    } else if (data.emailProvider === 'instantly') {
      if (!data.instantlyApiKey || data.instantlyApiKey.length < 10) {
        errors.push('Cle API Instantly requise')
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

function validateStep4(data) {
  // Social channels are optional, no hard validation
  return { valid: true, errors: [] }
}

function validateStep5(data) {
  const errors = []
  if (data.dailyBudget && (data.dailyBudget < 1 || data.dailyBudget > 1000)) {
    errors.push('Budget quotidien doit etre entre 1 et 1000 messages')
  }
  if (data.businessHoursStart >= data.businessHoursEnd) {
    errors.push('L\'heure de debut doit etre avant l\'heure de fin')
  }
  return { valid: errors.length === 0, errors }
}

const STEP_VALIDATORS = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
  5: validateStep5,
}

// --- Test connexion WhatsApp (Evolution API) ---

async function testEvolutionConnection(apiUrl, apiKey, instanceName) {
  try {
    const url = `${apiUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`
    const response = await axios.get(url, {
      headers: { apikey: apiKey },
      timeout: 8000,
    })

    const state = response.data?.instance?.state || response.data?.state
    return {
      connected: state === 'open' || state === 'connected',
      state: state || 'unknown',
      message: state === 'open' ? 'WhatsApp connecte' : `Etat: ${state}`,
    }
  } catch (error) {
    return {
      connected: false,
      state: 'error',
      message: error.response?.data?.message || error.message,
    }
  }
}

// --- Test connexion SMTP ---

async function testSmtpConfig(host, port, user, pass) {
  // Validation basique — le vrai test SMTP se fait cote client via testSmtpConnection existant
  const validHosts = [host.includes('.')]
  const validPort = [25, 465, 587, 2525].includes(Number(port))
  return {
    valid: validHosts[0] && validPort,
    message: validHosts[0] && validPort
      ? 'Configuration SMTP valide'
      : 'Verifiez le serveur et le port SMTP',
  }
}

// --- Cloud Function: Valider une etape ---

export const validateSetupStep = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId, step, data } = request.data

    if (!orgId || !step || !data) {
      throw new HttpsError('invalid-argument', 'orgId, step et data sont requis')
    }

    if (step < 1 || step > 5) {
      throw new HttpsError('invalid-argument', 'Etape invalide (1-5)')
    }

    const db = getDb()

    // Verifier l'acces a l'org
    const memberDoc = await db
      .collection('organizations').doc(orgId)
      .collection('members').doc(request.auth.uid)
      .get()

    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Acces refuse')
    }

    // Valider l'etape
    const validator = STEP_VALIDATORS[step]
    const validation = validator(data)

    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    // Tests de connexion supplementaires pour certaines etapes
    let connectionTest = null

    if (step === 2 && data.whatsappEnabled) {
      connectionTest = await testEvolutionConnection(
        data.evolutionApiUrl,
        data.evolutionApiKey,
        data.evolutionInstanceName
      )
    }

    if (step === 3 && data.emailEnabled && data.emailProvider === 'smtp') {
      connectionTest = await testSmtpConfig(
        data.smtpHost,
        data.smtpPort || 587,
        data.smtpUser,
        data.smtpPass
      )
    }

    // Sauvegarder la progression
    await db.collection('organizations').doc(orgId).collection('setupProgress').doc(`step${step}`).set({
      step,
      data,
      validation,
      connectionTest,
      completedAt: FieldValue.serverTimestamp(),
      completedBy: request.auth.uid,
    })

    logger.info(`[Onboarding] Step ${step} validated for org:${orgId}`, {
      step,
      valid: validation.valid,
      connectionTest: connectionTest?.connected,
    })

    return {
      success: true,
      connectionTest,
    }
  }
)

// --- Cloud Function: Finaliser le setup (etape 5 complete) ---

export const completeClientSetup = onCall(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId } = request.data

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()

    // Verifier l'acces
    const memberDoc = await db
      .collection('organizations').doc(orgId)
      .collection('members').doc(request.auth.uid)
      .get()

    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Acces refuse')
    }

    // Recuperer toutes les etapes sauvegardees
    const stepsSnap = await db
      .collection('organizations').doc(orgId)
      .collection('setupProgress')
      .get()

    const steps = {}
    stepsSnap.docs.forEach((d) => {
      steps[d.id] = d.data()
    })

    // Verifier que les 5 etapes sont completes
    const requiredSteps = ['step1', 'step2', 'step3', 'step4', 'step5']
    const missing = requiredSteps.filter((s) => !steps[s])
    if (missing.length > 0) {
      throw new HttpsError('failed-precondition', `Etapes manquantes: ${missing.join(', ')}`)
    }

    // Construire la config finale
    const step1 = steps.step1.data
    const step2 = steps.step2.data
    const step3 = steps.step3.data
    const step4 = steps.step4.data
    const step5 = steps.step5.data

    const orgUpdate = {
      // Step 1: Infos entreprise
      companyName: step1.companyName,
      industry: step1.industry,
      targetAudience: step1.targetAudience,
      website: step1.website || '',

      // Step 2: WhatsApp
      'channels.whatsapp.enabled': step2.whatsappEnabled || false,
      'channels.whatsapp.provider': 'evolution',

      // Step 3: Email
      'channels.email.enabled': step3.emailEnabled !== false,
      'channels.email.provider': step3.emailProvider || 'smtp',

      // Step 4: Social
      'channels.instagram.enabled': step4.instagramEnabled || false,
      'channels.linkedin.enabled': step4.linkedinEnabled || false,

      // Step 5: Prospection
      timezone: step5.timezone || 'Europe/Paris',
      businessHours: {
        start: step5.businessHoursStart || 8,
        end: step5.businessHoursEnd || 20,
      },
      dailyBudget: {
        total: step5.dailyBudget || 50,
      },
      prospectionEnabled: step5.autoStart || false,

      // Lead factory
      leadFactory: {
        threshold: step5.pipelineThreshold || 50,
        autoRefill: step5.autoRefill !== false,
        queries: step5.queries || [],
        locations: step5.locations || [],
      },

      // Setup complete
      setupComplete: true,
      setupCompletedAt: FieldValue.serverTimestamp(),
      setupCompletedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await db.collection('organizations').doc(orgId).update(orgUpdate)

    // Sauvegarder les secrets dans settings/secrets (subcollection securisee)
    const secrets = {}

    if (step2.whatsappEnabled) {
      secrets.evolutionApiUrl = step2.evolutionApiUrl
      secrets.evolutionApiKey = step2.evolutionApiKey
      secrets.evolutionInstanceName = step2.evolutionInstanceName
    }

    if (step3.emailEnabled) {
      if (step3.emailProvider === 'smtp') {
        secrets.smtpHost = step3.smtpHost
        secrets.smtpPort = step3.smtpPort || 587
        secrets.smtpUser = step3.smtpUser
        secrets.smtpPass = step3.smtpPass
        secrets.emailFrom = step3.emailFrom
      } else if (step3.emailProvider === 'instantly') {
        secrets.instantlyApiKey = step3.instantlyApiKey
      }
    }

    if (step4.typefullyApiKey) {
      secrets.typefullyApiKey = step4.typefullyApiKey
    }
    if (step4.linkedinApiKey) {
      secrets.linkedinApiKey = step4.linkedinApiKey
    }

    if (Object.keys(secrets).length > 0) {
      secrets.updatedAt = FieldValue.serverTimestamp()
      await db.collection('organizations').doc(orgId)
        .collection('settings').doc('secrets').set(secrets, { merge: true })
    }

    logger.info(`[Onboarding] Setup complete for org:${orgId}`, {
      channels: {
        whatsapp: step2.whatsappEnabled,
        email: step3.emailEnabled,
        instagram: step4.instagramEnabled,
        linkedin: step4.linkedinEnabled,
      },
      prospectionEnabled: step5.autoStart,
    })

    return {
      success: true,
      channels: {
        whatsapp: step2.whatsappEnabled || false,
        email: step3.emailEnabled !== false,
        instagram: step4.instagramEnabled || false,
        linkedin: step4.linkedinEnabled || false,
      },
      prospectionEnabled: step5.autoStart || false,
    }
  }
)

// --- Cloud Function: Recuperer la progression du setup ---

export const getSetupProgress = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 15,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez etre connecte')
    }

    const { orgId } = request.data

    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requis')
    }

    const db = getDb()

    const memberDoc = await db
      .collection('organizations').doc(orgId)
      .collection('members').doc(request.auth.uid)
      .get()

    if (!memberDoc.exists) {
      throw new HttpsError('permission-denied', 'Acces refuse')
    }

    // Recuperer la progression
    const stepsSnap = await db
      .collection('organizations').doc(orgId)
      .collection('setupProgress')
      .get()

    const progress = {}
    stepsSnap.docs.forEach((d) => {
      const stepData = d.data()
      progress[d.id] = {
        completed: true,
        data: stepData.data,
        connectionTest: stepData.connectionTest,
        completedAt: stepData.completedAt,
      }
    })

    // Verifier si le setup est deja termine
    const orgDoc = await db.collection('organizations').doc(orgId).get()
    const setupComplete = orgDoc.exists && orgDoc.data()?.setupComplete === true

    return {
      progress,
      setupComplete,
      currentStep: Object.keys(progress).length + 1,
      totalSteps: 5,
    }
  }
)
