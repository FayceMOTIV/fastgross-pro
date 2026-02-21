# SOCIAL TEST REPORT

**Date:** 2026-02-21 11:16:25
**Mode:** MOCK (aucune credential reelle requise)
**Verdict:** TOUS LES TESTS PASSENT

## Resume

| Metrique | Valeur |
|----------|--------|
| Tests OK | **41/41** |
| Echecs | 0 |
| Sections | 8 |

## 1. Modules & Environment

| Test | Status | Details |
|------|--------|---------|
| All 9 hunter modules exist | OK | 9 files |
| SERPER_API_KEY configured | OK | c78adc58... |
| GEMINI_API_KEY configured | OK | set |
| IG credentials (optional) | OK | not set - mock mode active |
| Evolution API (optional) | OK | not set - mock mode active |

**5/5 passed**

## 2. Instagram Hunter (Mock Mode)

| Test | Status | Details |
|------|--------|---------|
| 5 mock profiles loaded | OK | 5 profiles |
| Emails extracted from bios | OK | 4/5 profiles have email |
| Phones extracted from bios | OK | 4/5 profiles have phone |
| WhatsApp candidates detected | OK | 4/5 profiles |
| Business accounts identified | OK | 4/5 are business |
| AI qualification (mock scoring) | OK | 4/5 qualified (score >= 50) |
| Low-follower profile filtered | OK | fitness_alex (950 followers, no contact) excluded |

**7/7 passed**

## 3. TikTok Hunter (Regex Extraction)

| Test | Status | Details |
|------|--------|---------|
| Email extraction from TikTok bios | OK | 5/6 bios parsed correctly |
| Phone extraction from TikTok bios | OK | 6/6 phones correct |
| Instagram handle extraction | OK | 5/6 handles correct |

**3/3 passed**

## 4. Facebook Hunter (Serper.dev Live)

| Test | Status | Details |
|------|--------|---------|
| Search: "agence marketing Paris" | OK | 5 Facebook pages found |
| Search: "restaurant Lyon" | OK | 5 Facebook pages found |
| Search: "coiffeur Bordeaux" | OK | 5 Facebook pages found |
| Total Facebook pages found | OK | 15 pages across 3 queries |
| Contact extraction from FB snippet | OK | Email: contact@petitlyon.fr, Phone: 04 72 10 11 12 |

**5/5 passed**

## 5. WhatsApp Checker (Mock)

| Test | Status | Details |
|------|--------|---------|
| WhatsApp number check (mock) | OK | 5/5 correct predictions |
| Active WhatsApp numbers | OK | 3 active (mobile numbers) |
| Inactive numbers | OK | 2 inactive (landline/special) |
| Phone normalization | OK | 4/4 normalized correctly |

**4/4 passed**

## 6. Orchestrator (20 Prospects Multi-Source)

| Test | Status | Details |
|------|--------|---------|
| 20 mock prospects loaded | OK | 20 from 3 platforms |
| Deduplication | OK | 6 duplicates removed, 14 unique prospects |
| Multi-platform merging | OK | 5 prospects on multiple platforms |
| Unified scoring applied | OK | Scores: 100, 100, 100, 100, 100... (top 5) |
| Average score reasonable | OK | Avg: 92/100 |
| Channel distribution | OK | instagram_dm: 5, whatsapp: 2, email: 7 |
| Multi-channel prospects | OK | 10/14 have 2+ channels |

**7/7 passed**

## 7. Template "Bonjour Bonjour" Fix

| Test | Status | Details |
|------|--------|---------|
| No prenom -> "Bonjour," | OK | Got: "Bonjour,

Je m'..." |
| No "Bonjour Bonjour" | OK | Bug is fixed |
| With prenom -> "Bonjour Pierre," | OK | Got: "Bonjour Pierre,

Je ..." |
| Email prefix -> "Bonjour Marine," | OK | Got: "Bonjour Marine,

Je ..." |
| Generic email -> "Bonjour," | OK | Got: "Bonjour,

Je m'..." |

**5/5 passed**

## 8. Email Placeholder/Platform Filter

| Test | Status | Details |
|------|--------|---------|
| Invalid emails rejected | OK | 10/10 correctly rejected |
| Valid emails accepted | OK | 7/7 correctly accepted |
| getBestEmail prefers personal | OK | Best: jakvlecoiffeurdelacour@gmail.com (over contact@) |
| getBestEmail falls back to generic | OK | Best: contact@brasserie.fr |
| getBestEmail returns null for all invalid | OK | Correctly returns null |

**5/5 passed**

## Modules Testes

| Module | Fichier | Mode | Resultat |
|--------|---------|------|----------|
| Instagram Hunter | hunters/instagram/instagramHunter.js | Mock (5 profils) | OK |
| TikTok Hunter | hunters/tiktok/tiktokHunter.js | Mock (6 bios regex) | OK |
| Facebook Hunter | hunters/facebook/facebookHunter.js | Live Serper | OK |
| WhatsApp Checker | hunters/whatsapp/whatsappChecker.js | Mock (5 numeros) | OK |
| Orchestrateur | hunters/socialHunterOrchestrator.js | Mock (20 prospects) | OK |
| Email Template | autopilot/scheduler.js | Unit test | OK |
| Email Filter | autopilot/scheduler.js | Unit test | OK |

## Orchestrateur - Pipeline Complet

```
20 prospects (7 IG + 7 TT + 6 FB)
       |
       v
Deduplication (email + phone)
       |
       v
~13 prospects uniques
       |
       v
Unified Scoring (base + bonus contacts/multiplatform)
       |
       v
Best Channel Selection (whatsapp > instagram_dm > email > fb)
```

## Corrections Verifiees

### "Bonjour Bonjour" (corrige)
- **Avant:** `Bonjour Bonjour,` quand pas de prenom
- **Apres:** `Bonjour,` (propre)
- **Cause:** `{prenom}` fallback etait `'Bonjour'` → maintenant `''` + nettoyage regex

### Filtre emails placeholders (actif)
- Domaines bloques: domain.com, treatwell.fr, planity.com, tripadvisor.com, example.com...
- Prefixes bloques: noreply, test, user, nom, jane.doe...
- Preference: emails personnels > generiques (contact@, info@)
- Protection: `getBestEmail()` retourne null si aucun email valide

## Prerequis Production

| Service | Variable | Status |
|---------|----------|--------|
| Serper.dev | SERPER_API_KEY | Configure |
| Gemini AI | GEMINI_API_KEY | Configure |
| Instagram | IG_USERNAME / IG_PASSWORD | Manquant (mock actif) |
| WhatsApp | EVOLUTION_API_URL / KEY | Manquant (mock actif) |
| Encryption | INSTAGRAM_ENCRYPTION_KEY | Manquant |

---
*Genere par test-social-hunters-full.mjs*
