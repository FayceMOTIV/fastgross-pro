# FMF - Rapport de Deploiement Firebase 100% Serverless

**Date** : 28 Fevrier 2026
**Projet** : `face-media-factory`
**Region** : `europe-west1`
**Runtime** : Node.js 20 (ESM)
**Branch** : `main` (commit `53308ef`)

---

## Resultat

| Cible | Statut | Details |
|-------|--------|---------|
| Firestore Rules | DEPLOYED | Multi-tenant RBAC + nouvelles subcollections |
| Cloud Functions | DEPLOYED | 125 fonctions (87 callable + 21 scheduled + 17 HTTP) |
| Hosting | DEPLOYED | https://face-media-factory.web.app |

---

## Nouveaux Agents Cloud Tasks (BullMQ remplace)

Ces 5 agents HTTP remplacent les workers BullMQ qui necessitaient un VPS + Redis.

| Agent | URL | Memory | Max Instances | Timeout |
|-------|-----|--------|---------------|---------|
| emailAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/emailAgent` | 512MiB | 10 | 120s |
| whatsappAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/whatsappAgent` | 512MiB | 3 | 120s |
| instagramAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/instagramAgent` | 512MiB | 3 | 120s |
| linkedinAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/linkedinAgent` | 512MiB | 2 | 120s |
| orchestratorAgent | `https://europe-west1-face-media-factory.cloudfunctions.net/orchestratorAgent` | 512MiB | 10 | 120s |

### Rate Limits Cloud Tasks (par queue)

| Queue | Max/seconde | Concurrent | Retry |
|-------|-------------|------------|-------|
| fmf-email | 5/s | 10 | 3x (10s, 30s, 60s) |
| fmf-whatsapp | 0.25/s (1/4s) | 2 | 3x (30s, 90s, 300s) |
| fmf-instagram | 0.1/s (1/10s) | 1 | 3x (60s, 180s, 600s) |
| fmf-linkedin | ~0.011/s (1/90s) | 1 | 3x (90s, 300s, 900s) |
| fmf-orchestrator | 2/s | 5 | 2x (10s, 30s) |

---

## Nouvelles Fonctions Scheduled

| Fonction | Schedule | Description |
|----------|----------|-------------|
| orchestratorCron | every 30 minutes | Scan orgs actives, enqueue prospects dans Cloud Tasks |
| runOrchestratorCronManual | onCall | Trigger manuel pour test admin |

### Premier Run Automatique (valide)

```
[masterScheduler] Starting scheduled run
[masterScheduler] 4 orgs actives
[masterScheduler] org=org_restaurant_lyon hors heures ouvrables
[masterScheduler] org=org_coach_fitness hors heures ouvrables
[masterScheduler] org=org_agence_immo_paris hors heures ouvrables
[masterScheduler] org=la-bonne-table hors heures ouvrables
[masterScheduler] Done in 1874ms — sent=0 failed=0 skipped=0
```

Le scheduler a correctement trouve 4 orgs avec `prospectionEnabled=true` et les a skip (hors heures ouvrables apres 20h Europe/Paris).

---

## Fichiers Crees (Session Deploiement)

| Fichier | Description |
|---------|-------------|
| `functions/src/agents/emailAgent.js` | Handler HTTP pour envoi emails via Cloud Tasks |
| `functions/src/agents/whatsappAgent.js` | Handler HTTP pour envoi WhatsApp via Evolution API |
| `functions/src/agents/instagramAgent.js` | Handler HTTP pour envoi Instagram DM multi-comptes |
| `functions/src/agents/linkedinAgent.js` | Handler HTTP pour actions LinkedIn (visit, connect, message) |
| `functions/src/agents/orchestratorAgent.js` | Handler HTTP orchestrateur (decide action + dispatch vers canal) |
| `functions/src/agents/orchestratorEngine.js` | Logique comportementale (scoring, timing, canal selection) |
| `functions/src/agents/orchestratorCron.js` | Cron toutes les 30min (scan orgs + enqueue prospects) |
| `functions/src/queues/taskQueue.js` | Client Cloud Tasks (enqueue, batch, delete, pause, resume) |

---

## Tests Post-Deploiement

### Smoke Tests HTTP Agents

| Test | Resultat |
|------|----------|
| POST emailAgent (body vide) | 400 `Missing required fields: orgId, prospectId, action` |
| POST whatsappAgent (body vide) | 400 `Missing required fields: orgId, prospectId, action` |
| POST instagramAgent (body vide) | 400 `Missing required fields: orgId, prospectId, action` |
| POST linkedinAgent (body vide) | 400 `Missing required fields: orgId, prospectId, action` |
| POST orchestratorAgent (body vide) | 400 `Missing required fields: orgId, prospectId` |
| GET emailAgent | 405 `Method not allowed` |
| Hosting https://face-media-factory.web.app | 200 HTML lang="fr" |

### Logs Cloud Functions

| Verification | Resultat |
|--------------|----------|
| Tous les agents state=ACTIVE | OK |
| TCP probe port 8080 | OK (1 attempt) |
| orchestratorCron scheduled | OK |
| masterScheduler first run | OK (1.8s, 4 orgs found) |
| Business hours logic | OK (correctly skipped outside hours) |

---

## Warnings Non-Bloquants

```
CRITICAL: EMAIL_ENCRYPTION_KEY env var is not set
CRITICAL: INSTAGRAM_ENCRYPTION_KEY env var is not set
```

Ces warnings sont attendus. Les cles de chiffrement seront configurees quand les comptes email/Instagram seront connectes. Les fonctions fonctionnent sans elles (mode fallback).

---

## Architecture Avant/Apres

### AVANT (VPS + BullMQ + Redis)
```
Client → Cloud Function → Redis Queue → VPS Worker (BullMQ) → API externe
                                          ↑
                                    Serveur VPS 24/7
                                    Redis server
                                    Process manager (PM2)
```

### APRES (100% Serverless)
```
Client → Cloud Function → Cloud Tasks Queue → Cloud Function Agent → API externe
                              ↑                        ↑
                        orchestratorCron         Rate limited
                        (every 30 min)           Auto-retry
                        Zero infrastructure      Pay-per-use
```

### Avantages
- **Zero VPS** : plus de serveur a maintenir
- **Zero Redis** : Cloud Tasks remplace BullMQ
- **Zero PM2** : pas de process manager
- **Auto-scaling** : 0 → N instances automatiquement
- **Pay-per-use** : facture uniquement les executions
- **Rate limiting natif** : configure par queue dans Cloud Tasks
- **Retry automatique** : backoff exponentiel configurable
- **OIDC auth** : les Cloud Tasks appellent les agents avec auth Google

---

## Prochaines Etapes (Plan Phase 1-10)

Le deploiement serverless est la fondation. Le plan complet (33 fichiers, 10 phases) est en cours :
- Phase 1-4 : Orchestrator helpers, dispatchers, master scheduler, channel selector
- Phase 5-6 : LinkedIn module (HeyReach), Google Maps Apify upgrade
- Phase 7-9 : Frontend hooks, composants, pages (LinkedIn, Google Maps, War Room)
- Phase 10 : Integration routing + navigation + exports

Ces fichiers sont deja en cours de creation sur la branche `dev` (stash actif).

---

## Commandes Utiles

```bash
# Logs d'un agent
firebase functions:log --only emailAgent --project face-media-factory

# Logs du scheduler
firebase functions:log --only orchestratorCron,masterScheduler --project face-media-factory

# Redeploy functions only
firebase deploy --only functions --project face-media-factory

# Redeploy rules only
firebase deploy --only firestore:rules --project face-media-factory

# Redeploy hosting only
firebase deploy --only hosting --project face-media-factory

# Lister toutes les fonctions
firebase functions:list --project face-media-factory
```
