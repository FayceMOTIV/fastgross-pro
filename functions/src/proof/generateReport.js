import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'

const db = getFirestore()

/**
 * Cloud Function: generateReport
 * Génère un rapport de valeur mensuel pour un client
 */
export const generateReport = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez être connecté')
    }

    const { clientId, period = 'month' } = request.data
    if (!clientId) {
      throw new HttpsError('invalid-argument', 'clientId requis')
    }

    try {
      // Get client data
      const clientDoc = await db.collection('clients').doc(clientId).get()
      if (!clientDoc.exists) throw new HttpsError('not-found', 'Client non trouvé')
      const clientData = clientDoc.data()

      // Calculate date range
      const now = new Date()
      let startDate
      if (period === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (period === 'quarter') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      // Fetch email events for this client's leads
      const leadsSnapshot = await db
        .collection('leads')
        .where('orgId', '==', clientData.orgId)
        .where('clientId', '==', clientId)
        .get()

      const leadIds = leadsSnapshot.docs.map((d) => d.id)

      // Aggregate email events
      let totalSent = 0
      let totalOpened = 0
      let totalClicked = 0
      let totalReplied = 0
      let totalBounced = 0

      // Fetch events in batches (Firestore 'in' limit = 30)
      for (let i = 0; i < leadIds.length; i += 30) {
        const batch = leadIds.slice(i, i + 30)
        if (batch.length === 0) continue

        const eventsSnapshot = await db
          .collection('emailEvents')
          .where('leadId', 'in', batch)
          .where('timestamp', '>=', startDate)
          .get()

        for (const eventDoc of eventsSnapshot.docs) {
          const event = eventDoc.data()
          switch (event.type) {
            case 'sent': totalSent++; break
            case 'opened': totalOpened++; break
            case 'clicked': totalClicked++; break
            case 'replied': totalReplied++; break
            case 'bounced': totalBounced++; break
          }
        }
      }

      // Calculate metrics
      const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100 * 10) / 10 : 0
      const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100 * 10) / 10 : 0
      const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100 * 10) / 10 : 0
      const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 100 * 10) / 10 : 0

      // Get hot leads (score >= 7)
      const hotLeads = leadsSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.score >= 7)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      // Generate AI insights
      const insights = await generateInsights({
        clientName: clientData.name,
        totalSent,
        openRate,
        clickRate,
        replyRate,
        hotLeadsCount: hotLeads.length,
        totalLeads: leadIds.length,
      })

      // Build report
      const report = {
        clientId,
        clientName: clientData.name,
        period,
        periodLabel: getPeriodLabel(period, startDate, now),
        orgId: clientData.orgId,
        generatedAt: FieldValue.serverTimestamp(),
        stats: {
          totalLeads: leadIds.length,
          emailsSent: totalSent,
          opened: totalOpened,
          clicked: totalClicked,
          replied: totalReplied,
          bounced: totalBounced,
          openRate,
          clickRate,
          replyRate,
          bounceRate,
        },
        hotLeads: hotLeads.map((l) => ({
          name: `${l.firstName} ${l.lastName}`,
          company: l.company,
          score: l.score,
          status: l.status,
        })),
        insights,
        estimatedValue: totalReplied * 1200, // Estimation: chaque réponse = 1200€ de valeur potentielle
      }

      // Save report
      const reportRef = await db.collection('reports').add(report)

      return { reportId: reportRef.id, ...report }
    } catch (error) {
      console.error('Report generation error:', error)
      throw new HttpsError('internal', error.message)
    }
  }
)

/**
 * Génère des insights IA à partir des métriques
 */
async function generateInsights(metrics) {
  try {
    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Tu es un analyste marketing. Génère 4 insights courts et actionnables pour ce rapport client.

MÉTRIQUES:
- Client: ${metrics.clientName}
- Emails envoyés: ${metrics.totalSent}
- Taux d'ouverture: ${metrics.openRate}%
- Taux de clic: ${metrics.clickRate}%
- Taux de réponse: ${metrics.replyRate}%
- Leads chauds: ${metrics.hotLeadsCount}/${metrics.totalLeads}

Réponds en JSON: { "insights": ["insight 1", "insight 2", "insight 3", "insight 4"] }
Chaque insight fait 1-2 phrases max. Sois spécifique et actionnable.`,
        },
      ],
    })

    const text = message.content[0].text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0]).insights
    }
  } catch (error) {
    console.error('AI insights error:', error)
  }

  // Fallback insights
  return [
    `${metrics.totalSent} emails envoyés ce mois — activité en cours`,
    `Taux d'ouverture de ${metrics.openRate}% — ${metrics.openRate > 50 ? 'excellent' : metrics.openRate > 30 ? 'dans la moyenne' : 'à améliorer'}`,
    `${metrics.hotLeadsCount} leads chauds identifiés prêts à être contactés`,
    `Valeur estimée générée: ${metrics.hotLeadsCount * 1200}€`,
  ]
}

function getPeriodLabel(period, start, end) {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

  if (period === 'month') {
    return `${months[start.getMonth()]} ${start.getFullYear()}`
  } else if (period === 'week') {
    return `Semaine du ${start.getDate()} ${months[start.getMonth()]}`
  } else {
    return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
  }
}
