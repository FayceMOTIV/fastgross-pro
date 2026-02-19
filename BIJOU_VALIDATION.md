# BIJOU VALIDATION - Face Media Factory

**Date :** 19/02/2026 20:13 CET
**Verdict : BIJOU**
**Temps total :** 4.3s

---

## Verdict Final

```
  ============================
  |   V E R D I C T :  BIJOU  |
  ============================
  Systeme operationnel et vendable.
```

---

## Test 1 : EMAIL

| Critere | Statut |
|---------|--------|
| Provider | Resend |
| Cle API | OK (valide) |
| Envoi | OK (email envoye, id: 8958b48b) |
| FROM | onboarding@resend.dev |
| Code emailRouter.js | OK |
| Integration autoPilotEngine | OK |

**Fallback SMTP :** Le code supporte aussi SMTP (Nodemailer) comme fallback.
Configurer `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` dans `functions/.env`.

---

## Test 2 : Google CSE (Custom Search Engine)

| Critere | Statut |
|---------|--------|
| Cle API | Configuree |
| Engine ID | Configure (466514a5248164fa9) |
| Code googleCSE.js | OK |
| Integration autoPilotEngine | OK |

**Action restante :** Deverrouiller la restriction API sur la cle Google dans
Google Cloud Console > Identifiants > cliquer sur la cle > Restrictions relatives
aux API > ajouter "Custom Search JSON API" ou "Aucune restriction".

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
| Groq | llama-3.3-70b-versatile | ONLINE | 486ms |
| OpenRouter | nvidia/nemotron-3-nano-30b-a3b:free | ONLINE | 2280ms |
| Gemini | gemini-2.0-flash | OFFLINE (quota daily, reset minuit UTC) | - |

**Resultat : 2/3 en ligne** (seuil minimum atteint)

**Gemini :** Quota free tier epuise pour la journee. Se reset a minuit UTC.
Le code inclut retry logic avec fallback sur 3 modeles :
`gemini-2.0-flash-lite` -> `gemini-2.0-flash` -> `gemini-1.5-flash`.

**OpenRouter :** Modele mis a jour vers `nvidia/nemotron-3-nano-30b-a3b:free`.
Headers HTTP-Referer et X-Title ajoutes. max_tokens a 1000.

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

## Action restante pour CSE live

Sur https://console.cloud.google.com/apis/credentials?project=operator-pm-saas :
1. Cliquer sur la cle API
2. Section "Restrictions relatives aux API"
3. Ajouter **Custom Search JSON API** ou mettre **Aucune restriction**
4. Relancer `node scripts/test-bijou.mjs`

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
