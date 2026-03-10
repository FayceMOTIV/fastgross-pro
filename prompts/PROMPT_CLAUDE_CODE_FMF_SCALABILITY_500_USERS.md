# MISSION COMPLÉMENTAIRE : SCALABILITÉ 500 USERS + NICHE UNIVERSELLE
# À exécuter APRÈS le prompt INTENT_SCANNER_20_BOOSTERS
# Projet : ~/Projects/face-media-factory
# Stack : React/Vite/Tailwind + Firebase (europe-west1) + Groq + VPS Python 94.130.184.44

Ce prompt ajoute 3 couches critiques au scanner déjà implémenté :
1. Architecture scalable pour 500 users concurrents
2. Moteur de niche universelle (n'importe quel secteur)
3. Production hardening (rate limiting, caching, coûts, monitoring)

Lis d'abord le code implémenté par le prompt précédent dans `functions/src/scanner/`.
Travaille de manière autonome. Commit après chaque section.

---

## SECTION A : ARCHITECTURE SCALABLE 500 USERS

### A.1 Cloud Tasks pour les scans lourds

Le problème : si 500 users lancent chacun un scan de 50 prospects = 25 000 scans simultanés.
Cloud Functions v2 peut gérer ça, mais PAS en appelant directement les APIs externes (rate limits crt.sh, France Travail, PageSpeed...).

Solution : **Cloud Tasks** comme file d'attente distribuée.

**Fichier : `functions/src/scanner/queue/scanTaskQueue.js`**

```javascript
import { CloudTasksClient } from '@google-cloud/tasks';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
const PROJECT_ID = 'face-media-factory';
const LOCATION = 'europe-west1';
const QUEUE_NAME = 'prospect-scans';

// Cloud Function callable : l'user demande un scan → on enqueue
export const enqueueScan = onCall(
  { region: 'europe-west1', memory: '256MiB' },
  async (request) => {
    const { prospects, organizationId } = request.data;
    const uid = request.auth?.uid;
    if (!uid || !organizationId) throw new HttpsError('unauthenticated', 'Auth requis');
    
    // Vérifier le quota du tenant
    const quota = await checkTenantQuota(organizationId);
    if (prospects.length > quota.remainingScans) {
      throw new HttpsError('resource-exhausted', 
        `Quota dépassé : ${quota.remainingScans} scans restants ce mois`);
    }
    
    // Enqueue chaque prospect dans Cloud Tasks
    const client = new CloudTasksClient();
    const parent = client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);
    
    const tasks = [];
    for (let i = 0; i < prospects.length; i++) {
      const prospect = prospects[i];
      
      // Vérifier le cache : pas de re-scan si < 7 jours
      const cached = await db.collection('scanResults')
        .where('domain', '==', prospect.domain)
        .where('organizationId', '==', organizationId)
        .where('scannedAt', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .limit(1)
        .get();
      
      if (!cached.empty) {
        tasks.push({ prospectId: prospect.id, status: 'cached', scanResultId: cached.docs[0].id });
        continue;
      }
      
      // Créer la tâche avec un délai progressif (éviter les bursts)
      const delaySeconds = i * 2; // 2 secondes entre chaque scan
      const task = {
        httpRequest: {
          httpMethod: 'POST',
          url: `https://europe-west1-${PROJECT_ID}.cloudfunctions.net/processScanTask`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({
            prospectId: prospect.id,
            domain: prospect.domain,
            organizationId,
            userId: uid,
          })).toString('base64'),
          oidcToken: {
            serviceAccountEmail: `${PROJECT_ID}@appspot.gserviceaccount.com`,
          },
        },
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + delaySeconds,
        },
      };
      
      await client.createTask({ parent, task });
      tasks.push({ prospectId: prospect.id, status: 'queued', delay: delaySeconds });
    }
    
    // Incrémenter le compteur de scans du tenant
    await db.collection('tenantQuotas').doc(organizationId).update({
      scansUsedThisMonth: admin.firestore.FieldValue.increment(prospects.length),
    });
    
    return { queued: tasks.length, tasks };
  }
);

// Worker : traite un scan individuel (appelé par Cloud Tasks)
export const processScanTask = onTaskDispatched(
  {
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 120,
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 10,
    },
    rateLimits: {
      maxConcurrentDispatches: 20, // Max 20 scans en parallèle
      maxDispatchesPerSecond: 5,   // Max 5 nouveaux scans/seconde
    },
  },
  async (req) => {
    const { prospectId, domain, organizationId, userId } = req.data;
    
    // Appeler le scanOrchestrator existant
    const { runProspectScan } = await import('./scanOrchestrator.js');
    await runProspectScan({ data: { prospectId, domain, organizationId } });
    
    // Notifier le user que le scan est terminé (optionnel : Firestore listener)
    await db.collection('scanNotifications').add({
      organizationId,
      userId,
      prospectId,
      domain,
      status: 'completed',
      completedAt: new Date(),
    });
  }
);
```

### A.2 Quotas par tenant

**Fichier : `functions/src/scanner/queue/tenantQuotas.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const db = getFirestore();

// Plans et quotas
const PLAN_QUOTAS = {
  essentiel: {
    scansPerMonth: 500,
    monitorsPerMonth: 50,       // prospects monitorés en continu
    signalAlertsPerDay: 20,
    apiCallsPerDay: 1000,
  },
  pro: {
    scansPerMonth: 5000,
    monitorsPerMonth: 500,
    signalAlertsPerDay: 100,
    apiCallsPerDay: 10000,
  },
  business: {
    scansPerMonth: 50000,
    monitorsPerMonth: 5000,
    signalAlertsPerDay: 1000,
    apiCallsPerDay: 100000,
  },
};

export async function checkTenantQuota(organizationId) {
  const quotaDoc = await db.collection('tenantQuotas').doc(organizationId).get();
  
  if (!quotaDoc.exists) {
    // Créer avec le plan par défaut
    const defaultQuota = {
      plan: 'essentiel',
      ...PLAN_QUOTAS.essentiel,
      scansUsedThisMonth: 0,
      apiCallsUsedToday: 0,
      resetDate: getFirstOfNextMonth(),
    };
    await db.collection('tenantQuotas').doc(organizationId).set(defaultQuota);
    return { ...defaultQuota, remainingScans: defaultQuota.scansPerMonth };
  }
  
  const quota = quotaDoc.data();
  const limits = PLAN_QUOTAS[quota.plan] || PLAN_QUOTAS.essentiel;
  
  return {
    ...quota,
    remainingScans: limits.scansPerMonth - (quota.scansUsedThisMonth || 0),
    remainingApiCalls: limits.apiCallsPerDay - (quota.apiCallsUsedToday || 0),
  };
}

// Reset mensuel des compteurs
export const resetMonthlyQuotas = onSchedule(
  {
    schedule: '0 0 1 * *', // 1er de chaque mois à minuit
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const quotas = await db.collection('tenantQuotas').get();
    const batch = db.batch();
    
    for (const doc of quotas.docs) {
      batch.update(doc.ref, {
        scansUsedThisMonth: 0,
        resetDate: getFirstOfNextMonth(),
      });
    }
    await batch.commit();
    console.log(`✅ Quotas mensuels réinitialisés pour ${quotas.size} tenants`);
  }
);

// Reset quotidien des compteurs API
export const resetDailyQuotas = onSchedule(
  {
    schedule: '0 0 * * *', // Minuit chaque jour
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const quotas = await db.collection('tenantQuotas').get();
    const batch = db.batch();
    
    for (const doc of quotas.docs) {
      batch.update(doc.ref, { apiCallsUsedToday: 0 });
    }
    await batch.commit();
  }
);

function getFirstOfNextMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
```

### A.3 Cache intelligent avec TTL

**Fichier : `functions/src/scanner/cache/scanCache.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// TTL par type de scan (en heures)
const CACHE_TTL = {
  website: 168,         // 7 jours (le site change rarement)
  techStack: 168,       // 7 jours
  seo: 72,              // 3 jours (PageSpeed peut varier)
  email: 720,           // 30 jours (DNS change très rarement)
  googleBusiness: 24,   // 1 jour (avis changent souvent)
  social: 48,           // 2 jours
  financial: 720,       // 30 jours (Pappers met à jour mensuellement)
  wayback: 720,         // 30 jours
};

export async function getCachedResult(domain, scanType, organizationId) {
  const ttlHours = CACHE_TTL[scanType] || 168;
  const expiryDate = new Date(Date.now() - ttlHours * 60 * 60 * 1000);
  
  const cached = await db.collection('scanCache')
    .where('domain', '==', domain)
    .where('scanType', '==', scanType)
    .where('cachedAt', '>', expiryDate)
    .orderBy('cachedAt', 'desc')
    .limit(1)
    .get();
  
  if (cached.empty) return null;
  return cached.docs[0].data().result;
}

export async function setCachedResult(domain, scanType, result) {
  await db.collection('scanCache').add({
    domain,
    scanType,
    result,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + (CACHE_TTL[scanType] || 168) * 60 * 60 * 1000),
  });
}

// Nettoyage automatique du cache expiré (hebdomadaire)
export async function cleanExpiredCache() {
  const now = new Date();
  const expired = await db.collection('scanCache')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();
  
  const batch = db.batch();
  for (const doc of expired.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  
  return { deleted: expired.size };
}
```

### A.4 Compteurs distribués (éviter les hotspots Firestore)

**Fichier : `functions/src/scanner/scale/distributedCounters.js`**

```javascript
// Firestore peut gérer max ~1 écriture/seconde par document
// Avec 500 users, un compteur unique = bottleneck
// Solution : distributed counters avec N shards

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();
const NUM_SHARDS = 10; // 10 shards = 10 écritures/seconde

export async function incrementCounter(counterId, value = 1) {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = db.collection('counters').doc(counterId)
    .collection('shards').doc(String(shardId));
  
  await shardRef.set({ count: FieldValue.increment(value) }, { merge: true });
}

export async function getCounter(counterId) {
  const shards = await db.collection('counters').doc(counterId)
    .collection('shards').get();
  
  let total = 0;
  for (const shard of shards.docs) {
    total += shard.data().count || 0;
  }
  return total;
}

// Usage dans le scanner :
// await incrementCounter(`scans_${organizationId}_${monthKey}`);
// await incrementCounter('global_scans_today');
// const totalScans = await getCounter('global_scans_today');
```

### A.5 Cloud Functions v2 — Configuration haute performance

Modifier TOUTES les Cloud Functions du scanner pour utiliser ces paramètres optimisés :

```javascript
// Pour les fonctions de scan (CPU-intensive)
{
  region: 'europe-west1',
  memory: '1GiB',
  cpu: 1,                    // 1 CPU dédié
  timeoutSeconds: 120,
  concurrency: 20,           // 20 requêtes par instance (pas 80 par défaut)
  minInstances: 1,           // 1 instance toujours warm (évite cold start)
  maxInstances: 50,          // Max 50 instances = 1000 scans simultanés
}

// Pour les schedulers (légers)
{
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 300,
  concurrency: 1,            // Un seul scheduler à la fois
}

// Pour le pixel tracker (ultra-léger, haute fréquence)
{
  region: 'europe-west1',
  memory: '128MiB',
  concurrency: 80,           // Max concurrency pour le pixel
  minInstances: 1,           // Toujours warm
  maxInstances: 10,
}
```

---

## SECTION B : MOTEUR DE NICHE UNIVERSELLE

### B.1 NicheConfigEngine — Le client configure SA niche

Le client FMF ne doit PAS être limité aux restaurants. Il doit pouvoir cibler N'IMPORTE QUEL secteur.

**Fichier : `functions/src/scanner/niche/nicheConfigEngine.js`**

```javascript
// Chaque tenant configure sa niche avec :
// 1. Codes NAF cibles
// 2. Mots-clés métier
// 3. Concurrents à surveiller
// 4. Signaux d'achat spécifiques à son secteur
// 5. Templates de messages par signal

// Collection Firestore : tenants/{orgId}/nicheConfig
const NICHE_CONFIG_SCHEMA = {
  // IDENTITÉ DE LA NICHE
  nicheName: 'Restaurants Lyon',         // nom libre
  
  // CIBLAGE SIRENE
  codesNaf: ['5610A', '5610C', '5629A'], // codes NAF cibles
  localisations: ['69001', '69002', '69003'], // codes postaux OU départements
  tailleMin: 1,                          // effectif minimum
  tailleMax: 50,                         // effectif maximum
  
  // MOTS-CLÉS POUR LE WEB SCANNING
  keywords: {
    google_maps: ['restaurant', 'brasserie', 'pizzeria', 'bistrot'],
    crt_sh: ['restaurant', 'traiteur', 'brasserie'],          // pour CT Logs
    france_travail: ['chef de cuisine', 'serveur', 'maître d\'hôtel'], // offres emploi
    social: ['#restaurant', '#foodie', '#gastronomie'],        // hashtags
    serper: ['restaurant Lyon avis', 'meilleur restaurant Lyon'], // recherches Google
    leboncoin: ['cession restaurant', 'vente restaurant'],     // cessions
    forums: ['forum restaurateur', 'groupe facebook restauration'], // forums
  },
  
  // CONCURRENTS DU CLIENT (pour le scraping avis négatifs)
  competitors: [
    { name: 'Brevo', platforms: ['g2', 'trustpilot', 'capterra'] },
    { name: 'Mailchimp', platforms: ['g2', 'trustpilot'] },
  ],
  
  // SIGNAUX D'ACHAT PERSONNALISÉS
  customSignals: [
    {
      id: 'menu_outdated',
      condition: 'website.hasMenuPage && website.menuLastUpdated < 6_months_ago',
      score: 20,
      message: 'Menu en ligne non mis à jour depuis > 6 mois',
    },
    {
      id: 'no_reservation_system',
      condition: '!website.hasReservationWidget && !techStack.uses("TheFork") && !techStack.uses("Zenchef")',
      score: 25,
      message: 'Pas de système de réservation en ligne',
    },
  ],
  
  // SAISONNALITÉ PERSONNALISÉE
  seasonalRules: [
    { months: [3, 4], message: 'Saison terrasse : mettez à jour vos photos' },
    { months: [11, 12], message: 'Fêtes : boostez la visibilité pour les réservations de groupe' },
  ],
  
  // TEMPLATES DE MESSAGES PAR SIGNAL
  messageTemplates: {
    'no_analytics': {
      whatsapp: 'Bonjour {{contactName}}, j\'ai analysé {{companyName}} et remarqué que vous n\'avez pas de suivi de visites sur votre site. Savez-vous combien de clients potentiels visitent votre site chaque jour ?',
      email: 'Objet : {{companyName}} — une opportunité manquée chaque jour\n\nBonjour {{contactName}},\n\nJ\'ai analysé votre présence digitale...',
    },
    'declining_reviews': {
      whatsapp: 'Bonjour {{contactName}}, j\'ai vu que votre note Google est passée de {{oldRating}} à {{newRating}}. J\'ai 3 idées concrètes pour remonter rapidement.',
    },
  },
};
```

### B.2 Niche Presets — Templates de niches pré-configurées

**Fichier : `functions/src/scanner/niche/nichePresets.js`**

```javascript
// Le client peut choisir un preset OU personnaliser

export const NICHE_PRESETS = {
  restaurant: {
    nicheName: 'Restaurants & Restauration',
    codesNaf: ['5610A', '5610C', '5629A', '5629B', '5621Z'],
    keywords: {
      google_maps: ['restaurant', 'brasserie', 'pizzeria', 'bistrot', 'traiteur', 'snack'],
      france_travail: ['chef de cuisine', 'serveur', 'commis', 'maître d\'hôtel', 'plongeur'],
      social: ['#restaurant', '#foodie', '#gastronomie', '#chefetoile'],
    },
    customSignals: [
      { id: 'no_menu_online', condition: 'noMenuDetected', score: 20, message: 'Pas de menu visible en ligne' },
      { id: 'no_reservation', condition: 'noBookingSystem', score: 25, message: 'Pas de réservation en ligne' },
      { id: 'thefork_absent', condition: 'notOnTheFork', score: 15, message: 'Absent de TheFork/LaFourchette' },
    ],
    seasonalRules: [
      { months: [2], message: 'Saint-Valentin : boostez les réservations couple' },
      { months: [3, 4], message: 'Ouverture terrasse : mettez à jour vos photos' },
      { months: [6], message: 'Fête de la musique : événement spécial ?' },
      { months: [12], message: 'Réveillon : lancez la promo groupe/entreprise' },
    ],
  },
  
  artisan_btp: {
    nicheName: 'Artisans BTP',
    codesNaf: ['4321A', '4322A', '4322B', '4329A', '4329B', '4331Z', '4332A', '4332B', '4333Z', '4334Z', '4339Z', '4391A', '4391B', '4399A', '4399B', '4399C'],
    keywords: {
      google_maps: ['plombier', 'électricien', 'menuisier', 'maçon', 'peintre', 'carreleur', 'couvreur'],
      france_travail: ['plombier', 'électricien', 'chef de chantier', 'conducteur travaux'],
      social: ['#artisan', '#renovation', '#travaux', '#btp'],
    },
    customSignals: [
      { id: 'no_portfolio', condition: 'noGalleryDetected', score: 20, message: 'Pas de galerie de réalisations' },
      { id: 'no_devis_form', condition: 'noQuoteForm', score: 25, message: 'Pas de formulaire de demande de devis' },
      { id: 'rge_not_visible', condition: 'noRGEMention', score: 15, message: 'Label RGE non mis en avant' },
    ],
    seasonalRules: [
      { months: [1, 2, 3], message: 'Saison rénovation : les propriétaires planifient maintenant' },
      { months: [9, 10], message: 'Avant l\'hiver : urgence chauffage/isolation' },
    ],
  },
  
  salon_coiffure: {
    nicheName: 'Salons de coiffure & Beauté',
    codesNaf: ['9602A', '9602B', '9604Z'],
    keywords: {
      google_maps: ['coiffeur', 'salon de coiffure', 'barbier', 'esthéticienne', 'onglerie', 'institut beauté'],
      france_travail: ['coiffeur', 'esthéticienne', 'coloriste', 'barbier'],
      social: ['#coiffure', '#hairsalon', '#beauté', '#barbershop'],
    },
    customSignals: [
      { id: 'no_booking', condition: 'noOnlineBooking', score: 30, message: 'Pas de prise de RDV en ligne' },
      { id: 'old_style_photos', condition: 'oldPhotos', score: 15, message: 'Photos de réalisations datées' },
    ],
  },
  
  professions_liberales: {
    nicheName: 'Professions libérales',
    codesNaf: ['6920Z', '6910Z', '8622A', '8622B', '8623Z', '7111Z', '7112B'],
    keywords: {
      google_maps: ['avocat', 'dentiste', 'architecte', 'expert comptable', 'kinésithérapeute', 'ostéopathe'],
      france_travail: ['secrétaire médicale', 'assistant juridique', 'collaborateur comptable'],
    },
    customSignals: [
      { id: 'no_doctolib', condition: 'noDoctolibDetected', score: 25, message: 'Pas sur Doctolib (médecins/dentistes)' },
      { id: 'no_online_payment', condition: 'noOnlinePayment', score: 15, message: 'Pas de paiement en ligne' },
    ],
  },
  
  commerce_detail: {
    nicheName: 'Commerces de détail',
    codesNaf: ['4711A', '4711B', '4711C', '4711D', '4719A', '4719B', '4721Z', '4722Z', '4723Z', '4724Z', '4725Z', '4726Z', '4729Z'],
    keywords: {
      google_maps: ['boutique', 'magasin', 'épicerie', 'boulangerie', 'pâtisserie', 'fromagerie', 'caviste'],
      france_travail: ['vendeur', 'responsable magasin', 'caissier'],
      social: ['#commerce', '#boutique', '#artisanal', '#madeinfrance'],
    },
    customSignals: [
      { id: 'no_ecommerce', condition: 'noEcommerceDetected', score: 30, message: 'Pas de vente en ligne' },
      { id: 'no_click_collect', condition: 'noClickCollect', score: 20, message: 'Pas de Click & Collect' },
    ],
  },
  
  agence_immobiliere: {
    nicheName: 'Agences immobilières',
    codesNaf: ['6831Z', '6832A', '6832B'],
    keywords: {
      google_maps: ['agence immobilière', 'immobilier', 'gestion locative'],
      france_travail: ['agent immobilier', 'négociateur immobilier', 'gestionnaire locatif'],
    },
    customSignals: [
      { id: 'no_virtual_tour', condition: 'noVirtualTourDetected', score: 20, message: 'Pas de visites virtuelles' },
      { id: 'few_listings_online', condition: 'fewListings', score: 15, message: 'Peu d\'annonces en ligne' },
    ],
  },
  
  auto_garage: {
    nicheName: 'Garages & Réparation auto',
    codesNaf: ['4520A', '4520B', '4511Z', '4532Z'],
    keywords: {
      google_maps: ['garage', 'réparation auto', 'carrosserie', 'contrôle technique', 'mécanicien'],
      france_travail: ['mécanicien', 'carrossier', 'technicien automobile'],
    },
    customSignals: [
      { id: 'no_rdv_online', condition: 'noBookingSystem', score: 25, message: 'Pas de prise de RDV en ligne' },
      { id: 'no_devis_auto', condition: 'noQuoteForm', score: 20, message: 'Pas de demande de devis en ligne' },
    ],
  },
  
  formation_coaching: {
    nicheName: 'Formation & Coaching',
    codesNaf: ['8559A', '8559B', '8560Z'],
    keywords: {
      google_maps: ['centre de formation', 'coach', 'consulting', 'formation professionnelle'],
      france_travail: ['formateur', 'coach', 'consultant'],
      social: ['#formation', '#coaching', '#developpementpersonnel'],
    },
  },
  
  // NICHE CUSTOM : le client remplit tout lui-même
  custom: {
    nicheName: '',
    codesNaf: [],
    keywords: { google_maps: [], france_travail: [], social: [] },
    customSignals: [],
    seasonalRules: [],
  },
};
```

### B.3 Frontend : Niche Configurator Wizard

**Fichier : `src/components/scanner/NicheConfigurator.jsx`**

Crée un wizard en 4 étapes :

**Étape 1 — Choix du preset :**
- Grille de cartes : Restaurant, Artisan BTP, Salon Coiffure, Commerce, Immobilier, Garage, Formation, Professions libérales, CUSTOM
- Chaque carte avec icône, description courte, nombre de signaux pré-configurés
- Clic → charge le preset

**Étape 2 — Personnalisation géographique :**
- Carte de France interactive (ou simple sélecteur département/ville)
- Multi-sélection de zones
- Rayon autour d'une adresse (5km, 10km, 25km, 50km)

**Étape 3 — Concurrents à surveiller :**
- Input pour ajouter des noms de concurrents
- Pour chaque concurrent : choix des plateformes (G2, Trustpilot, Google Reviews)
- Preview : "On va surveiller les avis négatifs de Brevo, Mailchimp sur G2 et Trustpilot"

**Étape 4 — Résumé & lancement :**
- Résumé de la config
- Estimation du nombre de prospects trouvables
- Bouton "Lancer le scan initial"

Utilise Tailwind CSS, cohérent avec le design FMF existant. Sauvegarde dans `tenants/{orgId}/nicheConfig`.

---

## SECTION C : PRODUCTION HARDENING

### C.1 Rate Limiter global pour APIs externes

**Fichier : `functions/src/scanner/scale/rateLimiter.js`**

```javascript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// Limites par API externe (par minute)
const API_RATE_LIMITS = {
  'crt.sh': { perMinute: 10, perDay: 500 },
  'france_travail': { perMinute: 20, perDay: 5000 },
  'pappers': { perMinute: 5, perDay: 100 },         // Free tier
  'pagespeed': { perMinute: 60, perDay: 25000 },     // Avec API key
  'openweathermap': { perMinute: 60, perDay: 1000 },
  'wayback': { perMinute: 15, perDay: 1000 },
  'apify': { perMinute: 10, perDay: 500 },
  'groq': { perMinute: 30, perDay: 14400 },          // Free tier Groq
};

export async function checkRateLimit(apiName) {
  const limits = API_RATE_LIMITS[apiName];
  if (!limits) return { allowed: true };
  
  const now = new Date();
  const minuteKey = `ratelimit_${apiName}_${now.toISOString().substring(0, 16)}`; // par minute
  const dayKey = `ratelimit_${apiName}_${now.toISOString().substring(0, 10)}`; // par jour
  
  // Vérifier la limite par minute
  const minuteDoc = await db.collection('rateLimits').doc(minuteKey).get();
  const minuteCount = minuteDoc.exists ? minuteDoc.data().count : 0;
  
  if (minuteCount >= limits.perMinute) {
    return { allowed: false, reason: 'minute_limit', retryAfter: 60 };
  }
  
  // Vérifier la limite par jour
  const dayDoc = await db.collection('rateLimits').doc(dayKey).get();
  const dayCount = dayDoc.exists ? dayDoc.data().count : 0;
  
  if (dayCount >= limits.perDay) {
    return { allowed: false, reason: 'daily_limit', retryAfter: 3600 };
  }
  
  // Incrémenter les compteurs
  await db.collection('rateLimits').doc(minuteKey).set(
    { count: FieldValue.increment(1), expiresAt: new Date(now.getTime() + 120000) },
    { merge: true }
  );
  await db.collection('rateLimits').doc(dayKey).set(
    { count: FieldValue.increment(1), expiresAt: new Date(now.getTime() + 86400000) },
    { merge: true }
  );
  
  return { allowed: true, minuteCount: minuteCount + 1, dayCount: dayCount + 1 };
}

// Wrapper : appelle une API externe avec rate limiting
export async function callWithRateLimit(apiName, apiCall) {
  const check = await checkRateLimit(apiName);
  
  if (!check.allowed) {
    console.warn(`⚠️ Rate limit atteint pour ${apiName} (${check.reason}). Retry dans ${check.retryAfter}s`);
    throw new Error(`RATE_LIMIT_${apiName.toUpperCase()}`);
  }
  
  return await apiCall();
}
```

### C.2 Monitoring & Alerting

**Fichier : `functions/src/scanner/monitoring/scanMonitor.js`**

```javascript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

// Rapport quotidien des scans (Telegram ou Firestore)
export const dailyScanReport = onSchedule(
  {
    schedule: '0 20 * * *', // 20h chaque jour
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
  },
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Compter les scans du jour
    const scansToday = await db.collection('scanResults')
      .where('scannedAt', '>=', today)
      .count()
      .get();
    
    // Compter les signaux détectés
    const signalsToday = await db.collection('scanSignals')
      .where('detectedAt', '>=', today)
      .count()
      .get();
    
    // Compter les signaux haute priorité
    const criticalSignals = await db.collection('scanResults')
      .where('scannedAt', '>=', today)
      .where('priority', 'in', ['critical', 'high'])
      .count()
      .get();
    
    // Vérifier les erreurs
    const errors = await db.collection('scanErrors')
      .where('occurredAt', '>=', today)
      .count()
      .get();
    
    const report = {
      date: today.toISOString().split('T')[0],
      scansCompleted: scansToday.data().count,
      signalsDetected: signalsToday.data().count,
      criticalSignals: criticalSignals.data().count,
      errors: errors.data().count,
      generatedAt: new Date(),
    };
    
    await db.collection('scanReports').add(report);
    
    // Optionnel : envoyer sur Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const message = `📊 FMF Scanner Daily Report
🔍 Scans : ${report.scansCompleted}
📡 Signaux : ${report.signalsDetected}
🔴 Critiques : ${report.criticalSignals}
❌ Erreurs : ${report.errors}`;
      
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message,
        }),
      });
    }
    
    console.log(`📊 Daily report:`, report);
  }
);
```

### C.3 Error tracking centralisé

**Fichier : `functions/src/scanner/monitoring/errorTracker.js`**

```javascript
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function trackScanError(source, domain, error, context = {}) {
  await db.collection('scanErrors').add({
    source,           // "techStackDetector", "ctLogsMonitor", etc.
    domain,
    errorMessage: error.message || String(error),
    errorStack: error.stack || null,
    context,          // { organizationId, prospectId, ... }
    occurredAt: new Date(),
    resolved: false,
  });
  
  console.error(`❌ Scan error [${source}] ${domain}:`, error.message);
}

// Wrapper pour toutes les fonctions de scan
export function withErrorTracking(source, scanFn) {
  return async function(domain, ...args) {
    try {
      return await scanFn(domain, ...args);
    } catch (error) {
      await trackScanError(source, domain, error);
      return null; // Graceful degradation
    }
  };
}

// Usage dans scanOrchestrator.js :
// import { withErrorTracking } from './monitoring/errorTracker.js';
// const safeAnalyzeWebsite = withErrorTracking('websiteAnalyzer', analyzeWebsite);
// const result = await safeAnalyzeWebsite(domain);
```

### C.4 Firestore Security Rules pour le scanner

Ajouter ces règles dans `firestore.rules` :

```
// Scanner results — lecture par le tenant, écriture par Cloud Functions seulement
match /scanResults/{resultId} {
  allow read: if request.auth != null && 
    resource.data.organizationId == getUserOrganization(request.auth.uid);
  allow write: if false; // Seulement via admin SDK (Cloud Functions)
}

match /scanSignals/{signalId} {
  allow read: if request.auth != null && 
    resource.data.organizationId == getUserOrganization(request.auth.uid);
  allow write: if false;
}

match /scanCache/{cacheId} {
  allow read, write: if false; // Interne uniquement
}

match /tenantQuotas/{orgId} {
  allow read: if request.auth != null && 
    orgId == getUserOrganization(request.auth.uid);
  allow write: if false;
}

match /scanNotifications/{notifId} {
  allow read: if request.auth != null && 
    resource.data.userId == request.auth.uid;
  allow write: if false;
}

match /rateLimits/{limitId} {
  allow read, write: if false; // Interne uniquement
}

match /scanErrors/{errorId} {
  allow read, write: if false; // Admin uniquement
}

match /scanReports/{reportId} {
  allow read: if false; // Admin dashboard uniquement
  allow write: if false;
}

// Pixel visits — écriture par la Cloud Function HTTP, lecture par le tenant
match /pixelVisits/{visitId} {
  allow read: if request.auth != null && 
    resource.data.organizationId == getUserOrganization(request.auth.uid);
  allow write: if false;
}
```

### C.5 Index Firestore complets

Ajouter dans `firestore.indexes.json` :

```json
{
  "indexes": [
    {
      "collectionGroup": "scanResults",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "priority", "order": "ASCENDING" },
        { "fieldPath": "scannedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanResults",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "domain", "order": "ASCENDING" },
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "scannedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanSignals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "detectedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanSignals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "source", "order": "ASCENDING" },
        { "fieldPath": "detectedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanSignals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "prospectId", "order": "ASCENDING" },
        { "fieldPath": "detectedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanCache",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "domain", "order": "ASCENDING" },
        { "fieldPath": "scanType", "order": "ASCENDING" },
        { "fieldPath": "cachedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "pixelVisits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "visitedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "scanErrors",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## SECTION D : VARIABLES D'ENVIRONNEMENT À AJOUTER

```bash
# Ajouter via : firebase functions:secrets:set NOM_VARIABLE

# Section A — Cloud Tasks
# (utilise le service account par défaut, pas de var supplémentaire)

# Section B — Niche Engine
# (config stockée dans Firestore, pas de vars)

# Section C — Monitoring
TELEGRAM_BOT_TOKEN=xxx              # optionnel, pour les alertes
TELEGRAM_CHAT_ID=xxx                # optionnel

# Rappel vars du prompt précédent (déjà configurées)
GROQ_API_KEY=xxx
INSEE_API_KEY=xxx
FRANCE_TRAVAIL_CLIENT_ID=xxx
FRANCE_TRAVAIL_CLIENT_SECRET=xxx
PAPPERS_API_KEY=xxx
OPENWEATHERMAP_API_KEY=xxx
GOOGLE_PAGESPEED_API_KEY=xxx
```

---

## SECTION E : CLOUD TASKS SETUP

Avant de déployer, créer la queue Cloud Tasks :

```bash
# Créer la queue pour les scans
gcloud tasks queues create prospect-scans \
  --location=europe-west1 \
  --max-dispatches-per-second=5 \
  --max-concurrent-dispatches=20 \
  --max-attempts=3 \
  --min-backoff=10s \
  --max-backoff=300s

# Vérifier
gcloud tasks queues describe prospect-scans --location=europe-west1
```

---

## ORDRE D'EXÉCUTION

1. **Section A** : Cloud Tasks queue + tenantQuotas + cache + distributed counters
2. **Section B** : NicheConfigEngine + presets + NicheConfigurator.jsx
3. **Section C** : Rate limiter + error tracking + monitoring + security rules + indexes
4. **Section D** : Variables d'environnement
5. **Section E** : Cloud Tasks setup
6. **Test** : Créer un tenant test, configurer une niche "restaurant Lyon", lancer un scan de 10 prospects, vérifier les résultats dans Firestore

```bash
# Tests finaux
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only hosting

# Vérifier
firebase functions:list | grep scan
gcloud tasks queues describe prospect-scans --location=europe-west1
npm run build  # 0 erreurs
```
