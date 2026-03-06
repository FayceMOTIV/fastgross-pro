/**
 * Alerts Engine — Firestore trigger-based notifications
 * Monitors key events and sends WhatsApp + in-app notifications
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { defineString } from 'firebase-functions/params'

const getDb = () => getFirestore()
const evolutionApiUrl = defineString('EVOLUTION_API_URL')
const evolutionApiKey = defineString('EVOLUTION_API_KEY')

/**
 * Send a WhatsApp notification to org admins via Evolution API
 */
async function sendWhatsAppAlert(orgId, message) {
  const db = getDb()

  // Get org admin phone numbers
  const orgDoc = await db.collection('organizations').doc(orgId).get()
  const orgData = orgDoc.data()
  const alertPhone = orgData?.alertsWhatsApp || orgData?.ownerPhone

  if (!alertPhone) return

  try {
    const apiUrl = evolutionApiUrl.value()
    const apiKey = evolutionApiKey.value()
    if (!apiUrl || !apiKey) return

    const instanceName = orgData?.whatsappInstance || 'default'

    await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: alertPhone.replace(/\D/g, ''),
        text: `🔔 *FMF Alert*\n\n${message}`,
      }),
    })

    console.log(JSON.stringify({
      event: 'whatsapp_alert_sent',
      orgId,
      phone: alertPhone.slice(0, 6) + '***',
    }))
  } catch (error) {
    console.error(JSON.stringify({
      event: 'whatsapp_alert_error',
      orgId,
      error: error.message,
    }))
  }
}

/**
 * Scheduled: Every 15 minutes — Check alert conditions
 */
export const alertsEngine = onSchedule({
  schedule: 'every 15 minutes',
  region: 'europe-west1',
  timeZone: 'Europe/Paris',
  timeoutSeconds: 60,
  memory: '256MiB',
}, async () => {
  const db = getDb()
  const orgsSnapshot = await db.collection('organizations').get()

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id

    try {
      // Check for high-score leads without notification
      const hotLeadsSnap = await db
        .collection('organizations').doc(orgId).collection('prospects')
        .where('score', '>=', 9)
        .limit(10)
        .get()

      for (const leadDoc of hotLeadsSnap.docs) {
        const lead = leadDoc.data()
        if (lead.hotLeadNotified) continue

        const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Prospect'
        const score = (lead.score || 0) * 10
        const message = `Lead chaud detecte: ${name} (score ${score}/100)${lead.company ? ` — ${lead.company}` : ''}`

        // In-app notification
        await db.collection('organizations').doc(orgId).collection('notifications').add({
          type: 'hot_lead',
          prospectId: leadDoc.id,
          prospectName: name,
          message,
          priority: 'high',
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        })

        // WhatsApp alert
        await sendWhatsAppAlert(orgId, message)

        await leadDoc.ref.update({ hotLeadNotified: true })
      }

      // Check email health
      const accountsSnap = await db
        .collection('organizations').doc(orgId).collection('emailAccounts')
        .where('status', '==', 'active')
        .get()

      for (const accDoc of accountsSnap.docs) {
        const acc = accDoc.data()

        // Bounce rate alert
        if ((acc.bounceRate || 0) > 3 && !acc.bounceAlertSent) {
          const message = `Alerte: bounce rate ${acc.bounceRate}% sur ${acc.email}`
          await db.collection('organizations').doc(orgId).collection('notifications').add({
            type: 'email_alert',
            severity: 'high',
            message,
            createdAt: FieldValue.serverTimestamp(),
            read: false,
          })
          await sendWhatsAppAlert(orgId, message)
          await accDoc.ref.update({ bounceAlertSent: true })
        }

        // Spam rate alert
        if ((acc.spamRate || 0) > 0.1 && !acc.spamAlertSent) {
          const message = `CRITIQUE: spam rate ${acc.spamRate}% sur ${acc.email} — action requise`
          await db.collection('organizations').doc(orgId).collection('notifications').add({
            type: 'email_alert',
            severity: 'critical',
            message,
            createdAt: FieldValue.serverTimestamp(),
            read: false,
          })
          await sendWhatsAppAlert(orgId, message)
          await accDoc.ref.update({ spamAlertSent: true })
        }
      }

      // Check for escalations needing attention
      const escalationsSnap = await db
        .collection('organizations').doc(orgId).collection('escalations')
        .where('status', '==', 'pending')
        .where('notified', '==', false)
        .limit(5)
        .get()

      for (const escDoc of escalationsSnap.docs) {
        const esc = escDoc.data()
        const message = `Escalade en attente: ${esc.reason || 'Reponse prospect'} — ${esc.prospectName || 'Prospect'}`

        await db.collection('organizations').doc(orgId).collection('notifications').add({
          type: 'escalation',
          escalationId: escDoc.id,
          message,
          priority: 'high',
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        })
        await sendWhatsAppAlert(orgId, message)
        await escDoc.ref.update({ notified: true })
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'alerts_engine_error',
        orgId,
        error: error.message,
      }))
    }
  }
})
