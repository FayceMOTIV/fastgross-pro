# ⚡ Face Media Factory

**Growth Intelligence Platform — Transformez votre prospection en machine à leads.**

SaaS multi-tenant qui utilise l'IA (Claude) pour analyser les clients, générer des séquences email personnalisées, scorer les leads et prouver le ROI.

---

## 🏗️ Architecture

```
100% Firebase Stack
├── Frontend      → React + Vite + Tailwind CSS
├── Auth          → Firebase Authentication (Email + Google)
├── Database      → Cloud Firestore (multi-tenant via orgId)
├── Backend       → Firebase Cloud Functions (Node.js 20)
├── IA            → API Anthropic Claude (Sonnet 4.5)
├── Emails        → Resend API
└── Hosting       → Firebase Hosting
```

## 📦 Les 4 Modules

| Module | Description | Statut |
|--------|-------------|--------|
| 🔍 **Scanner** | Analyse le site web d'un client → génère profil de prospection IA | ✅ Prêt |
| ✉️ **Forgeur** | Génère des séquences email personnalisées (4 tons disponibles) | ✅ Prêt |
| 📡 **Radar** | Dashboard de scoring des leads (ouvertures, clics, réponses) | ✅ Prêt |
| 📊 **Proof** | Rapports de valeur automatiques pour prouver le ROI client | ✅ Prêt |

---

## 🐳 Quick Start (Docker)

La methode la plus simple pour demarrer le projet.

### Prerequis
- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

### Lancement

```bash
# 1. Cloner le repo
git clone <repo_url> && cd face-media-factory

# 2. Configurer les variables d'environnement
cp .env.docker.example .env
# Editer .env avec vos cles API (optionnel pour le dev)

# 3. Demarrer tout le stack
make up
# ou : docker compose up -d

# 4. Acceder a l'application
# Frontend : http://localhost:5173
# Firebase UI : http://localhost:4000
# Firestore : http://localhost:8080
```

### Commandes Docker utiles

| Commande | Description |
|----------|-------------|
| `make up` | Demarrer tous les services |
| `make down` | Arreter tous les services |
| `make logs` | Voir les logs en temps reel |
| `make build` | Rebuild apres changement de dependances |
| `make shell-frontend` | Shell dans le conteneur frontend |
| `make shell-firebase` | Shell dans le conteneur Firebase |
| `make test` | Lancer les tests |
| `make clean` | Tout supprimer |
| `make help` | Afficher toutes les commandes |

### Architecture Docker

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │    Frontend      │      │     Firebase Emulators       │ │
│  │  (Vite + React)  │ ───► │  Auth | Firestore | Funcs    │ │
│  │   Port: 5173     │      │  9099 |   8080    |  5001    │ │
│  └──────────────────┘      │                              │ │
│                            │      Emulator UI: 4000       │ │
│                            └──────────────────────────────┘ │
│                                        │                     │
│                            ┌───────────▼────────────┐       │
│                            │   firebase_data        │       │
│                            │   (Volume persistant)  │       │
│                            └────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Installation (Sans Docker)

### Prerequis
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Compte Firebase (Blaze plan pour les Cloud Functions)
- Cle API Anthropic
- Cle API Resend

### 1. Cloner et installer

```bash
# Cloner le projet
cd face-media-factory

# Installer les dépendances frontend
npm install

# Installer les dépendances des Cloud Functions
cd functions && npm install && cd ..
```

### 2. Configurer Firebase

```bash
# Se connecter à Firebase
firebase login

# Initialiser le projet (sélectionner votre projet Firebase)
firebase init
# → Sélectionner: Firestore, Functions, Hosting
# → Utiliser les fichiers existants (ne pas écraser)
```

### 3. Configurer les variables d'environnement

**Frontend (.env.local):**
```bash
cp .env.example .env.local
# Remplir avec vos clés Firebase depuis la console Firebase
# Project Settings > General > Your apps > Web app
```

**Cloud Functions:**
```bash
# Depuis la console Firebase ou via CLI
firebase functions:config:set anthropic.api_key="sk-ant-..."
firebase functions:config:set resend.api_key="re_..."

# Ou créer functions/.env pour le développement local
echo 'ANTHROPIC_API_KEY=sk-ant-...' > functions/.env
echo 'RESEND_API_KEY=re_...' >> functions/.env
```

### 4. Configurer Firebase Console

1. **Authentication** : Activer Email/Password + Google
2. **Firestore** : Créer la base de données (mode production)
3. **Deploy les rules** : `firebase deploy --only firestore:rules`

### 5. Lancer en local

```bash
# Terminal 1 : Frontend
npm run dev

# Terminal 2 : Emulateurs Firebase (optionnel)
firebase emulators:start
```

### 6. Déployer

```bash
# Tout déployer
npm run deploy

# Ou séparément
npm run deploy:hosting    # Frontend uniquement
npm run deploy:functions  # Cloud Functions uniquement
npm run deploy:rules      # Firestore rules uniquement
```

> **Note** : Pour un guide de déploiement détaillé avec toutes les étapes de configuration Firebase Console, voir [DEPLOY-TODO.md](./DEPLOY-TODO.md).

---

## 📁 Structure du projet

```
face-media-factory/
├── src/                          # Frontend React
│   ├── App.jsx                   # Router + Auth guards
│   ├── main.jsx                  # Entry point
│   ├── components/
│   │   ├── Layout.jsx            # Sidebar + navigation
│   │   ├── StatsCard.jsx         # Carte de statistique
│   │   └── LeadTable.jsx         # Table des leads avec score
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Firebase Auth state
│   │   └── OrgContext.jsx        # Multi-tenant org state
│   ├── hooks/
│   │   ├── useFirestore.js       # CRUD hooks + real-time listeners
│   │   └── useCloudFunctions.js  # Hooks pour appeler les CF
│   ├── lib/
│   │   └── firebase.js           # Firebase init + config
│   ├── pages/
│   │   ├── Login.jsx             # Page de connexion
│   │   ├── Signup.jsx            # Page d'inscription
│   │   ├── Onboarding.jsx        # Onboarding en 3 étapes
│   │   ├── Dashboard.jsx         # Vue d'ensemble + stats
│   │   ├── Scanner.jsx           # Module 1: Analyse de site
│   │   ├── Forgeur.jsx           # Module 2: Séquences email
│   │   ├── Radar.jsx             # Module 3: Scoring leads
│   │   ├── Clients.jsx           # Gestion des clients
│   │   └── Proof.jsx             # Module 4: Rapports de valeur
│   └── styles/
│       └── globals.css           # Tailwind + composants CSS
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       ├── index.js              # Entry point + exports
│       ├── scanner/
│       │   └── analyzeWebsite.js # Scraping + analyse IA
│       ├── forgeur/
│       │   └── generateSequence.js # Génération séquences IA
│       ├── email/
│       │   └── sendEmail.js      # Envoi Resend + webhooks
│       └── proof/
│           └── generateReport.js # Génération rapports
├── firebase.json                 # Config Firebase
├── firestore.rules               # Sécurité Firestore (multi-tenant)
├── firestore.indexes.json        # Index Firestore
├── tailwind.config.js            # Config Tailwind + thème
└── .env.example                  # Template variables d'env
```

---

## 🔐 Sécurité Multi-Tenant

Chaque donnée est isolée par `orgId`. Les Firestore Rules garantissent que :
- Un utilisateur ne voit que les données de son organisation
- Seuls les admins peuvent supprimer ou modifier les rôles
- Les Cloud Functions (webhooks) sont les seuls à écrire les events email
- Les rapports sont générés côté serveur uniquement

---

## 🎨 Design System

- **Thème** : Dark mode premium (#0d0d1a base)
- **Accent** : Vert émeraude/teal (#00d49a)
- **Fonts** : Outfit (display) + DM Sans (body) + JetBrains Mono (code)
- **Composants** : Glass cards, badges, boutons avec micro-animations

---

## 📈 Modèle de scoring (Radar)

| Événement | Points |
|-----------|--------|
| Email ouvert | +1 |
| Lien cliqué | +3 |
| Réponse reçue | +10 |
| Email bounced | -5 |

**Catégories :**
- 🔥 Lead chaud : score ≥ 7
- 🌡️ Lead tiède : score 4-6  
- ❄️ Lead froid : score 0-3

---

## 🆕 Nouvelles fonctionnalités (v1.1.0)

### Pages ajoutées
- **Landing page** (`/`) — Page d'accueil publique spectaculaire
- **Settings** (`/app/settings`) — Paramètres complets (Profil, Organisation, Email, Plan, Équipe)
- **ClientDetail** (`/app/clients/:id`) — Vue détaillée par client avec onglets

### Composants UI
- `Modal` — Modal animé réutilisable
- `Tabs` — Composant tabs avec icônes
- `EmptyState` — États vides élégants
- `ActivityFeed` — Feed d'activité temps réel
- `KanbanBoard` — Board drag & drop pour les leads
- `LeadDrawer` — Panneau latéral détails lead
- `ProgressSteps` — Steps animés pour le Scanner
- `EmailPreview` — Preview email style Gmail

### Cloud Functions
- `seedData` — Peuplement données de démo (dev only)

---

## 🛠️ Prochaines étapes (roadmap)

- [x] ~~Landing page publique~~ (v1.2.0 - contenu complet)
- [x] ~~Page Settings complète~~
- [x] ~~Vue détail client~~
- [x] ~~Composants UI réutilisables~~
- [x] ~~Seed data pour démo~~
- [x] ~~Pages légales (CGV, Confidentialité, Mentions)~~ (v1.2.0)
- [x] ~~Séquences email de démo (4 tons)~~ (v1.2.0)
- [x] ~~Toast notifications partout~~ (v1.2.0)
- [ ] Import CSV de leads
- [ ] Programmation automatique des envois (scheduler)
- [ ] Intégration calendrier (Cal.com / Calendly)
- [ ] Export PDF des rapports Proof
- [ ] A/B testing des objets d'email
- [ ] Webhooks entrants pour détecter les réponses
- [ ] Stripe pour le billing
- [ ] White-label mode (plan Agency)

---

## 💰 Pricing prévu

| Plan | Prix | Limites |
|------|------|---------|
| Solo | 79€/mois | 1 client, 200 emails/mois |
| Pro | 199€/mois | 3 clients, 1000 emails/mois |
| Agency | 499€/mois | Illimité, white-label, API |

---

Built with ⚡ by Face Media Factory
