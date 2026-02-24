# SOURCES & ENRICHISSEMENT REPORT

## Face Media Factory - PROMPT 1/3

**Date:** 2026-02-24
**Status:** COMPLET
**Tests:** 55/59 OK, 4 WARN (cles API optionnelles), 0 FAIL

---

## Modules implementes

### 1. Google Maps Hunter (`functions/src/hunters/googlemaps/googleMapsHunter.js`)

| Element | Detail |
|---------|--------|
| API | Serper Maps (`POST https://google.serper.dev/maps`) |
| Cout | $0 (quota Serper existant - 2500/mois) |
| Schedule | Tous les jours a 7h (Europe/Paris) |
| Exports | `googleMapsHunter`, `runGoogleMapsHunterManual`, `getGoogleMapsHunterStats` |
| Qualification | IA via `callAI()` + fallback heuristique |
| Dedup | Par CID Google Maps, telephone, email, site web |
| Mock | 5 entreprises francaises realistes |
| Champs extraits | nom, adresse, telephone, site web, email, note, avis, categorie |

**Pattern:** Identique a `facebookHunter.js` (onSchedule + onCall + stats)

### 2. Enrichment Waterfall (`functions/src/enrichment/emailWaterfall.js`)

Waterfall a 5 providers avec fallback automatique :

| Priorite | Provider | Credits/mois | Specialite |
|----------|----------|-------------|------------|
| 1 | Derrick | 200 | B2B email finder |
| 2 | Apollo | 60 | Sales intelligence |
| 3 | Hunter | 50 | Domain search |
| 4 | **Dropcontact** (NEW) | 25 | French B2B, SIREN/SIRET |
| 5 | **BetterContact** (NEW) | 50 | Aggregateur 20+ sources |

**Total: 385 emails/mois GRATUIT**

#### Dropcontact Provider (`dropcontactProvider.js`)
- API async avec polling (batch + poll par requestId)
- Champs francais : SIREN, SIRET, taille entreprise
- RGPD compliant
- Timeout: 30s

#### BetterContact Provider (`betterContactProvider.js`)
- Aggregateur multi-sources (20+ providers)
- Dernier recours (priority 5)
- Timeout: 45s (aggregateur plus lent)
- Retourne `verifiedEmail` + `sources[]`

### 3. NeverBounce Email Verifier (`functions/src/enrichment/neverBounceVerifier.js`)

| Element | Detail |
|---------|--------|
| API | NeverBounce (`api.neverbounce.com/v4`) |
| Credits gratuits | 1000 (one-time) |
| Exports | `verifyEmailNB`, `getNeverBounceCredits` |
| Niveau 1 | Checks locaux: format, disposable, role-based (gratuit, instant) |
| Niveau 2 | Verification SMTP via NeverBounce (1-3s, utilise credits) |

**Resultats possibles:** `valid` | `invalid` | `disposable` | `catchall` | `unknown`

**Scoring:**
- valid: 95 pts
- catchall: 65 pts
- unknown: 50 pts
- invalid/disposable: 0 pts
- Malus role-based: -20 pts

**16 domaines jetables** detectes localement (guerrillamail, yopmail, mailinator...)
**20 prefixes role-based** detectes (info@, contact@, admin@, support@...)

### 4. PhantomBuster Hunter (`functions/src/hunters/phantom/phantomHunter.js`)

| Element | Detail |
|---------|--------|
| API | PhantomBuster (`api.phantombuster.com/api/v2`) |
| Cout | 14 jours gratuit, puis ~69$/mois |
| Exports | `runPhantomScrape`, `listPhantoms` |
| Types | `maps`, `instagram`, `linkedin` |
| Qualification | IA via `callAI()` + fallback heuristique |
| Dedup | Par email avant sauvegarde |
| Mock | 3 entreprises francaises realistes |

**Scrapers integres:**
- `scrapeGoogleMaps()` - Google Maps businesses
- `scrapeInstagramProfiles()` - Profils Instagram
- `scrapeLinkedInProfiles()` - Profils LinkedIn

---

## Registrations dans index.js

Tous les modules sont correctement enregistres dans `functions/src/index.js` :
- Google Maps Hunter (3 exports)
- PhantomBuster Hunter (2 exports)
- NeverBounce Verifier (2 exports)
- Enrichment Waterfall (3 exports existants, providers internes)

---

## Variables d'environnement

| Variable | Statut | Requis |
|----------|--------|--------|
| `SERPER_API_KEY` | Configure | Oui (Google Maps + Facebook) |
| `DROPCONTACT_API_KEY` | Non configure | Non (fallback waterfall) |
| `BETTERCONTACT_API_KEY` | Non configure | Non (fallback waterfall) |
| `NEVERBOUNCE_API_KEY` | Non configure | Non (fallback local) |
| `PHANTOMBUSTER_API_KEY` | Non configure | Non (mock data) |

> Tous les modules fonctionnent sans ces cles (mode mock/fallback). Ajouter les cles pour activer les services reels.

---

## Resultats des tests

```
55 OK / 4 WARN / 0 FAIL (59 total)
```

Les 4 WARN concernent uniquement les cles API optionnelles non configurees. Tous les tests fonctionnels passent.

---

## Architecture finale des sources

```
functions/src/
├── hunters/
│   ├── googlemaps/
│   │   └── googleMapsHunter.js      ← NEW (Serper Maps)
│   ├── phantom/
│   │   └── phantomHunter.js         ← NEW (PhantomBuster)
│   ├── instagram/
│   ├── tiktok/
│   ├── facebook/
│   ├── whatsapp/
│   └── email/
├── enrichment/
│   ├── emailWaterfall.js            ← UPDATED (5 providers)
│   ├── enrichEmail.js               (Cloud Function wrapper)
│   ├── derrickProvider.js           (Priority 1)
│   ├── apolloProvider.js            (Priority 2)
│   ├── hunterProvider.js            (Priority 3)
│   ├── dropcontactProvider.js       ← NEW (Priority 4)
│   ├── betterContactProvider.js     ← NEW (Priority 5)
│   └── neverBounceVerifier.js       ← NEW (SMTP verification)
└── index.js                         ← UPDATED
```
