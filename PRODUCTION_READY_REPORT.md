# PRODUCTION_READY_REPORT.md

## Face Media Factory — Pipeline AutoPilot Production Ready

**Date** : 2026-02-25
**Org cible** : `IGtZSfpd8eyoIzn6W0ba`
**Functions deployees** : `dailyAutoPilot`, `runAutoPilotManual`

---

## Recap des 6 fixes appliques

### 1. Fix Bonjour (ETAPE 1)
- **Probleme** : `generateEmail()` produisait "Bonjour," (avec virgule) quand le prenom etait vide
- **Fix** : Greeting calcule en amont — `Bonjour ${firstName}` ou `Bonjour` (sans virgule). Regex remplace `{prenom}` + virgule optionnelle AVANT substitution des autres variables
- **Fichier** : `functions/src/autopilot/scheduler.js` — `generateEmail()`
- **Test** : 4 tests passent (avec prenom, sans prenom, null, capitalisation)

### 2. Filtre emails placeholders (ETAPE 2)
- **Probleme** : Pas de filtre `companyDomain`, pas de rejet prefix < 4 chars (ex: `ab@`, `hr@`)
- **Fix** : `isValidProspectEmail(email, companyDomain)` rejette prefix < 4 chars et emails sur le domaine de l'entreprise elle-meme. `getBestEmail()` passe le `companyDomain`
- **Fichier** : `functions/src/autopilot/scheduler.js` — `isValidProspectEmail()`, `getBestEmail()`
- **Test** : 8 tests passent

### 3. Deduplication inter-runs (ETAPE 3)
- **Probleme** : Un prospect deja contacte pouvait etre re-scrape et re-contacte
- **Fix** : `filterAlreadyContacted(orgId, prospects)` verifie Firestore par `domain` ET par `email` (avec `contactedAt != null`). Integre en Phase 1 apres search. Phase 4 marque `contactedAt` quand status passe a `ready`
- **Fichier** : `functions/src/autopilot/scheduler.js` — nouvelle fonction + integration pipeline
- **Test** : Logique validee via unit tests

### 4. Configuration emailAccount (ETAPE 4)
- **Probleme** : Pas de compte email configure pour la production
- **Fix** : Script `scripts/seed-email-account.mjs` qui cree le document `emailAccounts/main` avec email `onboarding@resend.dev`, provider `resend`, status `active`, warmupDay 31
- **Action manuelle requise** : Executer `node scripts/seed-email-account.mjs` avec credentials Firebase

### 5. Multi-niches (ETAPE 5)
- **Probleme** : `searchProspects()` ne supportait qu'un tableau plat de keywords + une seule location
- **Fix** : Support `config.niches[]` avec par niche : `name`, `keywords[]`, `location`. Backward compatible (fallback sur `config.keywords[]`). Chaque prospect recoit un champ `niche`. Dedup intra-run via `seenDomains` Set. `{secteur}` dans les emails utilise `prospect.niche`
- **Script** : `scripts/seed-niches.mjs` configure 5 niches : emballage, restauration, agence_marketing, ecommerce, coiffeur
- **Fichier** : `functions/src/autopilot/scheduler.js` — `searchProspects()`, `generateEmail()`
- **Test** : 3 tests passent (niches config, fallback, 5 niches = 10 queries)
- **Action manuelle requise** : Executer `node scripts/seed-niches.mjs` avec credentials Firebase

### 6. Enrichissement conditionnel (ETAPE 6)
- **Probleme** : Tous les prospects trouves etaient enrichis, meme ceux de faible qualite
- **Fix** : Phase 3 marque `low_score` si score <= 50. Phase 4 filtre `where('score', '>', 50)` — seuls les prospects qualifies recoivent un email
- **Fichier** : `functions/src/autopilot/scheduler.js` — Phase 3 + Phase 4
- **Test** : 5 tests passent (score 30 → low_score, score 50 → low_score, score 51 → scored, etc.)

---

## Build et Deploiement

| Composant | Status |
|-----------|--------|
| Frontend build (`npm run build`) | OK — 0 erreurs |
| Functions syntax check (`node --check`) | OK |
| Functions deploy (`dailyAutoPilot`) | OK — deployed |
| Functions deploy (`runAutoPilotManual`) | OK — deployed |
| Hosting deploy | OK — https://face-media-factory.web.app |

---

## Tests

| Suite | Tests | Resultat |
|-------|-------|----------|
| test-production-pipeline.mjs | 21 | 21 passed, 0 failed |

---

## Actions manuelles requises (Faical)

1. **Seeder le compte email** :
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/seed-email-account.mjs
   ```

2. **Seeder les niches** :
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json node scripts/seed-niches.mjs
   ```

3. **Configurer les encryption keys** (pre-existant, non lie aux fixes) :
   ```bash
   firebase functions:secrets:set EMAIL_ENCRYPTION_KEY
   firebase functions:secrets:set INSTAGRAM_ENCRYPTION_KEY
   ```

4. **Activer le pilote automatique** dans Firestore :
   - Document `organizations/IGtZSfpd8eyoIzn6W0ba/autopilotConfig/settings`
   - Mettre `enabled: true`

---

## Estimation couts

| Ressource | Estimation mensuelle |
|-----------|---------------------|
| Cloud Functions (scheduler daily) | ~$0.10 |
| Firestore reads (dedup + queries) | ~$0.50 (avec 100 prospects/jour) |
| Resend emails (warmup complet) | ~$0.01/email (100/jour max) |
| **Total estime** | **< $5/mois** |

---

## Fichiers modifies

- `functions/src/autopilot/scheduler.js` — 6 fixes (greeting, email filter, dedup, multi-niches, conditional enrichment, contactedAt)
- `scripts/seed-email-account.mjs` — nouveau
- `scripts/seed-niches.mjs` — nouveau
- `scripts/test-production-pipeline.mjs` — nouveau
- `AUDIT_BEFORE.md` — nouveau
- `PRODUCTION_READY_REPORT.md` — nouveau (ce fichier)
