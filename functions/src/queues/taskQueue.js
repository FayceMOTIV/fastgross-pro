/**
 * Cloud Tasks Queue Manager — Remplace BullMQ pour l'execution serverless
 *
 * Fournit un wrapper unifie pour creer des taches Cloud Tasks
 * avec rate limiting, retry et delay par canal.
 *
 * Usage:
 *   import { enqueueTask } from './queues/taskQueue.js'
 *   await enqueueTask('email', { orgId, prospectId, action: 'sendEmail', ... })
 *   await enqueueTask('whatsapp', { orgId, prospectId, action: 'sendDM', ... }, { delaySeconds: 30 })
 */

import { CloudTasksClient } from '@google-cloud/tasks'
import { logger } from 'firebase-functions/v2'

const tasksClient = new CloudTasksClient()

// ─── QUEUE CONFIG (remplace BullMQ limiter + concurrency) ────────────────────

const QUEUE_CONFIG = {
  email: {
    queueName: 'fmf-email',
    maxDispatchesPerSecond: 5,
    maxConcurrentDispatches: 5,
    retryAttempts: 3,
    minBackoffSeconds: 60,
    maxBackoffSeconds: 1500,  // 25min
    handlerPath: '/agents/email',
  },
  whatsapp: {
    queueName: 'fmf-whatsapp',
    maxDispatchesPerSecond: 0.25,  // 1 msg / 4s
    maxConcurrentDispatches: 1,
    retryAttempts: 2,
    minBackoffSeconds: 300,  // 5min
    maxBackoffSeconds: 300,
    handlerPath: '/agents/whatsapp',
  },
  instagram: {
    queueName: 'fmf-instagram',
    maxDispatchesPerSecond: 0.1,  // 1 msg / 10s
    maxConcurrentDispatches: 1,
    retryAttempts: 2,
    minBackoffSeconds: 600,  // 10min
    maxBackoffSeconds: 600,
    handlerPath: '/agents/instagram',
  },
  linkedin: {
    queueName: 'fmf-linkedin',
    maxDispatchesPerSecond: 0.011,  // ~1 msg / 90s
    maxConcurrentDispatches: 1,
    retryAttempts: 2,
    minBackoffSeconds: 1800,  // 30min
    maxBackoffSeconds: 1800,
    handlerPath: '/agents/linkedin',
  },
  orchestrator: {
    queueName: 'fmf-orchestrator',
    maxDispatchesPerSecond: 10,
    maxConcurrentDispatches: 10,
    retryAttempts: 3,
    minBackoffSeconds: 5,
    maxBackoffSeconds: 300,
    handlerPath: '/agents/orchestrator',
  },
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getProjectId() {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.FIREBASE_PROJECT_ID || ''
}

function getLocation() {
  return process.env.FUNCTION_REGION || 'europe-west1'
}

function getServiceUrl() {
  const projectId = getProjectId()
  const region = getLocation()
  return `https://${region}-${projectId}.cloudfunctions.net`
}

// ─── ENSURE QUEUE EXISTS ─────────────────────────────────────────────────────

const createdQueues = new Set()

async function ensureQueueExists(channel) {
  const config = QUEUE_CONFIG[channel]
  if (!config) throw new Error(`Unknown channel queue: ${channel}`)

  const queueKey = `${getProjectId()}-${config.queueName}`
  if (createdQueues.has(queueKey)) return

  const parent = tasksClient.locationPath(getProjectId(), getLocation())
  const queuePath = tasksClient.queuePath(getProjectId(), getLocation(), config.queueName)

  try {
    await tasksClient.getQueue({ name: queuePath })
    createdQueues.add(queueKey)
  } catch (err) {
    if (err.code === 5) {
      // NOT_FOUND — creer la queue
      logger.info(`[taskQueue] Creating queue ${config.queueName}`)
      await tasksClient.createQueue({
        parent,
        queue: {
          name: queuePath,
          rateLimits: {
            maxDispatchesPerSecond: config.maxDispatchesPerSecond,
            maxConcurrentDispatches: config.maxConcurrentDispatches,
          },
          retryConfig: {
            maxAttempts: config.retryAttempts,
            minBackoff: { seconds: config.minBackoffSeconds },
            maxBackoff: { seconds: config.maxBackoffSeconds },
          },
        },
      })
      createdQueues.add(queueKey)
    } else {
      throw err
    }
  }
}

// ─── ENQUEUE TASK ────────────────────────────────────────────────────────────

/**
 * Cree une tache Cloud Tasks pour un canal donne
 * @param {string} channel - email | whatsapp | instagram | linkedin | orchestrator
 * @param {Object} payload - Donnees du job (orgId, prospectId, action, etc.)
 * @param {Object} options
 * @param {number} [options.delaySeconds=0] - Delai avant execution
 * @param {string} [options.taskId] - ID unique pour deduplication
 * @returns {Object} { taskName, channel, scheduledTime }
 */
export async function enqueueTask(channel, payload, options = {}) {
  const config = QUEUE_CONFIG[channel]
  if (!config) {
    throw new Error(`Unknown channel: ${channel}. Valid: ${Object.keys(QUEUE_CONFIG).join(', ')}`)
  }

  await ensureQueueExists(channel)

  const queuePath = tasksClient.queuePath(getProjectId(), getLocation(), config.queueName)
  const serviceUrl = getServiceUrl()
  const url = `${serviceUrl}${config.handlerPath}`

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify({
        ...payload,
        _channel: channel,
        _enqueuedAt: new Date().toISOString(),
      })).toString('base64'),
      oidcToken: {
        serviceAccountEmail: `${getProjectId()}@appspot.gserviceaccount.com`,
      },
    },
  }

  // Delai optionnel
  if (options.delaySeconds && options.delaySeconds > 0) {
    task.scheduleTime = {
      seconds: Math.floor(Date.now() / 1000) + options.delaySeconds,
    }
  }

  // Task ID pour deduplication
  if (options.taskId) {
    task.name = `${queuePath}/tasks/${options.taskId}`
  }

  try {
    const [response] = await tasksClient.createTask({ parent: queuePath, task })

    logger.info(`[taskQueue] Enqueued ${channel} task`, {
      taskName: response.name,
      action: payload.action,
      orgId: payload.orgId,
      prospectId: payload.prospectId,
      delay: options.delaySeconds || 0,
    })

    return {
      taskName: response.name,
      channel,
      scheduledTime: task.scheduleTime ? new Date(task.scheduleTime.seconds * 1000).toISOString() : 'immediate',
    }
  } catch (error) {
    // Si la tache existe deja (deduplication), ne pas echouer
    if (error.code === 6) {
      logger.info(`[taskQueue] Task already exists (deduplicated): ${options.taskId}`)
      return { taskName: options.taskId, channel, deduplicated: true }
    }
    logger.error(`[taskQueue] Failed to enqueue ${channel} task:`, error)
    throw error
  }
}

// ─── ENQUEUE BATCH ───────────────────────────────────────────────────────────

/**
 * Enqueue plusieurs taches avec delai inter-messages
 * @param {string} channel
 * @param {Array} payloads
 * @param {Object} options
 * @param {number} [options.interMessageDelay=0] - Delai entre chaque message en secondes
 * @returns {Object} { enqueued, failed, tasks }
 */
export async function enqueueBatch(channel, payloads, options = {}) {
  const results = { enqueued: 0, failed: 0, tasks: [] }
  const interDelay = options.interMessageDelay || 0

  for (let i = 0; i < payloads.length; i++) {
    try {
      const delaySeconds = (options.delaySeconds || 0) + (i * interDelay)
      const taskId = options.taskIdPrefix
        ? `${options.taskIdPrefix}-${payloads[i].prospectId || i}-${Date.now()}`
        : undefined

      const result = await enqueueTask(channel, payloads[i], {
        delaySeconds,
        taskId,
      })

      results.enqueued++
      results.tasks.push(result)
    } catch (error) {
      results.failed++
      logger.error(`[taskQueue] Batch enqueue failed for item ${i}:`, error)
    }
  }

  return results
}

// ─── DELETE TASK ─────────────────────────────────────────────────────────────

/**
 * Supprime une tache en attente (ex: annulation)
 */
export async function deleteTask(taskName) {
  try {
    await tasksClient.deleteTask({ name: taskName })
    logger.info(`[taskQueue] Deleted task: ${taskName}`)
    return { deleted: true }
  } catch (error) {
    if (error.code === 5) {
      return { deleted: false, reason: 'not_found' }
    }
    throw error
  }
}

// ─── PURGE QUEUE ─────────────────────────────────────────────────────────────

/**
 * Purge toutes les taches d'une queue (urgence)
 */
export async function purgeQueue(channel) {
  const config = QUEUE_CONFIG[channel]
  if (!config) throw new Error(`Unknown channel: ${channel}`)

  const queuePath = tasksClient.queuePath(getProjectId(), getLocation(), config.queueName)

  try {
    await tasksClient.purgeQueue({ name: queuePath })
    logger.info(`[taskQueue] Purged queue: ${config.queueName}`)
    return { purged: true, queue: config.queueName }
  } catch (error) {
    logger.error(`[taskQueue] Failed to purge queue ${config.queueName}:`, error)
    throw error
  }
}

// ─── PAUSE / RESUME QUEUE ────────────────────────────────────────────────────

/**
 * Met en pause une queue (arrete le dispatching)
 */
export async function pauseQueue(channel) {
  const config = QUEUE_CONFIG[channel]
  if (!config) throw new Error(`Unknown channel: ${channel}`)

  const queuePath = tasksClient.queuePath(getProjectId(), getLocation(), config.queueName)
  await tasksClient.pauseQueue({ name: queuePath })
  logger.info(`[taskQueue] Paused queue: ${config.queueName}`)
  return { paused: true, queue: config.queueName }
}

/**
 * Reprend une queue en pause
 */
export async function resumeQueue(channel) {
  const config = QUEUE_CONFIG[channel]
  if (!config) throw new Error(`Unknown channel: ${channel}`)

  const queuePath = tasksClient.queuePath(getProjectId(), getLocation(), config.queueName)
  await tasksClient.resumeQueue({ name: queuePath })
  logger.info(`[taskQueue] Resumed queue: ${config.queueName}`)
  return { resumed: true, queue: config.queueName }
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export { QUEUE_CONFIG }
