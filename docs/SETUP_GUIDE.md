# Guide de Configuration - AI Multi-Providers System

## Vue d'ensemble

Le systeme AI Multi-Providers de Face Media Factory utilise 3 providers backend (Groq, OpenRouter, Gemini) avec fallback automatique, plus Puter.js cote client.

**Capacite totale gratuite :**
- Backend : 16,200 requetes/jour (Groq 14.4K + OpenRouter 1K + Gemini 1K)
- Frontend : Illimite via Puter.js (l'utilisateur paie)

---

## 1. Configuration des API Keys

### 1.1 Groq (Priorite 1 - Le plus rapide)

1. Allez sur https://console.groq.com
2. Creez un compte gratuit
3. Generez une API key dans "API Keys"
4. Copiez la cle

```bash
# Dans functions/.env
GROQ_API_KEY=gsk_xxxxxxxxxx
```

**Limites gratuites :**
- 14,400 requetes/jour
- 300 tokens/seconde (ultra-rapide)

### 1.2 OpenRouter (Priorite 2 - Flexible)

1. Allez sur https://openrouter.ai
2. Creez un compte
3. Allez dans "API Keys" et generez une cle
4. Copiez la cle

```bash
# Dans functions/.env
OPENROUTER_API_KEY=sk-or-xxxxxxxxxx
```

**Modeles utilises (rotation automatique) :**
- `meta-llama/llama-3.3-70b-instruct:free`
- `google/gemma-2-9b-it:free`
- `mistralai/mistral-7b-instruct:free`
- `qwen/qwen-2-7b-instruct:free`

**Limites gratuites :**
- ~1,000 requetes/jour (conservatif)
- 20 req/min par modele

### 1.3 Gemini (Priorite 3 - Backup)

1. Allez sur https://makersuite.google.com/app/apikey
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key"
4. Copiez la cle

```bash
# Dans functions/.env
GEMINI_API_KEY=AIzaSyxxxxxxxxxx
```

**Limites gratuites :**
- 1,500 requetes/jour (conservative a 1,000)
- 1M tokens de contexte

---

## 2. Configuration Email Enrichment (Optionnel)

### 2.1 Derrick (Priorite 1)

1. Allez sur https://derrick.app
2. Creez un compte gratuit
3. Obtenez votre API key

```bash
DERRICK_API_KEY=xxxxxxxxxx
```

**Limite :** 200 emails/mois

### 2.2 Apollo (Priorite 2)

1. Allez sur https://www.apollo.io
2. Creez un compte gratuit
3. Settings > Integrations > API Key

```bash
APOLLO_API_KEY=xxxxxxxxxx
```

**Limite :** 60 emails/mois

### 2.3 Hunter (Priorite 3)

1. Allez sur https://hunter.io
2. Creez un compte gratuit
3. API > Get API Key

```bash
HUNTER_API_KEY=xxxxxxxxxx
```

**Limite :** 50 requetes/mois

---

## 3. Configuration Multi-Platform Posting (Optionnel)

### 3.1 Postiz (Self-hosted - Illimite)

Si vous avez un VPS avec Postiz installe :

```bash
POSTIZ_API_URL=https://votre-postiz.com
POSTIZ_API_KEY=votre-api-key
```

### 3.2 Late API (Fallback)

1. Allez sur https://late.co
2. Creez un compte
3. Obtenez votre API key

```bash
LATE_API_KEY=xxxxxxxxxx
```

**Limite :** 20 posts/mois gratuits

---

## 4. Deploiement

### 4.1 Ajouter les variables d'environnement

```bash
cd functions

# Creer/editer le fichier .env
cat > .env << EOF
# AI Providers
GROQ_API_KEY=gsk_xxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxx

# Email Enrichment (optionnel)
DERRICK_API_KEY=xxxxxxxxxx
APOLLO_API_KEY=xxxxxxxxxx
HUNTER_API_KEY=xxxxxxxxxx

# Multi-Platform Posting (optionnel)
POSTIZ_API_URL=https://votre-postiz.com
POSTIZ_API_KEY=xxxxxxxxxx
LATE_API_KEY=xxxxxxxxxx
EOF
```

### 4.2 Deployer les Cloud Functions

```bash
# Toutes les fonctions
firebase deploy --only functions

# Ou specifiquement
firebase deploy --only functions:personalizeMessage,functions:getAIStatus,functions:enrichEmail,functions:enrichEmailsBatch
```

### 4.3 Deployer le Frontend

```bash
npm run build
firebase deploy --only hosting
```

---

## 5. Test de la Configuration

### 5.1 Test AI Generation

```javascript
// Dans la console Firebase ou via appel HTTP
const personalizeMessage = httpsCallable(functions, 'personalizeMessage')
const result = await personalizeMessage({
  prospectName: 'Sophie Martin',
  prospectBio: 'Coach en developpement personnel',
  prospectCategory: 'Coach',
  prospectFollowers: '10000',
  businessType: 'Coaching',
  targetService: 'Creation de contenu video'
})
console.log(result.data)
```

### 5.2 Test Provider Status

```javascript
const getAIStatus = httpsCallable(functions, 'getAIStatus')
const status = await getAIStatus()
console.log(status.data)
```

### 5.3 Test Email Enrichment

```javascript
const enrichEmail = httpsCallable(functions, 'enrichEmail')
const result = await enrichEmail({ email: 'test@example.com' })
console.log(result.data)
```

---

## 6. Troubleshooting

### Provider non disponible

Verifiez que :
1. L'API key est correctement configuree dans `.env`
2. Le fichier `.env` est dans le dossier `functions/`
3. Les functions ont ete redeployees apres modification du `.env`

### Fallback automatique

Si Groq echoue, le systeme bascule automatiquement vers OpenRouter, puis Gemini. Ceci est transparent pour l'utilisateur.

### Limites atteintes

- Les compteurs se reset automatiquement a minuit (UTC)
- Utilisez `getAIStatus()` pour voir l'usage actuel
- Passez a Puter.js cote client pour un usage illimite

---

## 7. Architecture

```
Request -> personalizeMessage()
              |
              v
         LoadBalancer.selectProvider()
              |
              +---> Groq (priority 1, fastest)
              |       |
              |       v [if fails]
              +---> OpenRouter (priority 2, 4 models)
              |       |
              |       v [if fails]
              +---> Gemini (priority 3, backup)
              |
              v
         Response with angles[]
```

---

## 8. Couts

| Service | Cout | Capacite |
|---------|------|----------|
| Groq | Gratuit | 14,400/jour |
| OpenRouter | Gratuit | ~1,000/jour |
| Gemini | Gratuit | 1,000/jour |
| Puter.js | User pays | Illimite |
| **Total Backend** | **0 EUR** | **16,400/jour** |

**Capacite mensuelle : ~492,000 requetes gratuites**
