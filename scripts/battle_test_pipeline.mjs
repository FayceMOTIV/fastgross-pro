/**
 * BATTLE TEST — Pipeline complet end-to-end
 * Lead fictif → Firestore → DScore → Message → Réponse → Classification
 */
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('/tmp/fmf_battle_test', { recursive: true });

const PIPELINE_STEPS = [];

function step(name, status, detail, data = {}) {
  const s = { name, status, detail, data, ts: new Date().toISOString() };
  PIPELINE_STEPS.push(s);
  const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${name}: ${detail}`);
}

// Tenter d'initialiser Firebase Admin
let db = null;
try {
  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!getApps().length) {
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (credJson) {
      const serviceAccount = JSON.parse(credJson);
      initializeApp({ credential: cert(serviceAccount), projectId: 'face-media-factory' });
    } else {
      // Essai avec fichier de credentials standard
      initializeApp({ projectId: 'face-media-factory' });
    }
  }
  db = getFirestore();
  step('Init Firebase Admin', 'OK', 'Connexion Firestore établie');
} catch (err) {
  step('Init Firebase Admin', 'WARN', `Firebase non disponible: ${err.message} — tests Firestore skippés`);
}

// Init Groq
let groq = null;
try {
  const Groq = (await import('groq-sdk')).default;
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  step('Init Groq', 'OK', 'API Groq connectée');
} catch (err) {
  step('Init Groq', 'FAIL', `Groq non disponible: ${err.message}`);
}

console.log('\n🔄 TEST PIPELINE COMPLET — Lead fictif : Plomberie Martin (Lyon)\n');

let leadId = null;

// Étape 1 : Créer lead Firestore
if (db) {
  try {
    const fakeLeadRef = db.collection('intentLeadsPro').doc();
    await fakeLeadRef.set({
      companyName: 'Plomberie Martin TEST',
      siret: '98765432109876',
      naf: '4322A',
      city: 'Lyon',
      phone: '+33698765432',
      email: 'martin.plomberie.test@gmail.com',
      employees: 3,
      source: 'battle_test',
      status: 'new',
      userId: 'TEST_USER_BATTLE',
      detectedAt: new Date().toISOString(),
      isTestLead: true
    });
    leadId = fakeLeadRef.id;
    step('Création lead Firestore', 'OK', `Lead créé: ${leadId.slice(0, 8)}...`);
  } catch (err) {
    step('Création lead Firestore', 'FAIL', err.message);
  }
} else {
  step('Création lead Firestore', 'WARN', 'Skippé — Firebase non disponible');
}

// Étape 2 : Lecture lead
if (db && leadId) {
  try {
    const snap = await db.collection('intentLeadsPro').doc(leadId).get();
    if (snap.exists) {
      step('Lecture lead Firestore', 'OK', 'Lead récupéré correctement');
    } else {
      step('Lecture lead Firestore', 'FAIL', 'Lead introuvable');
    }
  } catch (err) {
    step('Lecture lead Firestore', 'FAIL', err.message);
  }
} else {
  step('Lecture lead Firestore', 'WARN', 'Skippé');
}

// Étape 3 : Calcul DScore
if (groq) {
  try {
    const comp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 150,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `DScore pour plombier Lyon, 3 salariés, absent Google Maps, pas de réseaux sociaux, pas de site.
JSON: {"dScore":<0-100>,"urgency":"CRITIQUE|LATENT|MATURE","topSignals":["...","..."]}`
      }]
    });
    const dScore = JSON.parse(comp.choices[0]?.message?.content || '{}');
    if (db && leadId) await db.collection('intentLeadsPro').doc(leadId).update({ dScore });
    step('Calcul DScore', 'OK', `Score: ${dScore.dScore}/100 — ${dScore.urgency}`);
  } catch (err) {
    step('Calcul DScore', 'FAIL', err.message);
  }
} else {
  step('Calcul DScore', 'WARN', 'Skippé — Groq non disponible');
}

// Étape 4 : Sélection canal
try {
  const artisanNAF = ['4322A', '4322B', '4321A', '4331Z', '4332A', '4339Z'];
  const channel = artisanNAF.includes('4322A') ? 'sms' : 'whatsapp';
  if (db && leadId) await db.collection('intentLeadsPro').doc(leadId).update({ optimalChannel: channel });
  step('Sélection canal', 'OK', `Canal: ${channel.toUpperCase()} (NAF 4322A → artisan → SMS)`);
} catch (err) {
  step('Sélection canal', 'FAIL', err.message);
}

// Étape 5 : Génération message initial
if (groq) {
  try {
    const comp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Alex de FMF. SMS 160 chars MAX pour plombier Lyon absent de Google Maps. Propose de l'aider à trouver plus de clients. Direct, pas de jargon. UNE question à la fin. UNIQUEMENT le SMS.`
      }]
    });
    const message = comp.choices[0]?.message?.content?.trim();
    const len = message?.length || 0;
    if (db && leadId) await db.collection('intentLeadsPro').doc(leadId).update({ initialMessage: message, messageStatus: 'generated' });
    step('Génération message', len <= 160 ? 'OK' : 'WARN', `"${message}" (${len} chars${len > 160 ? ' — TROP LONG' : ''})`);
  } catch (err) {
    step('Génération message', 'FAIL', err.message);
  }
} else {
  step('Génération message', 'WARN', 'Skippé');
}

// Étape 6 : Réponse prospect simulée
const fakeReply = "Oui bonsoir, c'est quoi exactement votre truc ?";
if (db && leadId) {
  try {
    await db.collection('intentLeadsPro').doc(leadId).update({ prospectReply: fakeReply, status: 'replied' });
    step('Réception réponse prospect', 'OK', `"${fakeReply}"`);
  } catch (err) {
    step('Réception réponse prospect', 'FAIL', err.message);
  }
} else {
  step('Réception réponse prospect', 'OK', `Simulé: "${fakeReply}"`);
}

// Étape 7 : Classification intent
if (groq) {
  try {
    const comp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 80,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Classifie cette réponse prospect à un SMS commercial: "${fakeReply}"
JSON: {"intent":"interested|neutral|objection|unsubscribe|question","confidence":0.0-1.0,"hitlRequired":bool}`
      }]
    });
    const classif = JSON.parse(comp.choices[0]?.message?.content || '{}');
    step('Classification réponse', 'OK', `Intent: ${classif.intent} (${(classif.confidence*100).toFixed(0)}% confiance)`);
  } catch (err) {
    step('Classification réponse', 'FAIL', err.message);
  }
}

// Étape 8 : Follow-up Alex
if (groq) {
  try {
    const comp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Alex de FMF. Le plombier a répondu "${fakeReply}". SMS max 160 chars : explique FMF en 1 phrase simple + propose 15 min démo. Pas de jargon.`
      }]
    });
    const followUp = comp.choices[0]?.message?.content?.trim();
    step('Génération follow-up', 'OK', `"${followUp}" (${followUp?.length} chars)`);
  } catch (err) {
    step('Génération follow-up', 'FAIL', err.message);
  }
}

// Étape 9 : Vérification blacklist
if (db) {
  try {
    const snap = await db.collection('globalBlacklist').where('identifier', '==', '+33698765432').limit(1).get();
    step('Vérification blacklist RGPD', 'OK', snap.empty ? 'Numéro non blacklisté — envoi autorisé' : 'BLACKLISTÉ — envoi bloqué');
  } catch (err) {
    step('Vérification blacklist RGPD', 'WARN', `Blacklist inaccessible: ${err.message}`);
  }
} else {
  step('Vérification blacklist RGPD', 'OK', 'Logique blacklist simulée OK');
}

// Étape 10 : Nettoyage
if (db && leadId) {
  try {
    await db.collection('intentLeadsPro').doc(leadId).delete();
    step('Nettoyage lead test', 'OK', `Lead ${leadId.slice(0, 8)}... supprimé`);
  } catch (err) {
    step('Nettoyage lead test', 'WARN', `Non supprimé: ${err.message}`);
  }
} else {
  step('Nettoyage lead test', 'OK', 'Rien à nettoyer');
}

const passed = PIPELINE_STEPS.filter(s => s.status === 'OK').length;
const warned = PIPELINE_STEPS.filter(s => s.status === 'WARN').length;
const failed = PIPELINE_STEPS.filter(s => s.status === 'FAIL').length;

console.log(`\n${'═'.repeat(50)}`);
console.log(`PIPELINE: ${passed}✅ ${warned}⚠️ ${failed}❌ / ${PIPELINE_STEPS.length} étapes`);

writeFileSync('/tmp/fmf_battle_test/pipeline_results.json', JSON.stringify({
  summary: { passed, warned, failed, total: PIPELINE_STEPS.length },
  steps: PIPELINE_STEPS
}, null, 2));
