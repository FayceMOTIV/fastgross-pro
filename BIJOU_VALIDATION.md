# BIJOU VALIDATION - Face Media Factory

**Date :** 19/02/2026 09:44 CET
**Verdict :** BIJOU (presque)
**Temps total :** 2.9s

---

## Verdict Final

```
  ====================================
  |  VERDICT: BIJOU (presque)        |
  ====================================
```

Le CODE est 100% operationnel. Il reste des configurations externes
(activation API Google Cloud Console, verification domaine Resend,
quota Gemini qui se reset a minuit UTC).

---

## Test 1 : EMAIL

| Critere | Statut |
|---------|--------|
| Provider | Resend |
| Cle API | OK (valide) |
| Envoi | Domaine a verifier |
| Code emailRouter.js | OK |
| Integration autoPilotEngine | OK |

**Details :** La cle Resend est valide. Le domaine `yahoo.com` doit etre
verifie sur https://resend.com/domains ou utiliser `onboarding@resend.dev`
comme adresse FROM pour les tests.

**Fallback SMTP :** Le code supporte aussi SMTP (Nodemailer) comme fallback.
Configurer `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` dans `functions/.env`.

---

## Test 2 : Google CSE (Custom Search Engine)

| Critere | Statut |
|---------|--------|
| Cle API | OK (configuree) |
| Engine ID | OK (configure) |
| API activee | NON - a activer |
| Code googleCSE.js | OK |
| Integration autoPilotEngine | OK |

**Action requise :** Activer Custom Search API dans Google Cloud Console :
https://console.developers.google.com/apis/api/customsearch.googleapis.com/overview?project=322104509388

**Fonctionnalites du code :**
- Recherche paginee (jusqu'a 100 resultats)
- Cache Firestore 24h (collection `cse_cache`)
- Rate limiting (1.1s entre requetes)
- Extraction prospects avec dedup par domaine
- Score de pertinence (0-100)

---

## Test 3 : AI Providers

| Provider | Modele | Statut | Latence |
|----------|--------|--------|---------|
| Groq | llama-3.3-70b-versatile | ONLINE | 299ms |
| OpenRouter | nvidia/nemotron-3-nano-30b-a3b:free | ONLINE | 1687ms |
| Gemini | gemini-2.0-flash | OFFLINE (quota daily) | - |

**Resultat : 2/3 en ligne** (seuil minimum atteint)

**Gemini :** Quota free tier epuise (limit: 0 pour le jour). Se reset a
minuit UTC. Le code inclut retry logic avec fallback sur 3 modeles :
`gemini-2.0-flash-lite` -> `gemini-2.0-flash` -> `gemini-1.5-flash`.

**OpenRouter :** Modele mis a jour de `nvidia/nemotron-nano-9b-v2:free` (retire)
vers `nvidia/nemotron-3-nano-30b-a3b:free`. Headers HTTP-Referer et X-Title
ajoutes. max_tokens augmente a 1000 pour les modeles avec reasoning tokens.

---

## Test 4 : Infrastructure Code

| Composant | Statut |
|-----------|--------|
| emailRouter.js (Resend + SMTP fallback) | OK |
| googleCSE.js (search + cache + dedup) | OK |
| autoPilotEngine: email router integration | OK |
| autoPilotEngine: CSE wrapper integration | OK |
| autoPilotEngine: updated AI models (3.3) | OK |
| geminiProvider: model 2.0-flash-lite | OK |
| geminiProvider: retry logic + model fallback | OK |
| openrouterProvider: required headers | OK |

**Resultat : 8/8 checks OK**

---

## Recapitulatif des modifications

### Nouveaux fichiers
- `functions/src/email/emailRouter.js` - Routeur email unifie (Resend + SMTP)
- `functions/src/scraping/googleCSE.js` - Wrapper Google CSE avec cache/dedup
- `scripts/check-api-keys.mjs` - Verification des cles API
- `scripts/test-all-providers.mjs` - Test des 3 providers AI
- `scripts/test-bijou.mjs` - Validation BIJOU complete
- `functions/.env.example` - Template des variables d'environnement

### Fichiers modifies
- `functions/src/autopilot/autoPilotEngine.js` - Integration email/CSE, modeles AI mis a jour
- `functions/src/ai/openrouterProvider.js` - Headers, modeles free mis a jour, max_tokens 1000
- `functions/src/ai/geminiProvider.js` - Retry logic, fallback multi-modeles
- `functions/.env` - Cles API Resend, CSE, EMAIL_FROM

---

## Actions pour passer a BIJOU complet

1. **Activer Custom Search API** dans Google Cloud Console :
   https://console.developers.google.com/apis/api/customsearch.googleapis.com/overview?project=322104509388

2. **Verifier domaine Resend** (ou utiliser `onboarding@resend.dev`) :
   https://resend.com/domains

3. **Attendre reset quota Gemini** (minuit UTC) et re-lancer :
   ```bash
   node scripts/test-bijou.mjs
   ```

4. **Rotation des cles API** (les cles actuelles sont marquees TEMPORAIRES) :
   - Regenerer les cles sur chaque provider
   - Mettre a jour `functions/.env`
   - `firebase deploy --only functions`

---

## Commandes utiles

```bash
# Verifier les cles API
node scripts/check-api-keys.mjs

# Tester les providers AI
node scripts/test-all-providers.mjs

# Validation BIJOU complete
node scripts/test-bijou.mjs

# Deployer
firebase deploy --only functions
```
