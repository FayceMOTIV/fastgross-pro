# FACE MEDIA GROSSISTE - FastGross Pro

**Plateforme B2B SaaS pour Grossistes Alimentaires avec 6 IAs Spécialisées**

Démo pilote: **DISTRAM** - Grossiste halal Lyon/Montpellier/Bordeaux (~300 restaurants)

---

## Demo

**URL:** https://facemediagrossiste.web.app

### Comptes de démonstration

| Role | Email | Mot de passe |
|------|-------|--------------|
| Commercial | commercial@distram.fr | Demo2024! |
| Client B2B | kebab.istanbul@test.fr | Demo2024! |

---

## Features

### Killer Feature: Scan Menu IA
Photographiez le menu d'un restaurant, notre IA GPT-4o Vision:
- Identifie tous les plats en 30 secondes
- Détecte le type de resto (kebab, burger, tacos, pizza)
- Recommande les produits DISTRAM nécessaires
- Génère automatiquement un devis personnalisé

### Catalogue DISTRAM
- **98 produits halal** organisés en 10 catégories
- Viandes, pains, sauces, fromages, légumes, frites, boissons, huiles, emballages
- Prix grossiste avec TVA et marges calculées
- Gestion multi-dépôts (Lyon, Montpellier, Bordeaux)

### Gestion Commandes
- Workflow complet: En attente → Confirmée → Préparation → Expédiée → Livrée
- 25 commandes de démo avec produits DISTRAM
- Détails avec timeline visuelle
- Filtres par statut, client, commercial

### Portail Client B2B
- Commande en ligne 24h/24
- Catalogue avec prix personnalisés
- Historique des commandes
- Suivi des factures

### Dashboard Manager
- KPIs multi-dépôts en temps réel
- 6 commerciaux avec performance et objectifs
- Alertes stock et livraison
- Validations en attente (remises, crédit)

### CRM Clients
- 30 clients restaurants réalistes
- 15 Lyon, 8 Montpellier, 7 Bordeaux
- Comptes Gold/Silver/Bronze avec remises
- Statuts actif/inactif/à risque

---

## Stack Technique

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **shadcn/ui** (composants)
- **Leaflet** (cartes)
- **Zustand** (state management)
- **Recharts** (graphiques)

### Backend
- **Firebase Authentication** (multi-roles)
- **Cloud Firestore** (base de données)
- **Firebase Realtime Database** (tracking GPS)
- **Cloud Storage** (fichiers)

### IA
- **OpenAI GPT-4o** (analyse menus, chat)
- **GPT-4o Vision** (scan menu photos)

---

## Installation

### Prérequis
- Node.js 20+
- npm
- Compte Firebase
- Compte OpenAI

### 1. Cloner le projet
```bash
git clone https://github.com/FayceMOTIV/fastgross-pro.git
cd fastgross-pro
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Variables d'environnement
```bash
cp .env.example .env.local
```

Variables requises:
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
```

### 4. Lancer le développement
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Structure du Projet

```
fastgross-pro/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── (app)/              # Pages protégées (scan-menu, devis, etc.)
│   │   ├── (auth)/             # Authentification (login, register)
│   │   ├── catalogues/         # Catalogue 98 produits
│   │   ├── clients/            # CRM 30 clients
│   │   ├── orders/             # Gestion commandes
│   │   ├── portail/            # Portail client B2B
│   │   ├── supervision/        # Dashboard manager
│   │   └── ...
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Header, Sidebar, AppLayout
│   │   └── vitrine/            # Landing page components
│   ├── data/
│   │   └── distram-catalog.ts  # 98 produits DISTRAM
│   ├── services/
│   │   ├── ai/                 # OpenAI GPT-4o services
│   │   └── firebase/           # Firebase services
│   ├── stores/                 # Zustand stores
│   └── hooks/                  # Custom hooks
├── AUDIT-REPORT.md             # Rapport d'audit technique
├── CHANGELOG-AUDIT.md          # Historique des modifications
└── README.md
```

---

## Scripts

```bash
npm run dev       # Développement
npm run build     # Build production
npm run start     # Démarrer production
npm run lint      # ESLint
```

---

## Rôles et Permissions

| Role | Accès |
|------|-------|
| **admin** | Accès complet, configuration |
| **manager** | Supervision, rapports, validations |
| **commercial** | CRM, commandes, prospection |
| **livreur** | Livraisons, tracking |
| **client** | Portail B2B, commandes |

---

## Audit Status

| Critère | Status |
|---------|--------|
| Build | ✅ PASS |
| TypeScript | ✅ 0 erreurs |
| ESLint | ⚠️ ~100 warnings (cosmétiques) |
| Groq refs | ✅ 0 (migré vers OpenAI) |
| OpenAI usage | ✅ 78 références |
| Firebase | ✅ Configuré |
| Pages | ✅ 51 routes |

---

## License

Proprietary - FACE MEDIA © 2024

---

Développé avec passion pour les grossistes alimentaires halal
