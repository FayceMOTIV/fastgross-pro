# Face Media Factory - Stack Technique v1.6.0

## Vue d'ensemble

Face Media Factory est un SaaS de prospection B2B multicanal propulse par l'IA.
Cette documentation resume l'architecture technique et les services utilises.

## Stack Principal

| Composant | Technologie | Role |
|-----------|-------------|------|
| Frontend | React 18 + Vite | Application web SPA |
| Styling | Tailwind CSS | Design system |
| Backend | Firebase | Auth, Firestore, Functions, Hosting |
| Orchestration | Windmill | Workflows IA code-first |

## Services par Canal

### Email

| Type | Service | Cout | Notes |
|------|---------|------|-------|
| Transactionnel | Amazon SES | $0.10/1000 emails | Confirmations, notifications, rapports |
| Cold Outreach | Saleshandy | $25/mois | Comptes illimites, 2000 prospects actifs, warmup integre |

### SMS

| Service | Cout | Notes |
|---------|------|-------|
| BudgetSMS | Variable | Meilleur rapport qualite/prix Europe, opt-in obligatoire France |

### WhatsApp

| Service | Cout | Notes |
|---------|------|-------|
| Evolution API | Gratuit (self-hosted) | Open-source, dual-mode Baileys (dev) + Cloud API Meta (prod) |

### Instagram DM

| Service | Cout | Notes |
|---------|------|-------|
| ManyChat | Variable | Limites API strictes, automation limitee |

### Voicemail

| Service | Cout | Notes |
|---------|------|-------|
| Ringover | Variable | Voicemail drop, VoIP |

### Courrier

| Service | Cout | Notes |
|---------|------|-------|
| Merci Facteur | Variable | Lettres recommandees, cartes postales |

## Orchestration & IA

| Service | Role | Notes |
|---------|------|-------|
| Windmill | Orchestration workflows | Self-hosted gratuit sur VPS, 13x plus rapide qu'Airflow, Python/TS/Go/Bash |
| CrewAI | Agents IA | Pour les sequences intelligentes (futur) |

## Budgets Estimes par Tier

| Tier | Prospects | Cout/mois | Details |
|------|-----------|-----------|---------|
| Bootstrap | 100 | ~33 EUR | SES + Evolution API (gratuit) + BudgetSMS minimal |
| Growth | 500 | ~50 EUR | Saleshandy $25 + services complementaires |
| Scale | 2000 | ~73 EUR | Full stack multicanal |

## URLs Documentation

| Service | URL |
|---------|-----|
| Amazon SES | https://docs.aws.amazon.com/ses/ |
| Saleshandy | https://www.saleshandy.com/developers/ |
| Evolution API | https://github.com/EvolutionAPI/evolution-api |
| BudgetSMS | https://www.budgetsms.net/api/ |
| Windmill | https://www.windmill.dev/docs/ |
| ManyChat | https://manychat.com/developers |
| Merci Facteur | https://www.merci-facteur.com/api/ |
| Ringover | https://developer.ringover.com/ |

## Risques et Points d'Attention

### WhatsApp (Evolution API mode Baileys)
- Mode non-officiel, risque de ban si abus
- Utiliser Cloud API officiel Meta en production
- Limiter le volume et respecter les delais

### Instagram DM
- API tres restrictive
- Limites de messages quotidiens
- Preferer l'approche manuelle pour eviter les bans

### SMS France
- Opt-in explicite obligatoire meme en B2B
- Conserver la preuve du consentement
- Respecter les horaires (pas avant 8h ni apres 20h)

### Voicemail Europe
- Legislation variable selon les pays
- Certains pays interdisent le voicemail drop
- Verifier la reglementation locale

## Architecture Recommandee

```
                     +----------------+
                     |   Frontend     |
                     |  (React/Vite)  |
                     +-------+--------+
                             |
                     +-------v--------+
                     |   Firebase     |
                     | Auth/Firestore |
                     +-------+--------+
                             |
              +--------------+--------------+
              |              |              |
      +-------v------+ +-----v------+ +----v-----+
      |   Amazon SES | | Saleshandy | | Windmill |
      | (Transaction)| |   (Cold)   | |  (Orch)  |
      +--------------+ +------------+ +----------+
              |              |              |
      +-------v--------------v--------------v-------+
      |              Canaux Externes                |
      | Evolution API | BudgetSMS | ManyChat | etc. |
      +------------------------------------------------+
```

## Changelog v1.6.0

- Remplacement Brevo -> Amazon SES (transactionnel) + Saleshandy (cold outreach)
- Remplacement WasenderAPI -> Evolution API (WhatsApp)
- Remplacement n8n -> Windmill (orchestration)
- Mise a jour des grilles tarifaires
- Nouvelle documentation technique
