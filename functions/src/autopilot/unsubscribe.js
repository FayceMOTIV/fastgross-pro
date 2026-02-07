/**
 * Cloud Function: handleUnsubscribe
 * Endpoint pour la desinscription RGPD
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

const db = getFirestore()

/**
 * Page HTML de desinscription
 */
function getUnsubscribePage(email, status, message) {
  const styles = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d1a;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: rgba(26, 26, 46, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
    }
    h1 { color: #00d49a; margin-bottom: 20px; }
    p { color: #b4b4c5; line-height: 1.6; margin-bottom: 20px; }
    .email { color: #fff; font-weight: 600; }
    .btn {
      display: inline-block;
      background: #00d49a;
      color: #0d0d1a;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 10px;
    }
    .btn:hover { background: #00a87a; }
    .success { color: #00d49a; }
    .error { color: #ef4444; }
  `

  if (status === 'confirm') {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desinscription - Face Media Factory</title>
  <style>${styles}</style>
</head>
<body>
  <div class="card">
    <h1>Desinscription</h1>
    <p>Vous etes sur le point de vous desinscrire des emails de prospection envoyes a :</p>
    <p class="email">${email}</p>
    <p>Apres confirmation, vous ne recevrez plus de messages de notre part.</p>
    <form method="POST">
      <input type="hidden" name="confirm" value="true">
      <button type="submit" class="btn">Confirmer la desinscription</button>
    </form>
  </div>
</body>
</html>`
  }

  if (status === 'success') {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Desinscription confirmee - Face Media Factory</title>
  <style>${styles}</style>
</head>
<body>
  <div class="card">
    <h1 class="success">Desinscription confirmee</h1>
    <p>L'adresse email suivante a ete retiree de nos listes :</p>
    <p class="email">${email}</p>
    <p>Vous ne recevrez plus de messages de notre part.</p>
  </div>
</body>
</html>`
  }

  // Error case
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur - Face Media Factory</title>
  <style>${styles}</style>
</head>
<body>
  <div class="card">
    <h1 class="error">Erreur</h1>
    <p>${message || 'Une erreur est survenue. Veuillez reessayer.'}</p>
  </div>
</body>
</html>`
}

/**
 * Endpoint HTTP pour la desinscription
 * Route: /unsubscribe?e=xxx@yyy.com&o=orgId
 */
export const handleUnsubscribe = onRequest(
  {
    region: 'europe-west1',
    cors: true
  },
  async (req, res) => {
    const email = req.query.e || req.body?.e
    const orgId = req.query.o || req.body?.o

    // Validation
    if (!email || !orgId) {
      res.status(400).send(getUnsubscribePage('', 'error', 'Lien invalide. Parametres manquants.'))
      return
    }

    const emailLower = decodeURIComponent(email).toLowerCase()

    // GET = Afficher page de confirmation
    if (req.method === 'GET') {
      res.status(200).send(getUnsubscribePage(emailLower, 'confirm'))
      return
    }

    // POST = Traiter la desinscription
    if (req.method === 'POST') {
      try {
        // Verifier que l'org existe
        const orgDoc = await db.collection('organizations').doc(orgId).get()
        if (!orgDoc.exists) {
          res.status(400).send(getUnsubscribePage(emailLower, 'error', 'Organisation non trouvee.'))
          return
        }

        // Ajouter a la blacklist
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('blacklist')
          .doc(emailLower)
          .set({
            email: emailLower,
            reason: 'unsubscribed',
            addedAt: FieldValue.serverTimestamp()
          })

        // Mettre a jour le prospect si existe
        const prospectsSnapshot = await db
          .collection('organizations')
          .doc(orgId)
          .collection('prospects')
          .where('emails', 'array-contains', emailLower)
          .get()

        const batch = db.batch()
        prospectsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'unsubscribed',
            unsubscribedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          })
        })
        await batch.commit()

        // Logger l'evenement
        await db
          .collection('organizations')
          .doc(orgId)
          .collection('emailEvents')
          .add({
            type: 'unsubscribed',
            email: emailLower,
            timestamp: FieldValue.serverTimestamp()
          })

        res.status(200).send(getUnsubscribePage(emailLower, 'success'))

      } catch (error) {
        console.error('Unsubscribe error:', error)
        res.status(500).send(getUnsubscribePage(emailLower, 'error', 'Une erreur est survenue.'))
      }
      return
    }

    res.status(405).send('Method not allowed')
  }
)

/**
 * Webhook pour les evenements d'emails (bounces, opens, etc.)
 */
export const handleProspectEmailWebhook = onRequest(
  { region: 'europe-west1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed')
      return
    }

    try {
      const event = req.body

      // Extraire les headers personnalises
      const headers = event.data?.headers || {}
      const prospectId = headers['X-FMF-Prospect-Id']
      const accountId = headers['X-FMF-Account-Id']
      const orgId = headers['X-FMF-Org-Id']

      if (!prospectId || !orgId) {
        res.status(200).send('Missing tracking headers')
        return
      }

      // Mapper les types d'evenements
      const eventTypeMap = {
        'email.delivered': 'delivered',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.bounced': 'bounced',
        'email.complained': 'complained'
      }

      const eventType = eventTypeMap[event.type]
      if (!eventType) {
        res.status(200).send('Event type not tracked')
        return
      }

      // Logger l'evenement
      await db
        .collection('organizations')
        .doc(orgId)
        .collection('emailEvents')
        .add({
          type: eventType,
          prospectId,
          accountId,
          email: event.data?.to,
          timestamp: FieldValue.serverTimestamp(),
          raw: event
        })

      // Mettre a jour le prospect selon l'evenement
      const prospectRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('prospects')
        .doc(prospectId)

      const updates = {
        lastActivity: eventType,
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }

      if (eventType === 'opened') {
        updates.status = 'opened'
        updates.openedAt = FieldValue.serverTimestamp()
      } else if (eventType === 'clicked') {
        updates.status = 'opened'
        updates.clickedAt = FieldValue.serverTimestamp()
      } else if (eventType === 'bounced') {
        updates.status = 'bounced'

        // Ajouter a la blacklist
        const email = event.data?.to
        if (email) {
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('blacklist')
            .doc(email.toLowerCase())
            .set({
              email: email.toLowerCase(),
              reason: 'bounce_hard',
              addedAt: FieldValue.serverTimestamp()
            })
        }

        // Incrementer le compteur de bounces du compte
        if (accountId) {
          await db
            .collection('organizations')
            .doc(orgId)
            .collection('emailAccounts')
            .doc(accountId)
            .update({
              bounceCount: FieldValue.increment(1)
            })
        }
      }

      await prospectRef.update(updates)

      res.status(200).send('OK')

    } catch (error) {
      console.error('Webhook error:', error)
      res.status(500).send('Internal error')
    }
  }
)
