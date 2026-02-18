# QUICK START (5 MINUTES)

## Option 1: Auto Setup Script (Recommande)

```bash
cd ~/Projects/face-media-factory
./scripts/setup.sh
```

Le script va :
1. Installer toutes les dependances
2. Te demander tes API keys (avec liens)
3. Creer le .env automatiquement
4. Deploy Firebase Functions
5. Deploy Frontend

**Temps total** : 5-10 minutes (dont 2 min humain)

---

## Option 2: Setup Manuel

### 1. Install (1 min)
```bash
cd ~/Projects/face-media-factory
npm install
cd functions && npm install
```

### 2. API Keys (5 min)

Creez ces comptes et copiez les API keys :

| Service | URL | Limite gratuite |
|---------|-----|-----------------|
| **Groq** | https://console.groq.com | 14,400/jour |
| **OpenRouter** | https://openrouter.ai | 1,000/jour |
| **Gemini** | https://aistudio.google.com | 1,000/jour |
| Derrick (opt) | https://derrick.app | 200/mois |
| Apollo (opt) | https://apollo.io | 60/mois |
| Hunter (opt) | https://hunter.io | 50/mois |

### 3. Configure .env (1 min)
```bash
cd functions
nano .env
```

Ajoutez :
```
GROQ_API_KEY=gsk_xxxxxxxxxx
OPENROUTER_API_KEY=sk-or-xxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxx

# Optionnel
DERRICK_API_KEY=xxxxxxxxxx
APOLLO_API_KEY=xxxxxxxxxx
HUNTER_API_KEY=xxxxxxxxxx
```

### 4. Deploy (3 min)
```bash
cd functions
firebase deploy --only functions

cd ..
npm run build
firebase deploy --only hosting
```

---

## DONE!

Visitez : https://face-media-factory.web.app/app

### Pages disponibles :

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | /app | Vue d'ensemble |
| AI Personalization | /app/ai | Generation de messages |
| Email Enrichment | /app/enrichment | Enrichissement emails |
| Multi-Platform | /app/posting | Publication 13 plateformes |
| Monitoring | /app/monitoring | Stats en temps reel |
| Hunter | /app/hunter | Prospection Instagram |

---

## Capacites du systeme

| Feature | Capacite | Cout |
|---------|----------|------|
| AI Generation | 492K/mois | FREE |
| Email Enrichment | 310/mois | FREE |
| Multi-Platform | UNLIMITED | FREE |
| **Total** | **Enterprise** | **€24/mois** |

**Economie : 94% (€399/mois)**

---

## Support

- Issues : https://github.com/anthropics/claude-code/issues
- Docs : /docs/SETUP_GUIDE.md
- API : /docs/API_DOCS.md

**ENJOY!**
