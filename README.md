# FastGross Pro

**Plateforme de Gestion Commerciale pour Grossiste Alimentaire B2B**

Une solution complete et moderne pour gerer votre activite de grossiste alimentaire specialise fast-food : clients, commandes, livreurs, prospection... le tout avec de l'IA integree !

---

## Fonctionnalites

### Dashboard Commercial
- Vue d'ensemble CA, commandes, livraisons
- KPIs en temps reel
- Alertes intelligentes (clients inactifs, stocks bas)

### Gestion Clients (CRM)
- Fiches clients completes
- Historique des commandes
- Scoring client par IA
- Multi-catalogues et grilles tarifaires

### Commandes
- Prise de commande simplifiee
- Workflow de validation
- Sync avec SAGE ERP
- Generation de documents

### Tracking GPS Livreurs
- Suivi temps reel sur carte
- Optimisation des tournees (IA)
- Historique des trajets
- Geofencing

### Messagerie Securisee
- Chat type Slack
- Chiffrement End-to-End
- Channels par equipe
- Notifications push

### Intelligence Artificielle
- Scoring automatique prospects
- Generation d'emails personnalises
- Optimisation des tournees
- Assistant conversationnel
- Analyse des tendances clients

### Prospection
- Scraping automatique de prospects
- Qualification IA
- Sequences d'outreach
- Prise de RDV integree

### Mode Livreur (Mobile)
- Interface optimisee pour smartphone
- Liste des livraisons du jour
- Navigation GPS integree
- Scan et signature

### Portail Client B2B
- Passage de commandes en ligne
- Historique et renouvellement
- Suivi des livraisons en temps reel
- Gestion des factures

### Mode Manager
- Supervision des equipes
- Tableaux de bord avances
- Gestion des alertes
- Rapports et exports

---

## Demo

### Comptes de demonstration

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@medifresh.fr | Acces complet a toutes les fonctionnalites |
| Manager | manager@medifresh.fr | Supervision des equipes et rapports |
| Commercial | karim@medifresh.fr | Gestion clients et prospection (zone Marseille Nord) |
| Commercial | julie@medifresh.fr | Gestion clients (zone Marseille Sud) |
| Commercial | thomas@medifresh.fr | Gestion clients (zone Aix-en-Provence) |
| Livreur | ahmed@medifresh.fr | Livraisons zone Marseille Centre |
| Livreur | lucas@medifresh.fr | Livraisons zone Marseille Nord |

### Donnees de demonstration

L'application contient des donnees realistes pour les demos :

- **30 clients** : kebabs, pizzerias, fast-foods, restaurants, traiteurs, hotels
- **50 produits** : huiles, surgeles, fromages, sauces, boissons, pains, emballages
- **20 commandes** : en cours, en livraison, livrees
- **15 factures** : payees, en attente, en retard
- **8 alertes** : stocks, paiements, livraisons
- **4 livreurs** avec positions GPS en temps reel

### Import des donnees de demo

```bash
# Installer les dependances
npm install

# Importer les donnees dans Firebase
npx ts-node scripts/seed-firebase.ts

# Avec nettoyage prealable
npx ts-node scripts/seed-firebase.ts --clear
```

---

## Installation

### Prerequis
- Node.js 20+
- npm ou pnpm
- Compte Firebase
- Compte Groq (gratuit)

### 1. Cloner le projet
```bash
git clone https://github.com/votre-repo/fastgross-pro.git
cd fastgross-pro
```

### 2. Installer les dependances
```bash
npm install
```

### 3. Configuration Firebase
1. Creer un projet sur [Firebase Console](https://console.firebase.google.com)
2. Activer Authentication, Firestore, Realtime Database, Storage
3. Copier les credentials dans `.env.local`

### 4. Configuration Groq (IA)
1. Creer un compte sur [console.groq.com](https://console.groq.com)
2. Generer une API key
3. Ajouter dans `.env.local`

### 5. Variables d'environnement
```bash
cp .env.example .env.local
# Editer .env.local avec vos credentials
```

Variables requises :
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# Firebase Admin (pour les scripts)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Groq AI
GROQ_API_KEY=

# OpenAI (optionnel)
OPENAI_API_KEY=
```

### 6. Lancer le developpement
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Budget

| Service | Cout | Description |
|---------|------|-------------|
| Firebase | ~30-50 EUR | Blaze plan (apres quotas gratuits) |
| Groq AI | ~10-20 EUR | API ultra-rapide et economique |
| Vercel | 0 EUR | Hebergement gratuit |
| OpenStreetMap | 0 EUR | Cartes 100% gratuites |
| OSRM | 0 EUR | Routing gratuit |
| Virgil Security | 0 EUR | Chiffrement gratuit (< 1000 users) |

**Total estime : 80-120 EUR/mois**

---

## Stack Technique

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **shadcn/ui** (composants)
- **Leaflet** (cartes)
- **Framer Motion** (animations)
- **Zustand** (state management)
- **Recharts** (graphiques)

### Backend
- **Firebase Authentication** (authentification multi-roles)
- **Cloud Firestore** (base de donnees principale)
- **Firebase Realtime Database** (tracking GPS temps reel)
- **Cloud Functions** (logique metier)
- **Cloud Storage** (fichiers et documents)

### IA
- **Groq API** (Llama 3.3 70B, Mixtral)
- **OpenAI** (optionnel, GPT-4)

### Securite
- **Virgil Security E3Kit** (chiffrement E2E)
- **Firebase Security Rules** (controle d'acces)

---

## Structure du Projet

```
fastgross-pro/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── (dashboard)/        # Pages dashboard (layout partage)
│   │   ├── auth/               # Authentification
│   │   ├── commercial/         # Espace commercial
│   │   ├── livreur/            # Mode livreur mobile
│   │   ├── manager/            # Mode manager
│   │   ├── portal/             # Portail client B2B
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ui/                 # Composants de base (shadcn/ui)
│   │   ├── layout/             # Header, Sidebar, Navigation
│   │   ├── tracking/           # Carte et GPS
│   │   └── chat/               # Messagerie
│   ├── lib/
│   │   ├── firebase.ts         # Config Firebase Client
│   │   ├── firebase-admin.ts   # Config Firebase Admin
│   │   ├── seed-data.ts        # Donnees de demo
│   │   └── utils.ts            # Utilitaires
│   ├── services/
│   │   ├── ai-service.ts       # Service IA Groq
│   │   ├── commercial-service.ts
│   │   ├── livreur-service.ts
│   │   ├── client-portal-service.ts
│   │   └── alert-notification-service.ts
│   ├── stores/                 # Zustand stores
│   ├── hooks/                  # Custom hooks
│   └── types/                  # Types TypeScript
├── scripts/
│   └── seed-firebase.ts        # Import donnees demo
├── docs/
│   ├── SERVICES.md             # Documentation services
│   └── DEPLOYMENT.md           # Guide deploiement
├── public/
└── functions/                  # Cloud Functions (optionnel)
```

---

## Roles et Permissions

| Role | Acces |
|------|-------|
| **admin** | Acces complet, configuration systeme |
| **manager** | Supervision, rapports, gestion equipes |
| **commercial** | CRM, commandes, prospection (zone attribuee) |
| **livreur** | Livraisons assignees, tracking |
| **client** | Portail B2B, commandes, factures |

---

## Scripts disponibles

```bash
# Developpement
npm run dev              # Lancer en mode developpement
npm run build            # Build production
npm run start            # Demarrer build de production
npm run lint             # Linter ESLint

# Base de donnees
npx ts-node scripts/seed-firebase.ts        # Importer donnees demo
npx ts-node scripts/seed-firebase.ts -c     # Nettoyer puis importer

# Deploiement
./deploy.sh              # Deployer sur Vercel
```

---

## Securite

- **Authentification** : Firebase Auth avec roles (admin, commercial, livreur, client)
- **Base de donnees** : Firestore Rules par role et ownership
- **Messagerie** : Chiffrement End-to-End avec Virgil Security
- **API** : Validation et rate limiting
- **HTTPS** : Obligatoire en production
- **Variables sensibles** : Stockees dans variables d'environnement

---

## Integration SAGE

Le projet supporte l'integration avec les ERP SAGE :
- Sage Business Cloud Accounting
- Sage X3
- Sage Intacct
- Sage 300

Voir `docs/SERVICES.md` pour la configuration.

---

## Documentation

- [SERVICES.md](docs/SERVICES.md) - Documentation des services
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Guide de deploiement

---

## Support

- Documentation : voir dossier `docs/`
- Issues : GitHub Issues
- Email : support@fastgross.pro

---

Developpe avec passion pour les grossistes alimentaires
