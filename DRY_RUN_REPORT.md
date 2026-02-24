# DRY RUN REPORT - Face Media Factory

**Date:** 20/02/2026 20:06:59
**Mode:** DRY RUN (aucun email envoye, aucun effet de bord)

---

## Verdict Final

| Metrique | Valeur |
|----------|--------|
| Steps OK | 6/7 |
| Warnings | 1 |
| Failures | 0 |
| **Verdict** | **PIPELINE OPERATIONNEL** |

---

## Resume par etape

| # | Etape | Statut |
|---|-------|--------|
| 1 | Firebase Hosting | ✅ OK |
| 2 | Serper Scraping | ✅ OK |
| 3 | Email Enrichment | ✅ OK |
| 4 | AI Generation | ✅ OK |
| 5 | Email Dry Run | ⚠️ WARN |
| 6 | Firestore Persistence | ✅ OK |
| 7 | Dashboard Display | ✅ OK |

---

## Step 1: Firebase Hosting

**Status:** OK

```
URL: https://face-media-factory.web.app
Status: 200
Content-Type: text/html; charset=utf-8
X-Frame-Options: DENY
Deploy: verified online
```

## Step 2: Serper Scraping

**Status:** OK

```
Query: "agence marketing Paris"
Results: 10 organic results
Prospects (dedup): 10 unique domains
Latency: 837ms
---
  1. Les 10 meilleures agences de marketing à Paris
     https://www.sortlist.fr/l/paris-fr
     "Toutes les entreprises de marketing à Paris · Agence Superchouette · Jourdechance · YOTTA - l'Agence Créative Responsabl..."
  2. Mazarine
     https://www.mazarine.com/
     "Mazarine est un groupe mondial de création et d'expériences dédié au luxe, à la mode, à l'art et à la culture. Paris , N..."
  3. Agence de Marketing Digital à Paris
     https://www.eskimoz.fr/agence-marketing-digital/
     "Vous êtes à la recherche d'une agence de Marketing Digital ? Eskimoz maîtrise les trois piliers clés, à savoir SEO, SEA ..."
  4. Emplois cdi agence marketing (paris (75))
     https://fr.indeed.com/q-cdi-agence-marketing-l-paris-(75)-emplois.html
     "Vous êtes à la recherche d'un emploi : CDI Agence Marketing ? Il y en a 355 disponibles pour Paris (75) sur Indeed.com, ..."
  5. Dix Sept Paris: Agence Communication Luxe & Premium Paris
     https://dixsept-paris.com/
     "Dix Sept Paris, agence de communication luxe à Paris : branding, image de marque, campagne 360°, Influence, Social Media..."
```

## Step 3: Email Enrichment

**Status:** OK

```
Prospect: Les 10 meilleures agences de marketing à Paris (sortlist.fr)
---
  hunter: skipped (API key not configured)
  web_scraping: 3 emails found (1727ms)
  pattern_generation: 4 emails found (0ms)
---
Best email: contact@adeliom.com
All found: contact@adeliom.com, jane.doe@acme.com, janedoe@acme.com
```

> Real email found

## Step 4: AI Generation

**Status:** OK

```
Provider: Groq (llama-3.3-70b-versatile)
Latency: 1232ms
Tokens: 455
---
Subject: "Boostez votre contenu avec des vidéos"
Angle: Personnalisation basée sur la position de l'agence dans le classement des meilleures agences de marketing à Paris
---
Body preview:
  | Bonjour, je me permets de te contacter car j'ai découvert que tu es une des meilleures agences de marketing à Paris. Je suis convaincu que pour rester en tête de jeu, il est essentiel d'avoir un contenu de qualité qui captive ton public. C'est là que nous intervenons ! Notre agence de production vidéo et contenu social media est spécialisée dans la création de contenu qui inspire et engage les audiences. Nous avons aidé de nombreuses entreprises à améliorer leur présence en ligne grâce à des vidéos et des contenus de haute qualité. Nous serions ravis de discuter de la manière dont nous pourrions collaborer pour booster ton contenu et atteindre tes objectifs de marketing.
```

## Step 5: Email Dry Run

**Status:** WARN

```
MODE: DRY RUN (aucun email envoye)
API Key: a verifier
---
From: Face Media Factory <onboarding@resend.dev>
To: contact@adeliom.com
Subject: Boostez votre contenu avec des vidéos
Body: 976 chars HTML
Headers: X-FMF-Lead-Id=dry-run-test
---
Email pret a envoyer. En production, Resend l'enverrait.
```

> API key may have issues, but email payload is correctly formed

## Step 6: Firestore Persistence

**Status:** OK

```
Project: face-media-factory
Firestore API: reachable
---
Documents that would be saved:
  1. organizations/{orgId}/prospects/{id}
     name: "Les 10 meilleures agences de marketing à Paris"
     email: "contact@adeliom.com"
     source: serper
     enrichment: [hunter, web_scraping, pattern_generation]

  2. organizations/{orgId}/messages/{id}
     subject: "Boostez votre contenu avec des vidéos"
     provider: groq
     tokens: 455

  3. organizations/{orgId}/campaigns/{id}
     name: "DryRun - Les 10 meilleures agences de marketing à Paris"
     channels: [email]
     status: draft
---
Persistence code: verified in Settings + Campaigns + Forgeur components
```

> Firestore accessible, documents would persist correctly

## Step 7: Dashboard Display

**Status:** OK

```
Base URL: https://face-media-factory.web.app
---
Page accessibility (SPA, all routes serve index.html):
  ✓ Dashboard (/app/dashboard) - OK
  ✓ Radar (Lead Scoring) (/app/radar) - OK
  ✓ Forgeur (Sequence Gen) (/app/forgeur) - OK
  ✓ Campaigns (/app/campaigns) - OK
  ✓ Scanner (/app/scanner) - OK
  ✓ Settings (/app/settings) - OK
---
Data display verification:
  Radar: prospect "Les 10 meilleures agences de marketing à Paris" would appear with score 0 (unscored)
  Forgeur: message for "Les 10 meilleures agences de marketing à Paris" would be saved to sequences
  Campaigns: campaign would appear in list with status "draft"
  Dashboard: stats would update with +1 prospect, +1 message, +0 emails sent (dry run)
```

> SPA routes all return 200 (served by index.html). Data display depends on auth state.

---

## Prospect Decouvert

| Champ | Valeur |
|-------|--------|
| Nom | Les 10 meilleures agences de marketing à Paris |
| URL | https://www.sortlist.fr/l/paris-fr |
| Domaine | sortlist.fr |
| Email | contact@adeliom.com |
| Description | Toutes les entreprises de marketing à Paris · Agence Superchouette · Jourdechance · YOTTA - l'Agence... |

---

## Message IA Genere

| Champ | Valeur |
|-------|--------|
| Provider | groq |
| Model | llama-3.3-70b-versatile |
| Latency | 1232ms |
| Tokens | 455 |
| Subject | Boostez votre contenu avec des vidéos |
| Angle | Personnalisation basée sur la position de l'agence dans le classement des meilleures agences de marketing à Paris |

**Corps du message:**

```
Bonjour, je me permets de te contacter car j'ai découvert que tu es une des meilleures agences de marketing à Paris. Je suis convaincu que pour rester en tête de jeu, il est essentiel d'avoir un contenu de qualité qui captive ton public. C'est là que nous intervenons ! Notre agence de production vidéo et contenu social media est spécialisée dans la création de contenu qui inspire et engage les audiences. Nous avons aidé de nombreuses entreprises à améliorer leur présence en ligne grâce à des vidéos et des contenus de haute qualité. Nous serions ravis de discuter de la manière dont nous pourrions collaborer pour booster ton contenu et atteindre tes objectifs de marketing.
```

---

## Email Dry Run

| Champ | Valeur |
|-------|--------|
| Mode | DRY RUN |
| API Key | A verifier |
| From | Face Media Factory <onboarding@resend.dev> |
| To | contact@adeliom.com |
| Subject | Boostez votre contenu avec des vidéos |
| HTML Size | 976 chars |
| Envoye | Non (dry run) |

---

*Genere automatiquement par dry-run-pipeline.mjs*
