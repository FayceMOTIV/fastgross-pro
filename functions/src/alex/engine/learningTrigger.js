/**
 * learningTrigger.js — Trigger Firestore pour apprendre automatiquement
 * Quand un prospect change de statut, Alex apprend de ce resultat.
 */
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { learnFromOutcome } from './adaptiveScorer.js';

export const learnFromProspectOutcome = onDocumentUpdated(
  {
    document: 'organizations/{orgId}/prospects/{prospectId}',
    region: 'europe-west1',
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const orgId = event.params.orgId;
    const prospectId = event.params.prospectId;

    // Detecter les transitions de statut interessantes
    if (before.status === after.status) return;

    const outcomeMap = {
      'converted': 'converted',
      'meeting_booked': 'meeting_booked',
      'replied': after.replyClassification === 'INTERESTED' ? 'replied_positive' : 'replied_negative',
      'lost': 'lost',
      'archived': 'no_reply',
    };

    const outcome = outcomeMap[after.status];
    if (!outcome) return;

    await learnFromOutcome(orgId, prospectId, outcome);
    console.log(`[Reacteur] Apprentissage : prospect ${prospectId} -> ${outcome}`);
  }
);
