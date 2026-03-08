/**
 * ABM Cloud Functions — Account-Based Marketing Multi-Decideurs
 *
 * Deux fonctions callable :
 *   1. identifyAndContactDecisionMakers — identifie les decideurs + sauvegarde
 *   2. launchABMCampaign — lance l'outreach sur un contact ABM
 *
 * Firestore :
 *   - organizations/{orgId}/{collectionName}/{leadId}.abm  → resultat ABM
 *   - organizations/{orgId}/{collectionName}/{leadId}/abmContacts/{idx} → contacts individuels
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { identifyDecisionMakers } from './abmEngine.js'

const getDb = () => getFirestore()

// ============================================
// 1. IDENTIFY AND CONTACT DECISION MAKERS
// ============================================

/**
 * Callable : Identifie les decideurs d'un lead et sauvegarde le resultat
 *
 * Input :
 *   - leadId: string (document ID du lead)
 *   - collectionName: string (ex: 'prospects', 'hunterResults')
 *
 * Output :
 *   - success: boolean
 *   - abm: { eligible, contacts[], companyName, siren, totalDecisionMakers, rolesFound }
 */
export const identifyAndContactDecisionMakers = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { leadId, collectionName } = request.data || {}

    if (!leadId || typeof leadId !== 'string') {
      throw new HttpsError('invalid-argument', 'leadId requis (string)')
    }

    if (!collectionName || typeof collectionName !== 'string') {
      throw new HttpsError('invalid-argument', 'collectionName requis (string)')
    }

    // Recuperer orgId depuis le profil utilisateur
    const uid = request.auth.uid
    const userDoc = await getDb().doc(`users/${uid}`).get()

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Profil utilisateur introuvable')
    }

    const orgId = userDoc.data().orgId || userDoc.data().organizationId
    if (!orgId) {
      throw new HttpsError('failed-precondition', 'Organisation non configuree')
    }

    // Recuperer le lead
    const leadRef = getDb().doc(`organizations/${orgId}/${collectionName}/${leadId}`)
    const leadSnap = await leadRef.get()

    if (!leadSnap.exists) {
      throw new HttpsError('not-found', `Lead ${leadId} introuvable dans ${collectionName}`)
    }

    const leadData = leadSnap.data()

    // Construire les donnees entreprise depuis le lead
    const companyData = {
      siren: leadData.siren || leadData.siret?.substring(0, 9) || null,
      siret: leadData.siret || null,
      nom_entreprise: leadData.nom_entreprise || leadData.company || leadData.companyName || null,
      effectif: leadData.effectif || leadData.tranche_effectif || null,
      effectif_min: leadData.effectif_min || leadData.employees || null,
      chiffre_affaires: leadData.chiffre_affaires || null,
      libelle_naf: leadData.libelle_naf || leadData.sector || leadData.naf || null,
      ville: leadData.ville || leadData.city || null,
    }

    if (!companyData.siren) {
      throw new HttpsError(
        'failed-precondition',
        'SIREN manquant sur le lead — enrichissement Pappers requis au prealable'
      )
    }

    logger.info(`[ABM] identifyAndContactDecisionMakers — org=${orgId}, lead=${leadId}, siren=${companyData.siren}`)

    try {
      // Identifier les decideurs
      const abmResult = await identifyDecisionMakers(companyData)

      // Sauvegarder le resultat ABM sur le lead
      await leadRef.update({
        abm: {
          eligible: abmResult.eligible,
          reason: abmResult.reason || null,
          totalDecisionMakers: abmResult.totalDecisionMakers,
          rolesFound: abmResult.rolesFound,
          companyName: abmResult.companyName,
          siren: abmResult.siren,
          generatedAt: abmResult.generatedAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
      })

      // Si multi-decideurs, creer la subcollection abmContacts
      if (abmResult.contacts.length > 0) {
        const batch = getDb().batch()
        const abmContactsRef = leadRef.collection('abmContacts')

        // Supprimer les anciens contacts ABM (idempotence)
        const existingContacts = await abmContactsRef.listDocuments()
        for (const doc of existingContacts) {
          batch.delete(doc)
        }

        // Creer les nouveaux contacts
        for (let i = 0; i < abmResult.contacts.length; i++) {
          const contact = abmResult.contacts[i]
          const contactRef = abmContactsRef.doc(`contact_${i}`)

          batch.set(contactRef, {
            index: i,
            prenom: contact.prenom,
            nom: contact.nom,
            fullName: contact.fullName,
            qualite: contact.qualite,
            role: contact.role,
            source: contact.source,
            messages: contact.messages || null,
            status: 'identified', // identified → queued → sent → replied → converted
            channel: null,
            sentAt: null,
            repliedAt: null,
            createdAt: FieldValue.serverTimestamp(),
          })
        }

        await batch.commit()

        logger.info(`[ABM] ${abmResult.contacts.length} contacts ABM sauvegardes pour lead ${leadId}`)
      }

      return {
        success: true,
        abm: {
          eligible: abmResult.eligible,
          reason: abmResult.reason || null,
          contacts: abmResult.contacts.map((c) => ({
            prenom: c.prenom,
            nom: c.nom,
            fullName: c.fullName,
            role: c.role,
            source: c.source,
            hasMessages: Boolean(c.messages),
          })),
          companyName: abmResult.companyName,
          siren: abmResult.siren,
          totalDecisionMakers: abmResult.totalDecisionMakers,
          rolesFound: abmResult.rolesFound,
        },
      }
    } catch (error) {
      logger.error(`[ABM] Erreur identifyAndContactDecisionMakers: ${error.message}`)
      throw new HttpsError('internal', `Erreur ABM: ${error.message}`)
    }
  }
)

// ============================================
// 2. LAUNCH ABM CAMPAIGN (contact individuel)
// ============================================

/**
 * Callable : Lance l'outreach sur un contact ABM specifique
 *
 * Input :
 *   - leadId: string
 *   - contactIndex: number (index du contact dans abmContacts)
 *   - channel: 'whatsapp' | 'email'
 *
 * Output :
 *   - success: boolean
 *   - contact: { fullName, role, channel, status }
 */
export const launchABMCampaign = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise')
    }

    const { leadId, contactIndex, channel } = request.data || {}

    if (!leadId || typeof leadId !== 'string') {
      throw new HttpsError('invalid-argument', 'leadId requis (string)')
    }

    if (typeof contactIndex !== 'number' || contactIndex < 0) {
      throw new HttpsError('invalid-argument', 'contactIndex requis (number >= 0)')
    }

    const validChannels = ['whatsapp', 'email']
    if (!channel || !validChannels.includes(channel)) {
      throw new HttpsError('invalid-argument', `channel requis (${validChannels.join(' | ')})`)
    }

    // Recuperer orgId
    const uid = request.auth.uid
    const userDoc = await getDb().doc(`users/${uid}`).get()

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Profil utilisateur introuvable')
    }

    const orgId = userDoc.data().orgId || userDoc.data().organizationId
    if (!orgId) {
      throw new HttpsError('failed-precondition', 'Organisation non configuree')
    }

    // Trouver le lead — chercher dans prospects par defaut
    // On accepte n'importe quelle collection via le champ abm
    const prospectRef = getDb().doc(`organizations/${orgId}/prospects/${leadId}`)
    const prospectSnap = await prospectRef.get()

    if (!prospectSnap.exists) {
      throw new HttpsError('not-found', `Lead ${leadId} introuvable`)
    }

    // Recuperer le contact ABM
    const contactRef = prospectRef.collection('abmContacts').doc(`contact_${contactIndex}`)
    const contactSnap = await contactRef.get()

    if (!contactSnap.exists) {
      throw new HttpsError('not-found', `Contact ABM index ${contactIndex} introuvable`)
    }

    const contactData = contactSnap.data()

    if (contactData.status === 'sent' || contactData.status === 'replied') {
      throw new HttpsError(
        'already-exists',
        `Contact ${contactData.fullName} deja contacte (status: ${contactData.status})`
      )
    }

    // Verifier que le message existe pour le canal
    if (!contactData.messages) {
      throw new HttpsError(
        'failed-precondition',
        'Messages non generes — relancer identifyAndContactDecisionMakers'
      )
    }

    const messageKey = channel === 'email' ? 'email_body' : 'whatsapp'
    if (!contactData.messages[messageKey]) {
      throw new HttpsError(
        'failed-precondition',
        `Message ${channel} non disponible pour ce contact`
      )
    }

    logger.info(`[ABM] launchABMCampaign — org=${orgId}, lead=${leadId}, contact=${contactData.fullName}, channel=${channel}`)

    try {
      // Mettre a jour le statut du contact
      await contactRef.update({
        status: 'queued',
        channel,
        queuedAt: FieldValue.serverTimestamp(),
      })

      // Mettre a jour le compteur ABM sur le lead
      await prospectRef.update({
        'abm.lastOutreachAt': FieldValue.serverTimestamp(),
        'abm.outreachCount': FieldValue.increment(1),
      })

      logger.info(JSON.stringify({
        event: 'abm_campaign_launched',
        orgId,
        leadId,
        contactIndex,
        contact: contactData.fullName,
        role: contactData.role,
        channel,
        timestamp: Date.now(),
      }))

      return {
        success: true,
        contact: {
          fullName: contactData.fullName,
          role: contactData.role,
          channel,
          status: 'queued',
          message: channel === 'email'
            ? { subject: contactData.messages.email_subject, body: contactData.messages.email_body }
            : { text: contactData.messages.whatsapp },
        },
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      logger.error(`[ABM] Erreur launchABMCampaign: ${error.message}`)
      throw new HttpsError('internal', `Erreur lancement ABM: ${error.message}`)
    }
  }
)
