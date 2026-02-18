# FACE MEDIA FACTORY - SYSTEME COMPLET

## VUE D'ENSEMBLE

Systeme d'automation complete pour prospection B2B avec :
- Scraping automatique quotidien (9 AM)
- Enrichment email (waterfall 3 providers)
- AI personalization (3 providers)
- WhatsApp sending (1 clic)
- Multi-platform posting (13 platforms)
- Monitoring temps reel

---

## WORKFLOW QUOTIDIEN

### Automatique (9h00 AM)

```
Cloud Scheduler trigger
         |
         v
Instagram/Web scraping (Hunter V2)
   -> 20 comptes selon config
   -> Extract: nom, site, phone, email
         |
         v
Email enrichment (waterfall)
   -> Derrick (200/mois)
   -> Apollo (60/mois)
   -> Hunter (50/mois)
         |
         v
AI personalization (3 angles)
   -> Groq prioritaire (300 tok/sec)
   -> Fallback OpenRouter/Gemini
         |
         v
Save Firestore
   -> Collection: prospects
   -> Status: 'ready'
```

### Manuel (Apres 9h)

```
1. Ouvrir /app/daily-prospects
2. Voir 20 nouveaux prospects
   - Nom + URL + Domain
   - Phone + Email
   - Score + Details
   - Email AI genere
3. Cliquer "WhatsApp" (1 clic chacun)
4. 20 prospects contactes en 10 minutes !
```

---

## PAGES DISPONIBLES

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | /app | Vue d'ensemble |
| **Daily Prospects** | /app/daily-prospects | **Prospects quotidiens + WhatsApp** |
| **Test Autopilot** | /app/test-autopilot | **Test manuel de l'automation** |
| AI Generation | /app/ai | Generation messages IA |
| Enrichment | /app/enrichment | Enrichissement emails |
| Posting | /app/posting | Publication 13 plateformes |
| Monitoring | /app/monitoring | Stats en temps reel |
| Hunter | /app/hunter | Prospection Instagram |
| Prospects | /app/prospects | Gestion prospects |
| Scanner | /app/scanner | Analyse sites web |
| Forgeur | /app/forgeur | Generation sequences |
| Radar | /app/radar | Lead scoring |
| Email Sequences | /app/email-sequences | Sequences email |
| WhatsApp | /app/whatsapp | Dashboard WhatsApp |
| Campaigns | /app/campaigns | Campagnes |
| Proof | /app/proof | Rapports ROI |
| Analytics | /app/analytics | Statistiques |

---

## CLOUD FUNCTIONS

### Autopilot
| Function | Description |
|----------|-------------|
| dailyAutoPilot | Scheduler quotidien 9 AM |
| runAutoPilotManual | Execution manuelle |
| sendWhatsAppToProspect | Envoi WhatsApp 1-click |

### AI
| Function | Description |
|----------|-------------|
| personalizeMessage | Generation messages IA |
| getAIStatus | Stats providers IA |

### Enrichment
| Function | Description |
|----------|-------------|
| enrichEmail | Enrichissement single |
| enrichEmailsBatch | Enrichissement batch |
| getEnrichmentStatus | Stats enrichment |

### Posting
| Function | Description |
|----------|-------------|
| createMultiPlatformPost | Post multi-platform |
| getPostStatus | Status post |
| getPostingStatus | Stats posting |

---

## CAPACITES

### AI Generation
- **Groq**: 14,400 req/jour (300 tok/sec)
- **OpenRouter**: 1,000 req/jour (18 modeles)
- **Gemini**: 1,000 req/jour (1M context)
- **Puter.js**: Illimite (client-side)
- **Total**: 16,400 req/jour backend + illimite frontend

### Email Enrichment
- **Derrick**: 200/mois
- **Apollo**: 60/mois
- **Hunter**: 50/mois
- **Total**: 310 emails/mois

### Multi-Platform Posting
- **Postiz**: Illimite (self-hosted)
- **Late API**: 20/mois (fallback)
- **Plateformes**: 13

### WhatsApp
- **Evolution API**: Self-hosted (illimite)

---

## COUTS

| Element | Cout Mensuel |
|---------|--------------|
| Firebase (Blaze) | 10-20 EUR |
| VPS (optionnel) | 4 EUR |
| APIs | 0 EUR |
| **Total** | **14-24 EUR/mois** |

**vs Marche**: 295+ EUR/mois
**Economie**: 92% (270 EUR/mois)

---

## CONFIGURATION

### 1. Environment Variables

```env
# AI Providers
GROQ_API_KEY=gsk_xxx
OPENROUTER_API_KEY=sk-or-xxx
GEMINI_API_KEY=AIzaSyxxx

# Email Enrichment
DERRICK_API_KEY=xxx
APOLLO_API_KEY=xxx
HUNTER_API_KEY=xxx

# WhatsApp
EVOLUTION_API_URL=http://your-api:8080
EVOLUTION_API_KEY=xxx
EVOLUTION_INSTANCE_NAME=facemedia
```

### 2. Autopilot Config (Firestore)

Path: `organizations/{orgId}/autopilotConfig/settings`

```json
{
  "enabled": true,
  "pauseWeekends": true,
  "googleCseApiKey": "AIzaSyxxx",
  "googleCseCxId": "xxx:xxx",
  "keywords": ["videaste", "photographe"],
  "location": "Paris",
  "sector": "video",
  "emailsPerDay": 20
}
```

---

## DEMARRAGE RAPIDE

### Option 1: Setup Auto

```bash
cd ~/Projects/face-media-factory
./scripts/setup.sh
```

### Option 2: Manuel

```bash
# Install
npm install
cd functions && npm install

# Configure
cp functions/.env.example functions/.env
# Editer functions/.env

# Deploy
firebase deploy
```

---

## TEST DU SYSTEME

### Via Interface

1. Aller sur /app/test-autopilot
2. Cliquer "Lancer le test"
3. Attendre 2-5 minutes
4. Voir resultats
5. Aller sur /app/daily-prospects

### Via CLI

```bash
# Logs autopilot
firebase functions:log --only dailyAutoPilot

# Logs WhatsApp
firebase functions:log --only sendWhatsAppToProspect
```

---

## WORKFLOW RECOMMANDE

### Chaque Matin (5 min)

1. Ouvrir /app/daily-prospects
2. Reviewer les 20 prospects
3. Envoyer WhatsApp (1 clic par prospect)
4. Total: 5-10 minutes

### Chaque Semaine (30 min)

1. Checker /app/monitoring
2. Analyser taux de reponse
3. Ajuster keywords si besoin
4. Optimiser templates

---

## SUPPORT

- **Firebase Console**: console.firebase.google.com
- **Hosting**: face-media-factory.web.app
- **Documentation**: /docs

---

**SYSTEME 100% OPERATIONNEL!**
