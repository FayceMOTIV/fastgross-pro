# Face Media Factory v5.0 - Instructions Claude Code

## Vue d'ensemble

Face Media Factory est un SaaS multi-tenant de prospection intelligente multicanale propulse par l'IA. Architecture 100% serverless Firebase (zero VPS, zero Redis, zero BullMQ).

**Projet Firebase** : `face-media-factory`
**Region** : `europe-west1`
**Runtime** : Node.js 20 (ESM)
**Hosting** : https://face-media-factory.web.app

### Stack Principal
- **Frontend** : React 18 + Vite 6 + Tailwind CSS
- **Backend** : Firebase (Auth, Firestore, Functions v2, Hosting)
- **Queues** : Google Cloud Tasks (remplace BullMQ)
- **IA** : Gemini 1.5 Flash (principal) + Groq + OpenRouter + Claude (fallback)
- **Charts** : Recharts

### Services Externes
| Canal | Service | Notes |
|-------|---------|-------|
| Email | Amazon SES / Nodemailer | $0.10/1000 emails |
| SMS | OVH Telecom | 0.0045 EUR/SMS France |
| WhatsApp | Evolution API | Open-source, self-hosted |
| Instagram DM | Multi-compte rotatif | Anti-ban integre |
| LinkedIn | HeyReach API + Apify | Scraping + outreach |
| Voicemail | Drop Cowboy | Voicemail drop |
| Courrier | Merci Facteur + PostGrid | Lettres recommandees |
| Scraping | Serper.dev + Apify | Google Maps, LinkedIn, social |
| Enrichissement | Derrick > Apollo > Hunter > Dropcontact > BetterContact | Waterfall 5 providers |
| Verification | NeverBounce | SMTP-level |
| Posting | Postiz + Late API | Multi-plateforme |

---

## Architecture v5.0 (100% Serverless)

```
face-media-factory/
├── src/                              # Frontend React
│   ├── App.jsx                       # Router + Auth/Org guards + permissions
│   ├── main.jsx                      # Entry point + Toast config
│   │
│   ├── pages/ (46 pages)
│   │   ├── Landing.jsx               # Page d'accueil marketing
│   │   ├── Pricing.jsx               # Tarification 3 forfaits
│   │   ├── Login.jsx / Signup.jsx    # Auth
│   │   ├── Dashboard.jsx             # KPIs temps reel
│   │   ├── Prospects.jsx             # Gestion prospects
│   │   ├── DailyProspects.jsx        # Prospects du jour
│   │   ├── LeadPipeline.jsx          # Pipeline Kanban
│   │   ├── Scanner.jsx               # Analyse sites web IA
│   │   ├── Forgeur.jsx               # Generation sequences IA
│   │   ├── Radar.jsx                 # Lead scoring IA
│   │   ├── Campaigns.jsx             # Campagnes multicanales
│   │   ├── Sequences.jsx             # Sequences d'envoi
│   │   ├── EmailSequences.jsx        # Sequences email dediees
│   │   ├── Templates.jsx             # Templates messages
│   │   ├── Proof.jsx                 # Rapports ROI + graphiques
│   │   ├── Analytics.jsx             # Analytics avancees
│   │   ├── Hunter.jsx                # Sourcing multi-plateforme
│   │   ├── LinkedIn.jsx              # Module LinkedIn (HeyReach)
│   │   ├── GoogleMapsSourcing.jsx    # Sourcing Google Maps
│   │   ├── SocialOutreach.jsx        # Outreach social cross-platform
│   │   ├── Inbox.jsx                 # Boite de reception unifiee
│   │   ├── Interactions.jsx          # Historique interactions
│   │   ├── Integrations.jsx          # Integrations tierces
│   │   ├── WhatsAppDashboard.jsx     # Dashboard WhatsApp
│   │   ├── AutoPilotDashboard.jsx    # Dashboard AutoPilot
│   │   ├── AutoPilotSetup.jsx        # Configuration AutoPilot
│   │   ├── AIPersonalization.jsx     # Personnalisation IA
│   │   ├── EmailEnrichment.jsx       # Enrichissement emails
│   │   ├── MultiPlatformPosting.jsx  # Posting multi-plateforme
│   │   ├── MonitoringDashboard.jsx   # Monitoring canaux
│   │   ├── WarRoom.jsx              # War Room admin (cross-org)
│   │   ├── ClientSetup.jsx           # Setup client wizard
│   │   ├── Settings.jsx              # Parametres (router)
│   │   ├── Team.jsx                  # Gestion equipe
│   │   ├── Admin.jsx                 # Panel admin
│   │   ├── Onboarding*.jsx           # Flow onboarding (4 pages)
│   │   ├── TestEmail.jsx             # Test email admin
│   │   ├── TestAutopilot.jsx         # Test autopilot
│   │   └── Unsubscribe.jsx           # Page desinscription
│   │
│   ├── components/
│   │   ├── Layout.jsx                # Sidebar + TopBar + org switcher
│   │   ├── settings/ (18 fichiers)   # Sous-composants Settings
│   │   ├── linkedin/ (3)             # LinkedInAccountCard, CampaignCard, InboxItem
│   │   ├── googlemaps/ (2)           # GoogleMapsLeadCard, Filters
│   │   ├── warroom/ (5)              # ChannelStatsBar, OrgTable, LiveReplyFeed, Charts, Emergency
│   │   ├── social/ (4)              # AccountCard, CampaignWizard, ProspectTable, StatsCard
│   │   ├── ai/ (3)                  # MessageGenerator, ProviderStatus, PuterMessageGenerator
│   │   ├── analytics/ (2)           # ChannelComparisonChart, MultichannelFunnel
│   │   ├── pricing/ (2)             # PricingCard, PricingToggle
│   │   └── ... (24 composants racine)
│   │
│   ├── hooks/ (12)
│   │   ├── useFirestore.js           # CRUD Firestore generique
│   │   ├── useCloudFunctions.js      # Appels Cloud Functions
│   │   ├── usePermissions.jsx        # RBAC
│   │   ├── useAutoPilot.js           # AutoPilot state
│   │   ├── useEmailAccounts.js       # Comptes email
│   │   ├── useLinkedIn.js            # Module LinkedIn
│   │   ├── useGoogleMapsSourcing.js  # Sourcing Google Maps
│   │   ├── useWarRoom.js             # War Room admin
│   │   ├── useSocialOutreach.js      # Outreach social
│   │   ├── useNicheConfig.js         # Config niches
│   │   ├── useKeyboardShortcuts.js   # Raccourcis clavier
│   │   └── useDemo.js               # Mode demo
│   │
│   ├── contexts/ (6)
│   │   ├── AuthContext.jsx           # Firebase Auth + profil
│   │   ├── OrgContext.jsx            # Multi-tenant + RBAC
│   │   ├── ThemeContext.jsx          # Theme clair/sombre
│   │   ├── NotificationContext.jsx   # Notifications
│   │   ├── OnboardingContext.jsx     # Flow onboarding
│   │   └── DemoContext.jsx           # Mode demo
│   │
│   ├── services/ (9)                # Couche donnees Firestore
│   ├── engine/ (9)                  # Logique metier frontend
│   ├── data/                        # Donnees demo
│   ├── lib/firebase.js              # Config Firebase client
│   └── styles/globals.css           # Tailwind + theme
│
├── functions/src/                    # Backend Cloud Functions
│   ├── index.js                      # 125 exports (point d'entree unique)
│   │
│   ├── agents/ (7)                  # Cloud Tasks Agents (remplace BullMQ)
│   │   ├── emailAgent.js            # HTTP handler — envoi emails
│   │   ├── whatsappAgent.js         # HTTP handler — envoi WhatsApp
│   │   ├── instagramAgent.js        # HTTP handler — envoi Instagram DM
│   │   ├── linkedinAgent.js         # HTTP handler — actions LinkedIn
│   │   ├── orchestratorAgent.js     # HTTP handler — dispatch vers canaux
│   │   ├── orchestratorEngine.js    # Logique decision (scoring, timing, canal)
│   │   └── orchestratorCron.js      # onSchedule every 30min — scan prospects
│   │
│   ├── queues/ (1)
│   │   └── taskQueue.js             # Client Cloud Tasks (enqueue, batch, delete, pause)
│   │
│   ├── orchestrator/ (14)           # Orchestrateur de prospection
│   │   ├── masterScheduler.js       # onSchedule every 15min — coeur du systeme
│   │   ├── warRoomStats.js          # Stats cross-org + controles admin
│   │   ├── dispatchers/ (8)         # Un dispatcher par canal
│   │   │   ├── emailDispatcher.js
│   │   │   ├── smsDispatcher.js
│   │   │   ├── whatsappDispatcher.js
│   │   │   ├── instagramDispatcher.js
│   │   │   ├── linkedinDispatcher.js
│   │   │   ├── voicemailDispatcher.js
│   │   │   ├── postalDispatcher.js
│   │   │   └── twitterDispatcher.js
│   │   └── helpers/ (4)
│   │       ├── budgetCalculator.js   # Repartition budget par canal
│   │       ├── businessHoursValidator.js
│   │       ├── channelHealthCheck.js
│   │       └── batchCalculator.js    # Taille batch adaptative
│   │
│   ├── engine/ (14)                 # Moteur de prospection avance
│   │   ├── channelRouter.js         # Selection canal optimal (8 canaux)
│   │   ├── channelDispatcher.js     # Dispatch + retry + fallback
│   │   ├── channelMonitoring.js     # Dashboard + alertes + health
│   │   ├── fallbackManager.js       # Fallback cross-canal
│   │   ├── touchpointLimiter.js     # Limites contacts par prospect
│   │   ├── prospectEngine.js        # Moteur principal prospects
│   │   ├── advancedScoring.js       # Scoring avance multi-criteres
│   │   ├── enrichment.js            # Enrichissement prospects
│   │   ├── intentSignals.js         # Detection signaux d'achat
│   │   ├── replyClassifier.js       # Classification IA des reponses
│   │   ├── compliance.js            # RGPD + suppression
│   │   ├── abTesting.js             # Tests A/B sequences
│   │   ├── sendTimeOptimizer.js     # Heure d'envoi optimale
│   │   └── sequenceGenerator.js     # Generation sequences IA
│   │
│   ├── hunters/ (7 plateformes + orchestrateur)
│   │   ├── instagram/ (3)           # Hunter + DM sender + multi-compte
│   │   ├── tiktok/ (1)             # TikTok hunter
│   │   ├── facebook/ (1)           # Facebook hunter
│   │   ├── googlemaps/ (1)         # Google Maps hunter (Serper + Apify)
│   │   ├── linkedin/ (3)           # Hunter + scraper + service HeyReach
│   │   ├── phantom/ (1)            # PhantomBuster hunter
│   │   ├── whatsapp/ (3)           # Checker + sender + anti-ban
│   │   ├── email/ (1)             # Email sequence sender
│   │   └── socialHunterOrchestrator.js  # Orchestrateur cross-platform
│   │
│   ├── channels/ (5 canaux)        # Infrastructure multicanale
│   │   ├── sms/ (5)               # Sender OVH + Twilio, webhooks, templates
│   │   ├── whatsapp/ (5)          # Meta Cloud API, sessions, templates
│   │   ├── instagram/ (4)         # Meta Graph API, DM, webhooks, triggers
│   │   ├── voicemail/ (5)         # Drop Cowboy, voice clone, scripts
│   │   └── postal/ (5)            # PostGrid + Merci Facteur, tracking
│   │
│   ├── alex/ (7)                   # Agent Alex (IA autonome)
│   │   ├── webhookIncoming.js      # Reception webhooks
│   │   ├── rescueScheduler.js      # Relance automatique
│   │   ├── transferLeadToClient.js # Transfert leads qualifies
│   │   ├── dailyReset.js           # Reset quotidien
│   │   ├── scoreAndReply.js        # Scoring + reponse IA
│   │   ├── sendMessage.js          # Envoi messages
│   │   └── sendTelegramAlert.js    # Alertes Telegram
│   │
│   ├── ai/ (7)                     # Systeme IA multi-provider
│   │   ├── personalizeMessage.js   # Personnalisation messages
│   │   ├── callAI.js              # Router IA unifie
│   │   ├── loadBalancer.js        # Load balancing providers
│   │   ├── geminiProvider.js      # Google Gemini
│   │   ├── groqProvider.js        # Groq (Llama)
│   │   └── openrouterProvider.js  # OpenRouter (multi-modele)
│   │
│   ├── email/ (6)                  # Infrastructure email
│   │   ├── sendEmail.js           # Envoi + webhooks
│   │   ├── verifier.js            # Verification email
│   │   ├── inboxRotation.js       # Rotation boites d'envoi
│   │   ├── warmup.js              # Warmup progressif
│   │   ├── deliverability.js      # DNS, SPF, DKIM, DMARC
│   │   └── emailRouter.js        # Routage email
│   │
│   ├── enrichment/ (8)            # Waterfall enrichissement
│   │   ├── enrichEmail.js         # Orchestrateur waterfall
│   │   ├── derrickProvider.js     # Derrick (priorite 1)
│   │   ├── apolloProvider.js      # Apollo
│   │   ├── hunterProvider.js      # Hunter.io
│   │   ├── dropcontactProvider.js # Dropcontact
│   │   ├── betterContactProvider.js # BetterContact
│   │   ├── emailWaterfall.js      # Logique waterfall
│   │   └── neverBounceVerifier.js # Verification NeverBounce
│   │
│   ├── compliance/ (1)            # RGPD + opt-in/opt-out unifie
│   ├── autopilot/ (5)            # AutoPilot prospection
│   ├── admin/ (3)                # Super admin + beta users
│   ├── triggers/ (1)            # Pipeline watcher
│   ├── services/ (6)            # Services transversaux
│   ├── posting/ (4)             # Posting multi-plateforme
│   ├── campaigns/ (1)           # Traitement campagnes
│   ├── scanner/ (1)             # Analyse sites web
│   ├── forgeur/ (1)             # Generation sequences
│   ├── radar/ (1)               # Scoring leads
│   ├── proof/ (1)               # Rapports ROI
│   ├── utils/ (3)               # Gemini wrapper, quotas, reset
│   └── dev/ (1)                 # Seed data (emulator only)
│
├── firestore.rules               # Securite multi-tenant RBAC
├── firebase.json                 # Config Firebase
├── tailwind.config.js            # Theme light
└── DEPLOY_REPORT.md              # Rapport deploiement
```

---

## Architecture Serverless (Cloud Tasks)

### Avant (VPS)
```
Cloud Function → Redis Queue → VPS Worker (BullMQ) → API externe
```

### Maintenant (100% Firebase)
```
orchestratorCron (every 30min)
    ↓
orchestratorAgent (decide action)
    ↓
Cloud Tasks Queue (rate limited)
    ↓
Canal Agent (emailAgent, whatsappAgent, etc.)
    ↓
API externe (SES, Evolution, HeyReach, etc.)
```

### Agents Cloud Tasks deployes

| Agent | URL | Max Instances | Timeout |
|-------|-----|---------------|---------|
| emailAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/emailAgent` | 10 | 120s |
| whatsappAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/whatsappAgent` | 3 | 120s |
| instagramAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/instagramAgent` | 3 | 120s |
| linkedinAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/linkedinAgent` | 2 | 120s |
| orchestratorAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/orchestratorAgent` | 10 | 120s |

### Rate Limits par queue Cloud Tasks

| Queue | Debit | Concurrent | Usage |
|-------|-------|------------|-------|
| fmf-email | 5/s | 10 | Envoi emails |
| fmf-whatsapp | 0.25/s | 2 | Envoi WhatsApp |
| fmf-instagram | 0.1/s | 1 | Envoi Instagram DM |
| fmf-linkedin | ~0.011/s | 1 | Actions LinkedIn |
| fmf-orchestrator | 2/s | 5 | Dispatch orchestrateur |

---

## Cloud Functions (125 deployes)

### Fonctions Scheduled (21)
| Function | Schedule | Description |
|----------|----------|-------------|
| `orchestratorCron` | every 30 min | Scan orgs, enqueue prospects |
| `masterScheduler` | every 15 min | Coeur prospection multicanale |
| `dailyBudgetManager` | every day 00:05 | Reset budgets quotidiens |
| `replyAggregator` | every 30 min | Aggregation reponses |
| `pipelineWatcher` | every 15 min | Auto-recharge pipeline leads |
| `dailyAutoPilot` | daily | AutoPilot journalier |
| `instagramHunter` | daily | Scraping Instagram |
| `tiktokHunter` | daily | Scraping TikTok |
| `facebookHunter` | daily | Scraping Facebook |
| `googleMapsHunter` | daily | Scraping Google Maps |
| `whatsappChecker` | periodic | Verification numeros WhatsApp |
| `whatsappSender` | periodic | Envoi messages WhatsApp |
| `instagramDmSender` | periodic | Envoi DM Instagram |
| `multiAccountDmSender` | periodic | DM multi-compte Instagram |
| `emailSequenceSender` | periodic | Sequences email automatiques |
| `scheduledCampaignProcessor` | every 15 min | Traitement campagnes |
| `resetMonthlyUsage` | 1er du mois | Reset quotas mensuels |
| `resetHourlyCounts` | every hour | Reset compteurs horaires Instagram |
| `resetDailyCounts` | daily | Reset compteurs journaliers |
| `rescueScheduler` | periodic | Agent Alex — relance auto |
| `dailyReset` | daily | Agent Alex — reset quotidien |

### Fonctions Callable (87) — principales
| Categorie | Functions |
|-----------|----------|
| Scanner | `scanWebsite` |
| Forgeur | `generateSequence` |
| Radar | `scoreLeads`, `getLeadInsights` |
| Campaigns | `processSequence` |
| AutoPilot | `generateAutoPilotPreview`, `launchAutoPilot`, `sendAutoPilotMessage`, `scheduleMeetingWithProspect`, `getAutoPilotDashboardStats`, `toggleAutoPilot` |
| Email | `sendCampaignEmail`, `verifyEmailBeforeSend`, `verifyEmailsBatch`, `getNextSendingInbox`, `getInboxesStats`, `getWarmupStatus`, `enableWarmup`, `disableWarmup`, `verifyDNSConfiguration`, `getDomainReputationScore` |
| SMS | `sendSMS`, `sendSMSBatch`, `sendSMSOvh`, `sendSMSBatchOvh`, `checkSMSCredits` |
| WhatsApp | `sendWhatsApp`, `checkWhatsAppAvailability` |
| Instagram | `sendInstagramDM`, `processCommentTrigger`, `createCommentTrigger` |
| Voicemail | `sendVoicemailDrop`, `createVoiceClone`, `listVoices`, `generateScript`, `generateScriptWithAI` |
| Postal | `sendLetter`, `sendPostcard`, `sendLetterMF`, `sendRegisteredLetterMF`, `validateAddress` |
| Enrichment | `enrichEmail`, `enrichEmailsBatch`, `verifyEmailNB`, `getNeverBounceCredits` |
| Engine | `selectOptimalChannel`, `dispatchMessage`, `dispatchBatch`, `getChannelDashboard`, `checkAndCreateAlerts` |
| Hunters | `runInstagramHunterManual`, `runTikTokHunterManual`, `runFacebookHunterManual`, `runGoogleMapsHunterManual`, `runLinkedInHunterManual`, `runPhantomScrape`, `runSocialHuntingCampaign` |
| Compliance | `canContactOnChannel`, `recordOptIn`, `recordOptOut`, `canSendTo`, `generateRGPDFooter` |
| Pipeline | `runPipelineRefill`, `getPipelineStats`, `updatePipelineSettings` |
| Admin | `checkFirstUser`, `getAdminStatus`, `addBetaUser`, `removeBetaUser`, `sendTestEmail` |
| War Room | `getWarRoomStats`, `getWarRoomOrgList`, `toggleOrgProspection`, `emergencyPauseAll` |
| Onboarding | `validateSetupStep`, `completeClientSetup`, `getSetupProgress` |
| Cloud Tasks | `enqueueTask`, `enqueueBatch`, `deleteTask`, `purgeQueue`, `pauseQueue`, `resumeQueue` |
| AI | `personalizeMessage`, `getAIStatus` |
| Posting | `createMultiPlatformPost`, `getPostStatus`, `cancelPost` |

### Fonctions HTTP (17)
| Function | Description |
|----------|-------------|
| `emailAgent` | Cloud Tasks agent — emails |
| `whatsappAgent` | Cloud Tasks agent — WhatsApp |
| `instagramAgent` | Cloud Tasks agent — Instagram |
| `linkedinAgent` | Cloud Tasks agent — LinkedIn |
| `orchestratorAgent` | Cloud Tasks agent — orchestrateur |
| `handleEmailWebhook` | Webhook emails (bounces, opens) |
| `handleProspectEmailWebhook` | Webhook emails prospect |
| `handleUnsubscribe` | Webhook desinscription |
| `smsStatusWebhook` | Webhook statut SMS |
| `smsInboundWebhook` | Webhook SMS entrants |
| `instagramWebhookVerify` | Verification webhook Instagram |
| `instagramWebhookHandler` | Handler webhook Instagram |
| `voicemailWebhook` | Webhook voicemail |
| `postalTrackingWebhook` | Webhook tracking postal |
| `postalDeliveryWebhook` | Webhook livraison postal |
| `webhookIncoming` | Agent Alex — webhook entrant |
| `handleMFWebhook` | Webhook Merci Facteur |

---

## Data Model Firestore

### Structure multi-tenant
```
organizations/{orgId}/
├── prospects/{prospectId}           # Prospects + engagement state
├── campaigns/{campaignId}           # Campagnes envoi
├── sequences/{sequenceId}           # Sequences multicanales
├── templates/{templateId}           # Templates messages
├── interactions/{interactionId}     # Historique interactions
├── channelAccounts/{accountId}      # Comptes par canal (LinkedIn, etc.)
├── outreachCampaigns/{campaignId}   # Campagnes orchestrateur
├── dailyBudgets/{date}             # Budget + usage par jour
├── orchestratorLogs/{logId}        # Logs execution scheduler
├── orchestratorState (doc unique)  # Etat courant orchestrateur
├── replyFeeds/{replyId}            # Feed replies classifiees
├── emailAccounts/{accountId}       # Comptes email
├── inboxes/{inboxId}               # Boites d'envoi
├── abTests/{testId}                # Tests A/B
├── suppressionList/{email}         # Liste suppression
├── analytics/{date}                # Analytics par jour
└── hunterResults/{resultId}        # Resultats sourcing

users/{userId}                       # Profils utilisateurs
betaUsers/{email}                    # Utilisateurs beta
subscriptionPlans/{planId}           # Plans d'abonnement
```

### Champs cles sur `organizations/{orgId}`
```js
{
  prospectionEnabled: false,       // Master switch orchestrateur
  prospectionState: 'idle',        // idle | running | paused | error
  dailyBudget: {
    total: 100,                    // Messages/jour total
    channels: { email: 50, sms: 20, whatsapp: 15, instagram: 10, linkedin: 5 }
  },
  timezone: 'Europe/Paris',
  businessHours: { start: 8, end: 20 },
  channels: {
    email: { enabled: true, provider: 'ses' },
    sms: { enabled: true, provider: 'ovh' },
    whatsapp: { enabled: true, provider: 'evolution' },
    instagram: { enabled: true },
    linkedin: { enabled: false, provider: 'heyreach' },
    voicemail: { enabled: false },
    postal: { enabled: false, provider: 'mercifacteur' },
    twitter: { enabled: false }
  }
}
```

---

## Systeme de Forfaits

| Forfait | Prix | Prospects | Emails | SMS | WhatsApp | Canaux |
|---------|------|-----------|--------|-----|----------|--------|
| Starter | 97 EUR/mois | 500 | 1000 | - | - | 1 |
| Pro | 297 EUR/mois | 2500 | 5000 | 500 | 200 | 3 |
| Enterprise | 697 EUR/mois | 10000 | 20000 | 2000 | 1000 | 8 |

### Canaux par forfait
- **Starter** : Email
- **Pro** : Email, SMS, WhatsApp
- **Enterprise** : Email, SMS, WhatsApp, Instagram, LinkedIn, Voicemail, Postal, Twitter

---

## Design System (Light Theme)

### Couleurs
- **Background** : `#FAFBFE`
- **Surface** : `#FFFFFF`
- **Accent** : `#4F6EF7` (indigo)
- **Text** : `#111827` (gray-900)

### Typographie
- **Titres** : Outfit
- **Corps** : Plus Jakarta Sans

### Classes CSS
```css
.card                /* Card blanche avec bordure subtile */
.card-hover          /* Card avec hover effet */
.btn-primary         /* Bouton gradient violet */
.btn-secondary       /* Bouton outline */
.btn-ghost           /* Bouton transparent */
.input-field         /* Input avec focus violet */
```

---

## Commandes

```bash
# Dev
npm run dev                          # Frontend (http://localhost:5173)
npm run test                         # Tests Vitest
npm run lint                         # ESLint

# Build
npm run build                        # Production build frontend
cd functions && npm run build        # Validation imports backend

# Deploy complet
firebase deploy --project face-media-factory

# Deploy partiel
firebase deploy --only hosting --project face-media-factory
firebase deploy --only functions --project face-media-factory
firebase deploy --only firestore:rules --project face-media-factory

# Logs
firebase functions:log --only emailAgent --project face-media-factory
firebase functions:log --only orchestratorCron,masterScheduler --project face-media-factory

# Lister fonctions
firebase functions:list --project face-media-factory

# Supprimer une fonction orpheline
firebase functions:delete <name> --region europe-west1 --force --project face-media-factory
```

---

## Variables d'environnement

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=face-media-factory
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Functions (firebase functions:config ou .env)
```
# IA
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...

# Email
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
EMAIL_ENCRYPTION_KEY=...

# SMS (OVH)
OVH_APP_KEY=...
OVH_APP_SECRET=...
OVH_CONSUMER_KEY=...
OVH_SMS_SERVICE_NAME=...
OVH_SMS_SENDER=FaceMedia

# WhatsApp (Evolution API)
EVOLUTION_API_URL=...
EVOLUTION_API_KEY=...

# Instagram
INSTAGRAM_ENCRYPTION_KEY=...

# LinkedIn
HEYREACH_API_KEY=...
APIFY_API_TOKEN=...

# Enrichment
DERRICK_API_KEY=...
APOLLO_API_KEY=...
HUNTER_API_KEY=...
DROPCONTACT_API_KEY=...
BETTERCONTACT_API_KEY=...
NEVERBOUNCE_API_KEY=...

# Scraping
SERPER_API_KEY=...

# Posting
POSTIZ_API_KEY=...

# Cloud Tasks
GCP_PROJECT_ID=face-media-factory
GCP_LOCATION=europe-west1
CLOUD_TASKS_SERVICE_ACCOUNT=...
```

---

## Regles absolues

- **Ne jamais supprimer** de code sans remplacement
- **Toujours tester** avec `npm run build` avant commit
- **Utiliser le design system** light theme
- **Pas de TODO** ni de placeholder dans le code final
- **UI en francais** (sans accents dans le code)
- **Mode mock** pour toutes les pages (fonctionnel sans API keys)
- **Gestion d'erreurs** partout (toast pour feedback)
- **Responsive** sur toutes les pages
- **Quotas** : toujours verifier avant operations
- **Multi-tenant** : toujours scoper les queries par orgId
- **Business hours** : ne jamais envoyer hors heures ouvrables
- **RGPD** : toujours verifier compliance avant envoi
- **Rate limits** : respecter les limites Cloud Tasks par canal
- **Exports** : tout export dans `functions/src/index.js` doit correspondre a une fonction existante
