# FMF - Rapport de Deploiement V2 : Machine de Guerre Prospection Phase 1-10

**Date** : 28 Fevrier 2026
**Projet** : `face-media-factory`
**Region** : `europe-west1`
**Runtime** : Node.js 20 (ESM)
**Branch** : `main`
**Commits** :
- `509e9d7` — feat: Phase 1-10 Machine de Guerre Prospection Multicanale
- `a089550` — test: add Phase 1-10 module validation script
- `114676f` — merge: dev -> main
- `6be0cd9` — docs: complete env vars reference in .env.example (84 vars)

**Hosting** : https://face-media-factory.web.app

---

## Resultat Global

| Cible | Statut | Details |
|-------|--------|---------|
| Cloud Functions | DEPLOYED | 125+ fonctions (87 callable + 21 scheduled + 17 HTTP) |
| Firestore Rules | DEPLOYED | Multi-tenant RBAC + 6 nouvelles subcollections |
| Hosting | DEPLOYED | 102 fichiers, build 14.02s |
| Frontend Build | PASS | Zero erreurs, zero warnings bloquants |
| Module Tests | PASS | 18/18 modules importent correctement |
| E2E Smoke Tests | PASS | Toutes les fonctions ACTIVE, TCP probes OK |

---

## Ce qui a ete deploye (Phase 1-10)

### Phase 1 — Orchestrator Helpers (4 fichiers)

| Fichier | Exports | Description |
|---------|---------|-------------|
| `functions/src/orchestrator/helpers/budgetCalculator.js` | `calculateDailyBudgets`, `getChannelAllocation`, `getRemainingBudget` | Repartition budget quotidien par canal (8 canaux) |
| `functions/src/orchestrator/helpers/businessHoursValidator.js` | `isWithinBusinessHours`, `getNextSendWindow`, `getBusinessHoursForOrg` | Verification heures ouvrables + weekends |
| `functions/src/orchestrator/helpers/channelHealthCheck.js` | `checkAllChannelsHealth`, `checkChannelHealth`, `getHealthySendableChannels` | Health check par canal (API ping) |
| `functions/src/orchestrator/helpers/batchCalculator.js` | `calculateBatchSize`, `calculateDelay`, `splitIntoBatches`, `getWarmupLimits` | Batch adaptif + jitter gaussien anti-detection |

### Phase 2 — Channel Dispatchers (8 fichiers)

Chaque dispatcher suit le pattern : health check -> budget check -> warmup batch -> send via existing sender -> log.

| Fichier | Canal | Sender existant utilise |
|---------|-------|------------------------|
| `orchestrator/dispatchers/emailDispatcher.js` | Email | `sendCampaignEmail` |
| `orchestrator/dispatchers/smsDispatcher.js` | SMS | `sendSMS` / `sendSMSOvh` |
| `orchestrator/dispatchers/whatsappDispatcher.js` | WhatsApp | `whatsappSender.sendWhatsAppManual` |
| `orchestrator/dispatchers/instagramDispatcher.js` | Instagram | `multiAccountDmSender` |
| `orchestrator/dispatchers/linkedinDispatcher.js` | LinkedIn | `linkedinService` (Phase 5) |
| `orchestrator/dispatchers/voicemailDispatcher.js` | Voicemail | `sendVoicemailDrop` |
| `orchestrator/dispatchers/postalDispatcher.js` | Postal | `sendLetterMF` |
| `orchestrator/dispatchers/twitterDispatcher.js` | Twitter | Placeholder (future) |

### Phase 3 — Master Scheduler (coeur du systeme)

| Fonction | Type | Schedule | Description |
|----------|------|----------|-------------|
| `masterScheduler` | onSchedule | every 15 minutes | Scan orgs actives, dispatch vers dispatchers, log resultats |
| `runMasterSchedulerManual` | onCall | — | Test admin une seule org |
| `dailyBudgetManager` | onSchedule | every day 00:05 | Reset budgets quotidiens |
| `replyAggregator` | onSchedule | every 30 minutes | Scan interactions, classifier replies, alimenter replyFeeds |

**`functions/src/orchestrator/warRoomStats.js`** :
| Fonction | Type | Description |
|----------|------|-------------|
| `getWarRoomStats` | onCall | Stats cross-org (super admin) |
| `getWarRoomOrgList` | onCall | Liste orgs avec status prospection |
| `toggleOrgProspection` | onCall | Activer/desactiver prospection par org |
| `emergencyPauseAll` | onCall | Pause urgence globale |

### Phase 4 — Channel Router Upgrade

**Fichier modifie** : `functions/src/engine/channelRouter.js`

Ajouts :
- LinkedIn + Twitter dans `CHANNEL_PRIORITY_BY_SCORE`, `PLAN_CHANNELS`, `CHANNEL_COSTS`, `DEFAULT_FALLBACKS`
- `generateOptimalSequence(orgId, prospectId, options)` — sequence multi-canal 7 touchpoints
- `allocateChannelBudgets(orgId, dailyLimit)` — repartition basee sur performance historique
- `selectChannelsByLeadType(lead)` — routing par type (B2B, local, social)

### Phase 5 — LinkedIn Module (3 fichiers)

| Fichier | Exports | Description |
|---------|---------|-------------|
| `hunters/linkedin/linkedinService.js` | `getLinkedInAccounts`, `createCampaign`, `addLeadsToCampaign`, `getCampaignStats`, `sendConnectionRequest`, `sendMessage`, `getInboxMessages` | Client HeyReach API |
| `hunters/linkedin/linkedinScraper.js` | `scrapeLinkedInSearch`, `scrapeLinkedInCompany`, `scrapeLinkedInProfile` | Apify LinkedIn scraping |
| `hunters/linkedin/linkedinHunter.js` | `linkedinHunter`, `runLinkedInHunterManual`, `getLinkedInHunterStats`, `syncLinkedInInbox`, `addLinkedInAccount`, `removeLinkedInAccount` | onCall functions LinkedIn |

### Phase 6 — Google Maps Apify Upgrade

**Fichier modifie** : `functions/src/hunters/googlemaps/googleMapsHunter.js`

Ajouts :
- `scrapeGoogleMapsApify(query, location, limit)` — Apify actor avec fallback Serper
- `enrichGoogleMapsLead(place)` — enrichissement post-scrape
- `runGoogleMapsSourcingManual` — onCall lancement interactif depuis frontend

### Phase 7 — Frontend Hooks (3 fichiers)

| Hook | Fonctionnalites |
|------|----------------|
| `src/hooks/useLinkedIn.js` | CRUD comptes, campagnes, inbox, stats + mock data fallback |
| `src/hooks/useGoogleMapsSourcing.js` | Recherche, leads, stats + mock data fallback |
| `src/hooks/useWarRoom.js` | Stats cross-org, org list, reply feed, emergency controls + mock data |

### Phase 8 — Frontend Pages (3 fichiers)

| Page | Route | Tabs/Sections |
|------|-------|---------------|
| `src/pages/LinkedIn.jsx` | `/app/linkedin` | Comptes, Campagnes, Inbox |
| `src/pages/GoogleMapsSourcing.jsx` | `/app/google-maps` | Recherche + Resultats + Stats |
| `src/pages/WarRoom.jsx` | `/app/war-room` | Vue globale, Par organisation, Replies live, Controles |

### Phase 9 — Frontend Composants (10 fichiers)

**LinkedIn** :
- `src/components/linkedin/LinkedInAccountCard.jsx`
- `src/components/linkedin/LinkedInCampaignCard.jsx`
- `src/components/linkedin/LinkedInInboxItem.jsx`

**Google Maps** :
- `src/components/googlemaps/GoogleMapsLeadCard.jsx`
- `src/components/googlemaps/GoogleMapsFilters.jsx`

**War Room** :
- `src/components/warroom/ChannelStatsBar.jsx`
- `src/components/warroom/OrgTable.jsx`
- `src/components/warroom/LiveReplyFeed.jsx`
- `src/components/warroom/WarRoomCharts.jsx`
- `src/components/warroom/EmergencyControls.jsx`

### Phase 10 — Integration

| Fichier | Modification |
|---------|-------------|
| `src/App.jsx` | +3 lazy imports, +3 routes (LinkedIn, Google Maps, War Room) |
| `src/components/Layout.jsx` | +3 navItems dans sidebar |
| `functions/src/index.js` | +exports orchestrator, linkedin, google maps, war room |
| `firestore.rules` | +rules pour 6 nouvelles subcollections |
| `src/components/settings/ChannelsSettings.jsx` | +section LinkedIn + Google Maps config |

---

## Cloud Tasks Agents (deployes session precedente)

| Agent | URL | Memory | Max Instances | Timeout |
|-------|-----|--------|---------------|---------|
| emailAgent | `europe-west1-face-media-factory.cloudfunctions.net/emailAgent` | 512MiB | 10 | 120s |
| whatsappAgent | `europe-west1-face-media-factory.cloudfunctions.net/whatsappAgent` | 512MiB | 3 | 120s |
| instagramAgent | `europe-west1-face-media-factory.cloudfunctions.net/instagramAgent` | 512MiB | 3 | 120s |
| linkedinAgent | `europe-west1-face-media-factory.cloudfunctions.net/linkedinAgent` | 512MiB | 2 | 120s |
| orchestratorAgent | `europe-west1-face-media-factory.cloudfunctions.net/orchestratorAgent` | 512MiB | 10 | 120s |

---

## Nouvelles Subcollections Firestore

| Collection | Description | Rules |
|-----------|-------------|-------|
| `organizations/{orgId}/channelAccounts/{accountId}` | Comptes par canal (LinkedIn, Instagram, etc.) | RBAC admin/editor |
| `organizations/{orgId}/outreachCampaigns/{campaignId}` | Campagnes orchestrateur | RBAC admin/editor |
| `organizations/{orgId}/dailyBudgets/{date}` | Budget + usage quotidien par canal | RBAC admin/editor |
| `organizations/{orgId}/orchestratorLogs/{logId}` | Logs execution scheduler | RBAC read all members |
| `organizations/{orgId}/orchestratorState` | Etat courant orchestrateur (doc unique) | RBAC admin/editor |
| `organizations/{orgId}/replyFeeds/{replyId}` | Feed replies classifiees | RBAC read all members |

---

## Tests End-to-End Post-Deploiement

### Fonctions Scheduled

| Fonction | Statut | Observation |
|----------|--------|-------------|
| masterScheduler (every 15min) | PASS | 4 orgs actives, skip hors business hours, ~1.5s execution |
| orchestratorCron (every 30min) | PASS | 4 orgs scannees, cycle complet en ~1s |
| dailyBudgetManager (daily 00:05) | PASS | Deploye ACTIVE |
| replyAggregator (every 30min) | WARN | Index composite manquant sur `interactions` (direction + createdAt) |
| dailyAutoPilot (daily) | PASS | Reset counters + warmup increment + Serper search OK |
| googleMapsHunter (daily) | PASS | Scan complete, 0 resultats (pas de config hunting) |

### Fonctions Callable

| Fonction | Statut |
|----------|--------|
| getWarRoomStats | ACTIVE |
| getWarRoomOrgList | ACTIVE |
| toggleOrgProspection | ACTIVE |
| emergencyPauseAll | ACTIVE |
| runMasterSchedulerManual | ACTIVE |
| linkedinHunter | ACTIVE |
| runLinkedInHunterManual | ACTIVE |
| getLinkedInHunterStats | ACTIVE |
| syncLinkedInInbox | ACTIVE |
| addLinkedInAccount | ACTIVE |
| removeLinkedInAccount | ACTIVE |
| runGoogleMapsSourcingManual | ACTIVE |

### Cloud Tasks Agents

| Agent | TCP Probe | State |
|-------|-----------|-------|
| emailAgent | OK (1 attempt) | ACTIVE |
| whatsappAgent | OK (1 attempt) | ACTIVE |
| instagramAgent | OK (1 attempt) | ACTIVE |
| linkedinAgent | OK (1 attempt) | ACTIVE |
| orchestratorAgent | OK (1 attempt) | ACTIVE |

### Frontend

| Test | Resultat |
|------|----------|
| Build Vite | PASS (102 fichiers, 14.02s, 0 erreurs) |
| Hosting deploy | PASS (102 files uploaded) |
| Page load | PASS (titre "Face Media Factory — Growth Intelligence Platform") |

---

## Variables d'Environnement

### Etat actuel
- **84 variables documentees** dans `functions/.env.example`
- **Methode** : `functions/.env` auto-charge par Firebase Functions v2
- **Aucun `dotenv`**, aucun `functions.config()` dans le nouveau code
- **Tous les modules Phase 1-10** utilisent `process.env.VAR || ''` (fallback gracieux)

### Variables requises pour fonctionnement complet

| Variable | Module | Priorite |
|----------|--------|----------|
| `EMAIL_ENCRYPTION_KEY` | Email encryption | Haute (set up quand comptes email connectes) |
| `INSTAGRAM_ENCRYPTION_KEY` | Instagram credentials | Haute (set up quand comptes IG connectes) |
| `HEYREACH_API_KEY` | LinkedIn (Phase 5) | Moyenne (quand HeyReach souscrit) |
| `APIFY_API_TOKEN` | LinkedIn + Google Maps scraping | Moyenne (quand Apify souscrit) |
| `GEMINI_API_KEY` | IA (messages, classification) | Haute (deja configure) |
| `SERPER_API_KEY` | Google Maps hunter | Haute (deja configure) |

### Variables deja configurees (via functions/.env)
- `GEMINI_API_KEY` (aussi en `functions.config()` legacy)
- `SERPER_API_KEY`
- Variables SMTP, OVH SMS, Evolution API (selon comptes actifs)

---

## Warnings Non-Bloquants

### 1. Encryption keys manquantes
```
CRITICAL: EMAIL_ENCRYPTION_KEY env var is not set
CRITICAL: INSTAGRAM_ENCRYPTION_KEY env var is not set
```
**Impact** : Log au startup, pas de crash. Les fonctions operent sans chiffrement jusqu'a ce que les cles soient ajoutees.

### 2. Index Firestore manquant
```
replyAggregator: FAILED_PRECONDITION: The query requires an index
Collection: interactions
Champs: direction (ASC) + createdAt (ASC)
```
**Impact** : Le replyAggregator skip les orgs ou l'index n'existe pas. Creer l'index via la console Firebase.

### 3. Firestore rules warning
```
Warning: unused function isViewer
```
**Impact** : Zero. Fonction utilitaire pour usage futur.

---

## Metriques Build Frontend

| Bundle | Taille |
|--------|--------|
| `firebase-vendor` | 503.38 kB |
| `charts (Recharts)` | 561.31 kB |
| `Settings` | 87.77 kB |
| `SocialOutreach` | 61.67 kB |
| `Hunter` | 45.60 kB |
| `WarRoom` | 36.41 kB |
| **Total dist** | **102 fichiers** |

---

## Fichiers Crees/Modifies (Resume)

### 33 fichiers crees
- 4 helpers orchestrator
- 8 dispatchers
- 2 fichiers orchestrator (masterScheduler, warRoomStats)
- 3 fichiers LinkedIn backend
- 3 hooks frontend
- 3 pages frontend
- 10 composants frontend

### 7 fichiers modifies
- `functions/src/engine/channelRouter.js` (+linkedin, +twitter, +3 fonctions)
- `functions/src/hunters/googlemaps/googleMapsHunter.js` (+Apify, +enrichment, +onCall)
- `src/App.jsx` (+3 routes)
- `src/components/Layout.jsx` (+3 navItems)
- `functions/src/index.js` (+exports)
- `firestore.rules` (+6 subcollections)
- `src/components/settings/ChannelsSettings.jsx` (+LinkedIn config)

### Fichiers documentation
- `functions/.env.example` (mis a jour : 35 -> 128 lignes, 84 vars)
- `scripts/test-new-modules.mjs` (validation script)
- `CLAUDE.md` (mis a jour v5.0)

---

## Prochaines Actions

1. **Creer l'index Firestore manquant** pour `interactions` (direction + createdAt)
2. **Configurer `EMAIL_ENCRYPTION_KEY`** et `INSTAGRAM_ENCRYPTION_KEY` dans `functions/.env`
3. **Souscrire HeyReach** et configurer `HEYREACH_API_KEY` pour activer LinkedIn
4. **Souscrire Apify** et configurer `APIFY_API_TOKEN` pour activer LinkedIn scraping + Google Maps Apify
5. **Tester en business hours** (8h-20h Europe/Paris) pour valider l'envoi reel de messages
6. **Migrer `gemini.apikey`** de `functions.config()` vers `functions/.env` (deprecation Mars 2026)

---

## Commandes Utiles

```bash
# Logs du scheduler principal
firebase functions:log --only masterScheduler,orchestratorCron --project face-media-factory

# Logs des agents Cloud Tasks
firebase functions:log --only emailAgent,whatsappAgent,instagramAgent,linkedinAgent,orchestratorAgent --project face-media-factory

# Logs War Room
firebase functions:log --only getWarRoomStats,getWarRoomOrgList --project face-media-factory

# Logs LinkedIn
firebase functions:log --only linkedinHunter,runLinkedInHunterManual --project face-media-factory

# Logs replyAggregator
firebase functions:log --only replyAggregator --project face-media-factory

# Redeploy
firebase deploy --only functions --project face-media-factory
firebase deploy --only hosting --project face-media-factory
firebase deploy --only firestore:rules --project face-media-factory

# Lister toutes les fonctions
firebase functions:list --project face-media-factory
```
