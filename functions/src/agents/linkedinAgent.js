/**
 * LinkedIn Agent — Cloud Function HTTP handler (remplace BullMQ linkedin worker)
 *
 * Appele par Cloud Tasks via la queue fmf-linkedin.
 * Rate limit : 1 action / 90s (gere par Cloud Tasks queue config)
 * Actions : visitProfile, sendConnectionRequest, sendMessage
 *
 * Utilise HeyReach API quand configure, sinon enregistre l'engagement
 * pour execution manuelle.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

export const linkedinAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 2,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    const startTime = Date.now()
    const payload = req.body
    const { orgId, prospectId, action, template, accountId } = payload

    if (!orgId || !prospectId || !action) {
      res.status(400).json({ error: 'Missing required fields: orgId, prospectId, action' })
      return
    }

    logger.info(`[linkedinAgent] Processing ${action} for prospect ${prospectId} in org ${orgId}`)

    try {
      const db = getDb()

      // Charger prospect
      const prospectDoc = await db
        .collection('organizations').doc(orgId)
        .collection('prospects').doc(prospectId)
        .get()

      if (!prospectDoc.exists) {
        res.status(200).json({ skipped: true, reason: 'prospect_not_found' })
        return
      }

      const prospect = { id: prospectId, ...prospectDoc.data() }
      const linkedinUrl = prospect.linkedinUrl || prospect.channels?.linkedin?.profileUrl

      if (!linkedinUrl) {
        res.status(200).json({ skipped: true, reason: 'no_linkedin_url' })
        return
      }

      // Verifier si HeyReach est configure
      const heyreachKey = process.env.HEYREACH_API_KEY
      let heyreachAvailable = false
      let linkedinService = null

      if (heyreachKey) {
        try {
          const module = await import('../hunters/linkedin/linkedinService.js')
          linkedinService = module
          heyreachAvailable = true
        } catch {
          // Module pas disponible, fallback
        }
      }

      // ─── VISIT PROFILE ────────────────────────────────────────────────
      if (action === 'visitProfile') {
        let heyreachSuccess = false
        if (heyreachAvailable && linkedinService) {
          try {
            await linkedinService.visitProfile(accountId, linkedinUrl)
            heyreachSuccess = true
          } catch (err) {
            logger.warn(`[linkedinAgent] HeyReach visitProfile failed:`, err.message)
          }
        }

        await prospectDoc.ref.update({
          'engagement.linkedinVisitedAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
        })

        const duration = Date.now() - startTime
        res.status(200).json({
          success: heyreachSuccess, action, prospectId, duration,
          via: heyreachSuccess ? 'heyreach' : 'recorded',
          warning: !heyreachSuccess ? 'HeyReach action failed, engagement recorded only' : undefined
        })
        return
      }

      // ─── SEND CONNECTION REQUEST ──────────────────────────────────────
      if (action === 'sendConnectionRequest') {
        const note = template?.connectionNote || template?.message || ''

        let heyreachSuccess = false
        if (heyreachAvailable && linkedinService) {
          try {
            await linkedinService.sendConnectionRequest(accountId, linkedinUrl, note)
            heyreachSuccess = true
          } catch (err) {
            logger.warn(`[linkedinAgent] HeyReach connect failed:`, err.message)
          }
        }

        await prospectDoc.ref.update({
          'engagement.linkedinConnectSentAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
          'engagement.activeChannel': 'linkedin',
        })

        const duration = Date.now() - startTime
        res.status(200).json({
          success: heyreachSuccess, action, prospectId, duration,
          note: note.substring(0, 50),
          via: heyreachSuccess ? 'heyreach' : 'recorded',
          warning: !heyreachSuccess ? 'HeyReach action failed, engagement recorded only' : undefined
        })
        return
      }

      // ─── SEND MESSAGE ─────────────────────────────────────────────────
      if (action === 'sendMessage') {
        const message = template?.message || template?.text || ''

        let heyreachSuccess = false
        if (heyreachAvailable && linkedinService) {
          try {
            await linkedinService.sendMessage(accountId, linkedinUrl, message)
            heyreachSuccess = true
          } catch (err) {
            logger.warn(`[linkedinAgent] HeyReach message failed:`, err.message)
          }
        }

        await prospectDoc.ref.update({
          'engagement.linkedinMessagedAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
          'engagement.activeChannel': 'linkedin',
          lastContactedAt: FieldValue.serverTimestamp(),
        })

        const duration = Date.now() - startTime
        res.status(200).json({
          success: heyreachSuccess, action, prospectId, duration,
          via: heyreachSuccess ? 'heyreach' : 'recorded',
          warning: !heyreachSuccess ? 'HeyReach action failed, engagement recorded only' : undefined
        })
        return
      }

      // Action inconnue
      res.status(200).json({ skipped: true, reason: `unknown_action: ${action}` })
    } catch (error) {
      logger.error(`[linkedinAgent] Error:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)
