/**
 * Kill Switch Manager — Per-module toggle + auto-pause
 *
 * Modules pausables :
 * scans, emails, sequences, warming, whatsapp, sms, linkedin, instagram, voice
 *
 * Stocke dans organizations/{orgId}/alexConfig/moduleStatus
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const getDb = () => getFirestore()

const PAUSABLE_MODULES = [
  'scans', 'emails', 'sequences', 'warming',
  'whatsapp', 'sms', 'linkedin', 'instagram', 'voice',
  'hunters', 'enrichment', 'posting',
]

// ============================================
// CORE — isModulePaused
// ============================================

/**
 * Verifie si un module est en pause pour une org
 * @param {string} orgId
 * @param {string} moduleName
 * @returns {boolean}
 */
export async function isModulePaused(orgId, moduleName) {
  if (!orgId || !moduleName) return false

  const db = getDb()
  try {
    const configDoc = await db.doc(`organizations/${orgId}/alexConfig/moduleStatus`).get()
    if (!configDoc.exists) return false

    const config = configDoc.data()

    // Global pause override
    if (config.globalPause === true) return true

    // Module-specific pause
    return config[moduleName]?.paused === true
  } catch {
    return false
  }
}

// ============================================
// CORE — pauseModule / resumeModule
// ============================================

async function setModuleState(orgId, moduleName, paused, reason = '') {
  if (!PAUSABLE_MODULES.includes(moduleName)) {
    throw new Error(`Module inconnu: ${moduleName}. Modules valides: ${PAUSABLE_MODULES.join(', ')}`)
  }

  const db = getDb()
  const configRef = db.doc(`organizations/${orgId}/alexConfig/moduleStatus`)

  await configRef.set({
    [moduleName]: {
      paused,
      reason: reason || (paused ? 'manual' : 'resumed'),
      updatedAt: FieldValue.serverTimestamp(),
    },
  }, { merge: true })

  // Log
  await db.collection(`organizations/${orgId}/alexConfig/moduleHistory`).add({
    module: moduleName,
    action: paused ? 'paused' : 'resumed',
    reason,
    timestamp: FieldValue.serverTimestamp(),
  })

  return { module: moduleName, paused, reason }
}

// ============================================
// CORE — globalPause / globalResume
// ============================================

async function setGlobalPause(orgId, paused, reason = '') {
  const db = getDb()
  const configRef = db.doc(`organizations/${orgId}/alexConfig/moduleStatus`)

  await configRef.set({
    globalPause: paused,
    globalPauseReason: reason || (paused ? 'manual' : 'resumed'),
    globalPauseUpdatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  // Aussi mettre a jour prospectionEnabled sur l'org
  if (paused) {
    await db.doc(`organizations/${orgId}`).update({
      prospectionEnabled: false,
      prospectionPausedReason: reason || 'kill_switch',
      prospectionPausedAt: FieldValue.serverTimestamp(),
    })
  }

  await db.collection(`organizations/${orgId}/alexConfig/moduleHistory`).add({
    module: 'GLOBAL',
    action: paused ? 'paused' : 'resumed',
    reason,
    timestamp: FieldValue.serverTimestamp(),
  })

  return { module: 'GLOBAL', paused, reason }
}

// ============================================
// INTERNAL — auto-pause (appele par userInactivityHandler)
// ============================================

export async function alexAutoInactivityPause(orgId, reason) {
  return setGlobalPause(orgId, true, reason || 'auto_inactivity')
}

// ============================================
// CALLABLES
// ============================================

export const pauseAlexModule = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId, module: moduleName, reason } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  if (moduleName === 'GLOBAL' || moduleName === 'all') {
    return setGlobalPause(orgId, true, reason || 'manual')
  }

  if (!moduleName) throw new HttpsError('invalid-argument', 'module requis')

  return setModuleState(orgId, moduleName, true, reason || 'manual')
})

export const resumeAlexModule = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId, module: moduleName } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  if (moduleName === 'GLOBAL' || moduleName === 'all') {
    return setGlobalPause(orgId, false, 'manual_resume')
  }

  if (!moduleName) throw new HttpsError('invalid-argument', 'module requis')

  return setModuleState(orgId, moduleName, false, 'manual_resume')
})

export const getAlexModuleStatus = onCall({
  region: 'europe-west1',
  memory: '256MiB',
}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Auth requise')

  const { orgId } = request.data || {}
  if (!orgId) throw new HttpsError('invalid-argument', 'orgId requis')

  const db = getDb()
  const configDoc = await db.doc(`organizations/${orgId}/alexConfig/moduleStatus`).get()
  const config = configDoc.exists ? configDoc.data() : {}

  const modules = {}
  for (const mod of PAUSABLE_MODULES) {
    modules[mod] = {
      paused: config.globalPause === true || config[mod]?.paused === true,
      pausedByGlobal: config.globalPause === true,
      reason: config[mod]?.reason || null,
      updatedAt: config[mod]?.updatedAt?.toDate?.()?.toISOString() || null,
    }
  }

  return {
    globalPause: config.globalPause || false,
    globalPauseReason: config.globalPauseReason || null,
    modules,
    availableModules: PAUSABLE_MODULES,
  }
})
