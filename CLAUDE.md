# Face Media Factory v4.0.0 - Instructions Claude Code

## Vue d'ensemble

Face Media Factory est un SaaS multi-tenant de prospection intelligente multicanale propulse par l'IA.

### Stack Principal
- **Frontend** : React 18 + Vite 6 + Tailwind CSS
- **Backend** : Firebase (Auth, Firestore, Functions, Hosting)
- **IA** : Gemini 1.5 Flash (gratuit) avec Claude en fallback
- **Charts** : Recharts pour les graphiques

### Services Externes
| Canal | Service | Notes |
|-------|---------|-------|
| Email Transactionnel | Amazon SES / Nodemailer | $0.10/1000 emails |
| Cold Outreach | Saleshandy | $25/mois, comptes illimites |
| SMS | BudgetSMS | Meilleur rapport qualite/prix Europe |
| WhatsApp | Evolution API | Open-source, self-hosted gratuit |
| Instagram DM | ManyChat | Limites API strictes |
| Voicemail | Ringover | VoIP + voicemail drop |
| Courrier | Merci Facteur | Lettres recommandees |

## Architecture v4.0

```
face-media-factory/
├── src/
│   ├── App.jsx                   # Router + Auth/Org guards + permissions
│   ├── main.jsx                  # Entry point + Toast config
│   │
│   ├── components/
│   │   ├── Layout.jsx            # Sidebar light + TopBar + org switcher
│   │   ├── pricing/              # Composants page tarification
│   │   │   ├── PricingCard.jsx
│   │   │   └── PricingToggle.jsx
│   │   ├── settings/             # Sous-composants Settings (11 fichiers)
│   │   └── ...                   # Autres composants
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Firebase Auth + profil
│   │   ├── OrgContext.jsx        # Multi-tenant + RBAC
│   │   ├── ThemeContext.jsx      # Theme clair/sombre
│   │   └── NotificationContext.jsx
│   │
│   ├── services/
│   │   ├── plans.js              # Configuration forfaits + canaux
│   │   ├── quotas.js             # Gestion quotas + usage
│   │   ├── permissions.js        # RBAC
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Landing.jsx           # Page d'accueil marketing
│   │   ├── Pricing.jsx           # Page tarification 3 forfaits
│   │   ├── Scanner.jsx           # Analyse sites web IA
│   │   ├── Forgeur.jsx           # Generation sequences IA
│   │   ├── Radar.jsx             # Lead scoring IA
│   │   ├── Campaigns.jsx         # Gestion campagnes multicanales
│   │   ├── Proof.jsx             # Rapports ROI + graphiques
│   │   ├── Dashboard.jsx         # KPIs temps reel
│   │   ├── Prospects.jsx         # Gestion prospects
│   │   └── Settings.jsx          # Parametres (thin router vers settings/)
│   │
│   └── styles/
│       └── globals.css           # Tailwind + theme light
│
├── functions/src/
│   ├── index.js                  # Exports Cloud Functions
│   ├── scanner/
│   │   └── analyzeWebsite.js     # Scraping + analyse IA
│   ├── forgeur/
│   │   └── generateSequence.js   # Generation sequences IA
│   ├── radar/
│   │   └── scoreLeads.js         # Lead scoring IA
│   ├── campaigns/
│   │   └── processSequence.js    # Orchestration envois multicanaux
│   ├── utils/
│   │   ├── gemini.js             # Wrapper Gemini + Claude fallback
│   │   ├── quotas.js             # Verification quotas
│   │   └── resetUsage.js         # Reset mensuel quotas
│   └── ...
│
├── firestore.rules               # Securite multi-tenant RBAC
├── firebase.json                 # Config Firebase
└── tailwind.config.js            # Theme light personnalise
```

## Systeme de Forfaits v4.0

| Forfait | Prix | Prospects | Emails | SMS | WhatsApp | Canaux |
|---------|------|-----------|--------|-----|----------|--------|
| Starter | 97€/mois | 500 | 1000 | - | - | 1 |
| Pro | 297€/mois | 2500 | 5000 | 500 | 200 | 3 |
| Enterprise | 697€/mois | 10000 | 20000 | 2000 | 1000 | 6 |

### Canaux par forfait
- **Starter** : Email uniquement
- **Pro** : Email, SMS, WhatsApp
- **Enterprise** : Tous (Email, SMS, WhatsApp, Instagram DM, Voicemail, Courrier)

## Modules v4.0

### Scanner
- Analyse de sites web avec IA (Gemini/Claude)
- Extraction : entreprise, contacts, pain points, accroches personnalisees
- Historique des scans

### Forgeur
- Generation de sequences multicanales
- Selection prospect, canaux, objectif, ton, nombre d'etapes
- Edition inline des messages generes

### Radar
- Lead scoring IA (0-100)
- Categories : Hot (80+), Warm (50-79), Cold (25-49), Ice (<25)
- Breakdown : Profil, Taille, Engagement, Signaux, Recence

### Campaigns
- Gestion campagnes d'envoi multicanal
- Suivi temps reel (envoyes, ouverts, reponses, bounces)
- Programmation et pause

### Proof
- Rapports ROI avec graphiques Recharts
- Evolution hebdomadaire, funnel conversion, repartition canaux
- Calcul ROI automatique

## Cloud Functions

| Function | Description |
|----------|-------------|
| `scanWebsite` | Scrape + analyse IA site web |
| `generateSequence` | Generation sequences IA |
| `scoreLeads` | Scoring batch de leads |
| `getLeadInsights` | Insights detailles lead |
| `processSequence` | Traitement etapes campagne |
| `scheduledCampaignProcessor` | Scheduler 15min |
| `resetMonthlyUsage` | Reset quotas 1er du mois |

## Design System v4.0 (Light Theme)

### Couleurs
- **Background** : `#FAFBFE` (bg)
- **Surface** : `#FFFFFF` (cards)
- **Accent** : `#4F6EF7` (indigo)
- **Text** : `#111827` (gray-900)

### Typographie
- **Titres** : Outfit
- **Corps** : Plus Jakarta Sans

### Classes CSS
```css
.card                /* Card blanche avec bordure subtile */
.card-hover          /* Card avec hover effet */
.btn-primary         /* Bouton gradient violet */
.btn-secondary       /* Bouton outline */
.btn-ghost           /* Bouton transparent */
.input-field         /* Input avec focus violet */
```

## Commandes

```bash
# Dev
npm run dev              # Frontend (http://localhost:5173)
npm run test             # Tests Vitest
npm run lint             # ESLint

# Build & Deploy
npm run build            # Production build
firebase deploy --only hosting  # Deploy frontend
firebase deploy --only functions # Deploy functions
```

## Variables d'environnement

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

### Functions (Firebase Config)
```
GEMINI_API_KEY=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
BUDGETSMS_API_KEY=...
EVOLUTION_API_URL=...
EVOLUTION_API_KEY=...
```

## Regles absolues

- **Ne jamais supprimer** de code sans remplacement
- **Toujours tester** avec `npm run build` avant commit
- **Utiliser le design system** light theme
- **Pas de TODO** ni de placeholder dans le code final
- **UI en francais** (sans accents dans le code)
- **Mode mock** pour toutes les pages (fonctionnel sans API)
- **Gestion d'erreurs** partout (toast pour feedback)
- **Responsive** sur toutes les pages
- **Quotas** : toujours verifier avant operations
