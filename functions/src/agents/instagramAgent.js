/**
 * Instagram Agent — Cloud Function HTTP handler (remplace BullMQ instagram worker)
 *
 * Appele par Cloud Tasks via la queue fmf-instagram.
 * Rate limit : 1 msg / 10s (gere par Cloud Tasks queue config)
 * Actions : sendDM, warmup_follow, warmup_likes
 *
 * Note: Les actions browser (Playwright) du VPS sont remplacees par
 * l'API Meta Graph (sendInstagramDM) via channelDispatcher.
 * Les warmup actions (follow, likes) utilisent l'API Meta ou sont
 * enregistrees comme engagement sans action API reelle.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

const getDb = () => getFirestore()

export const instagramAgentHandler = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
    maxInstances: 3,
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

    logger.info(`[instagramAgent] Processing ${action} for prospect ${prospectId} in org ${orgId}`)

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
      const igHandle = prospect.channels?.instagram?.handle || prospect.instagramHandle || prospect.instagram

      if (!igHandle) {
        res.status(200).json({ skipped: true, reason: 'no_instagram_handle' })
        return
      }

      // ─── WARMUP FOLLOW (enregistrer l'engagement, pas d'API call) ──────
      if (action === 'warmup_follow') {
        await prospectDoc.ref.update({
          'engagement.instagramFollowedAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
        })

        logger.info(`[instagramAgent] Warmup follow recorded for ${igHandle}`)
        res.status(200).json({ success: true, action: 'warmup_follow', username: igHandle })
        return
      }

      // ─── WARMUP LIKES (enregistrer l'engagement) ──────────────────────
      if (action === 'warmup_likes') {
        await prospectDoc.ref.update({
          'engagement.instagramLikedAt': new Date().toISOString(),
          'engagement.touchpoints': FieldValue.increment(1),
          'engagement.lastTouchAt': new Date().toISOString(),
        })

        logger.info(`[instagramAgent] Warmup likes recorded for ${igHandle}`)
        res.status(200).json({ success: true, action: 'warmup_likes', username: igHandle })
        return
      }

      // ─── SEND DM (via Meta Graph API / channelDispatcher) ─────────────
      if (action === 'sendDM') {
        const { dispatchMessage } = await import('../engine/channelDispatcher.js')

        const content = {
          text: template?.message || template?.text || '',
          quickReplies: template?.quickReplies,
          mediaUrl: template?.mediaUrl,
        }

        const result = await dispatchMessage(orgId, prospectId, {
          channel: 'instagram',
          content,
          fallbackChannels: [],
        })

        if (result.success) {
          await prospectDoc.ref.update({
            'engagement.instagramDMedAt': new Date().toISOString(),
            'engagement.touchpoints': FieldValue.increment(1),
            'engagement.lastTouchAt': new Date().toISOString(),
            'engagement.activeChannel': 'instagram',
            lastContactedAt: FieldValue.serverTimestamp(),
          })
        }

        const duration = Date.now() - startTime
        logger.info(`[instagramAgent] sendDM for ${prospectId}: success=${result.success} duration=${duration}ms`)

        res.status(200).json({
          success: result.success,
          action,
          prospectId,
          duration,
          error: result.error || null,
        })
        return
      }

      // Action inconnue
      res.status(200).json({ skipped: true, reason: `unknown_action: ${action}` })
    } catch (error) {
      logger.error(`[instagramAgent] Error:`, error)
      res.status(500).json({ error: error.message })
    }
  }
)
