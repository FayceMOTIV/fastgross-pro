/**
 * verifyOrgMembership — Verifie que le user est bien membre de l'org
 *
 * A appeler au DEBUT de chaque callable qui recoit un orgId du client.
 * Firestore Admin SDK bypass les security rules, donc cette verification
 * est OBLIGATOIRE cote Cloud Function.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

const getDb = () => getFirestore()

/**
 * Verifie que uid est membre de l'organisation orgId
 * @param {string} uid — Firebase Auth UID
 * @param {string} orgId — Organization ID
 * @throws {HttpsError} permission-denied si pas membre
 */
export async function verifyOrgMembership(uid, orgId) {
  if (!uid || !orgId) {
    throw new HttpsError('invalid-argument', 'uid et orgId requis')
  }

  const db = getDb()
  const memberDoc = await db.doc(`organizations/${orgId}/members/${uid}`).get()

  if (!memberDoc.exists) {
    throw new HttpsError(
      'permission-denied',
      `Acces refuse: vous n'etes pas membre de cette organisation`
    )
  }

  const memberData = memberDoc.data()

  // Verifier que le membre n'est pas desactive
  if (memberData.status === 'disabled' || memberData.status === 'removed') {
    throw new HttpsError(
      'permission-denied',
      `Acces refuse: votre acces a cette organisation a ete revoque`
    )
  }

  return memberData
}
