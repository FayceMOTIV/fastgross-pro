# 🚀 FastGross Pro - Documentation Technique Complète

## Plateforme de Gestion Commerciale pour Grossiste Alimentaire B2B

---

## 📊 Budget Optimisé : Maximum 120€/mois

### Répartition du Budget

| Service | Coût Mensuel | Alternative Gratuite |
|---------|-------------|---------------------|
| **Firebase (Blaze)** | ~30-50€ | Spark plan gratuit pour dev |
| **Groq AI API** | ~10-20€ | Free tier généreux |
| **Vercel Hosting** | 0€ | Hobby plan gratuit |
| **OpenStreetMap/Leaflet** | 0€ | 100% gratuit |
| **OSRM/OpenRouteService** | 0€ | 100% gratuit |
| **Virgil Security E2E** | 0€ | Gratuit jusqu'à 1000 users |
| **Domaine** | ~12€/an (~1€/mois) | - |
| **Buffer sécurité** | ~40-60€ | - |
| **TOTAL** | **~80-120€/mois** | - |

---

## 🏗️ Architecture Technique

### Stack Frontend (Web + PWA)
```
├── Next.js 15 (App Router)
├── React 19
├── TypeScript 5
├── Tailwind CSS v4
├── shadcn/ui (composants accessibles)
├── Leaflet + React-Leaflet (cartes)
├── Framer Motion (animations)
└── PWA (Progressive Web App)
```

### Stack Mobile (Cross-platform)
```
├── React Native / Expo
├── Firebase SDK
├── React Native Maps (Leaflet)
├── Push Notifications (FCM)
└── Mode hors-ligne (AsyncStorage)
```

### Stack Backend (Firebase)
```
├── Firebase Authentication
│   ├── Email/Password
│   ├── Google Sign-In
│   └── Rôles (admin, commercial, livreur)
├── Cloud Firestore (données structurées)
├── Firebase Realtime Database (GPS temps réel)
├── Cloud Functions (Node.js 18+)
├── Cloud Storage (fichiers/images)
├── Cloud Messaging (FCM - notifications)
└── Firebase Hosting
```

### Services Externes GRATUITS
```
├── OpenStreetMap (données cartographiques)
├── Leaflet/MapLibre GL (rendu cartes)
├── OSRM / OpenRouteService (routing/navigation)
├── Groq API (IA - Llama 3, Mixtral)
├── Virgil Security E3Kit (chiffrement E2E)
└── SAGE API (sync ERP)
```

---

## 🔐 Intégration SAGE

### APIs Disponibles selon version SAGE

| Version SAGE | Type API | Endpoint Base |
|--------------|----------|---------------|
| Sage Business Cloud | REST + OAuth 2.0 | api.accounting.sage.com |
| Sage X3 | REST Data Integration | [votre-instance].sage.com/api |
| Sage Intacct | REST + XML | api.intacct.com |
| Sage 300 | REST (JSON/XML) | [server]/api/v1 |

### Données Synchronisables
- **Clients** : fiches, contacts, conditions
- **Fournisseurs** : référentiel complet
- **Articles** : catalogues, prix, stocks
- **Commandes** : saisie, validation, suivi
- **Factures** : émission, paiements
- **Stocks** : mouvements, alertes

### Configuration Firebase Function pour SAGE
```javascript
// functions/src/sage-sync.ts
import * as functions from 'firebase-functions';
import axios from 'axios';

const SAGE_CONFIG = {
  baseUrl: process.env.SAGE_API_URL,
  clientId: process.env.SAGE_CLIENT_ID,
  clientSecret: process.env.SAGE_CLIENT_SECRET,
};

export const syncClientsFromSage = functions.pubsub
  .schedule('every 30 minutes')
  .onRun(async () => {
    // Sync logic here
  });
```

---

## 📍 Module GPS & Tracking Temps Réel

### Architecture Géolocalisation

```
┌─────────────────────────────────────────────────────────┐
│                 TRACKING TEMPS RÉEL                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📱 App Livreur                                          │
│      │                                                   │
│      ├── GPS Background Service                          │
│      │   └── Envoi position toutes les 15-30s           │
│      │                                                   │
│      └── Firebase Realtime Database                      │
│          └── /locations/{livreurId}                      │
│              ├── lat: 48.8566                            │
│              ├── lng: 2.3522                             │
│              ├── speed: 45                               │
│              ├── heading: 180                            │
│              ├── timestamp: 1706xxx                      │
│              └── accuracy: 10                            │
│                                                          │
│  🖥️ Dashboard Admin                                      │
│      │                                                   │
│      └── Listener Realtime DB                            │
│          └── Mise à jour carte instantanée               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Services Cartographiques GRATUITS

| Service | Usage | Coût |
|---------|-------|------|
| **OpenStreetMap** | Tuiles cartographiques | GRATUIT |
| **Leaflet** | Bibliothèque JS cartes | GRATUIT |
| **MapLibre GL** | Cartes vectorielles | GRATUIT |
| **OSRM** | Calcul d'itinéraires | GRATUIT |
| **OpenRouteService** | Routing + Isochrones | GRATUIT (2000 req/jour) |
| **Nominatim** | Géocodage | GRATUIT |

### Configuration Leaflet avec OpenStreetMap
```javascript
// Tiles OpenStreetMap GRATUITES
const osmTiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Routing gratuit avec OSRM
const osrmRouter = 'https://router.project-osrm.org/route/v1';

// Géocodage gratuit avec Nominatim
const nominatim = 'https://nominatim.openstreetmap.org/search';
```

---

## 💬 Messagerie Sécurisée E2E (FastChat)

### Architecture Chiffrement End-to-End

```
┌─────────────────────────────────────────────────────────┐
│              MESSAGERIE CHIFFRÉE E2E                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Utilisateur A                    Utilisateur B          │
│      │                                │                  │
│      ├── Clé Privée (locale)         ├── Clé Privée     │
│      ├── Clé Publique ──────────────►│                  │
│      │                               │                   │
│      │   Message: "Bonjour"          │                   │
│      │       │                       │                   │
│      │       ▼                       │                   │
│      │   Chiffrement (clé pub B)     │                   │
│      │       │                       │                   │
│      │       ▼                       │                   │
│      └── Firebase (données chiffrées)│                   │
│              │                       │                   │
│              └───────────────────────►│                  │
│                                       ▼                  │
│                              Déchiffrement (clé priv B)  │
│                                       │                  │
│                                       ▼                  │
│                              "Bonjour" (lisible)         │
│                                                          │
│  ⚠️ Firebase ne voit JAMAIS le contenu en clair         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Virgil Security E3Kit (GRATUIT jusqu'à 1000 users)
```javascript
import { EThree } from '@anthropic/virgil-e3kit-js';

// Initialisation
const eThree = await EThree.initialize(getVirgilToken);

// Chiffrement
const encryptedMessage = await eThree.authEncrypt(
  message, 
  recipientCard
);

// Déchiffrement
const decryptedMessage = await eThree.authDecrypt(
  encryptedMessage,
  senderCard
);
```

---

## 🤖 Intelligence Artificielle (Budget Optimisé)

### Groq API - Ultra Rapide & Économique

| Modèle | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|-------------------|
| Llama 3.1 70B | $0.59 | $0.79 |
| Llama 3.1 8B | $0.05 | $0.08 |
| Mixtral 8x7B | $0.24 | $0.24 |
| **FREE TIER** | Généreux quotas gratuits | - |

### Cas d'usage IA dans FastGross

1. **AI Sales Assistant**
   - Scoring automatique des prospects
   - Suggestions de relance clients
   - Génération d'emails personnalisés

2. **AI Route Optimizer**
   - Optimisation des tournées
   - Prédiction temps de livraison
   - Adaptation trafic temps réel

3. **AI Chatbot Interne**
   - Recherche rapide infos (stock, prix)
   - Création commandes vocales
   - Support équipes

### Configuration Groq
```javascript
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Utilisation
const response = await groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 1000,
});
```

---

## 📚 Gestion Multi-Catalogues

### Structure Firestore
```
firestore/
├── catalogues/
│   ├── {catalogueId}/
│   │   ├── name: "Fast-Food Standard"
│   │   ├── type: "fastfood"
│   │   ├── active: true
│   │   └── createdAt: timestamp
│   │
│   └── products/ (sous-collection)
│       └── {productId}/
│           ├── ref: "PRD-001"
│           ├── name: "Huile de friture 10L"
│           ├── category: "huiles"
│           ├── basePrice: 25.90
│           ├── unit: "bidon"
│           └── stock: 150
│
├── priceGrids/
│   └── {gridId}/
│       ├── catalogueId: "xxx"
│       ├── name: "Grille Premium"
│       ├── discountPercent: 15
│       └── rules: [...]
│
├── clients/
│   └── {clientId}/
│       ├── name: "Le Kebab du Coin"
│       ├── type: "kebab"
│       ├── catalogueId: "cat-kebab"
│       ├── priceGridId: "grid-premium"
│       ├── address: {...}
│       ├── contact: {...}
│       └── commercialId: "user-xxx"
│
├── orders/
│   └── {orderId}/
│       ├── clientId: "xxx"
│       ├── status: "pending" | "validated" | "delivering" | "delivered"
│       ├── items: [...]
│       ├── total: 458.90
│       ├── createdBy: "user-xxx"
│       └── deliveryDate: timestamp
│
└── users/
    └── {userId}/
        ├── email: "..."
        ├── role: "admin" | "commercial" | "livreur"
        ├── name: "..."
        └── teams: ["livreurs", "zone-nord"]
```

---

## 🔔 Système de Notifications

### Firebase Cloud Messaging (FCM) - GRATUIT ILLIMITÉ

```javascript
// Envoi notification à une équipe
import { getMessaging } from 'firebase-admin/messaging';

const sendToTeam = async (teamTopic: string, notification: any) => {
  await getMessaging().send({
    topic: teamTopic, // ex: "team-livreurs"
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data,
    android: {
      priority: 'high',
      notification: { channelId: 'urgent' },
    },
    apns: {
      payload: { aps: { sound: 'default' } },
    },
  });
};

// Topics disponibles
// - team-all (tout le monde)
// - team-commerciaux
// - team-livreurs
// - team-managers
// - zone-{zoneId}
// - user-{userId}
```

---

## 📈 Stratégie de Prospection IA

### Pipeline Automatisé

```
┌─────────────────────────────────────────────────────────┐
│              PROSPECTION AUTOMATISÉE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1️⃣ SOURCING (gratuit)                                  │
│     └── Google Maps Scraping (Places API lite)          │
│     └── Recherche "fast-food", "kebab", "snack"         │
│     └── Extraction: nom, adresse, téléphone             │
│                                                          │
│  2️⃣ ENRICHISSEMENT (Groq AI)                           │
│     └── Analyse type d'établissement                    │
│     └── Estimation taille/potentiel                     │
│     └── Score de priorité (1-100)                       │
│                                                          │
│  3️⃣ QUALIFICATION (automatique)                        │
│     └── Vérification données contact                    │
│     └── Détection doublons CRM                          │
│     └── Affectation zone commerciale                    │
│                                                          │
│  4️⃣ OUTREACH (semi-automatique)                        │
│     └── Email personnalisé (template + IA)              │
│     └── Séquence de relance programmée                  │
│     └── Tracking ouvertures/clics                       │
│                                                          │
│  5️⃣ BOOKING RDV (intégré)                              │
│     └── Calendrier commercial synchro                   │
│     └── Créneaux disponibles                            │
│     └── Confirmation automatique                        │
│                                                          │
│  6️⃣ CONVERSION                                         │
│     └── Premier RDV commercial                          │
│     └── Création compte client                          │
│     └── Première commande                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 👥 Rôles & Permissions

### Matrice des Droits

| Fonctionnalité | Admin | Commercial | Livreur |
|---------------|-------|------------|---------|
| Dashboard global | ✅ | 🔶 (sa zone) | ❌ |
| Gestion clients | ✅ | ✅ (ses clients) | ❌ |
| Prise commande | ✅ | ✅ | ❌ |
| Validation commande | ✅ | ❌ | ❌ |
| Tracking livreurs | ✅ | 🔶 (sa zone) | ❌ |
| App livraison | ❌ | ❌ | ✅ |
| Gestion équipes | ✅ | ❌ | ❌ |
| Paramètres | ✅ | ❌ | ❌ |
| Messagerie | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| Catalogues | ✅ | 🔶 (lecture) | ❌ |
| Prospection | ✅ | ✅ | ❌ |
| Sync SAGE | ✅ | ❌ | ❌ |

---

## 🚀 Roadmap de Développement

### Phase 1 - MVP (6-8 semaines)
- [ ] Setup Firebase + Next.js
- [ ] Authentification multi-rôles
- [ ] Dashboard principal
- [ ] CRM clients basique
- [ ] Tracking GPS livreurs
- [ ] Notifications push
- [ ] Messagerie basique (non chiffrée)

### Phase 2 - Core Features (4-6 semaines)
- [ ] Multi-catalogues complet
- [ ] Prise de commande
- [ ] Messagerie E2E (Virgil)
- [ ] Sync SAGE basique
- [ ] App mobile livreur (Expo)

### Phase 3 - Intelligence (4 semaines)
- [ ] Module prospection IA
- [ ] Scoring clients
- [ ] Optimisation tournées
- [ ] Génération emails IA
- [ ] Chatbot interne

### Phase 4 - Avancé (4 semaines)
- [ ] Portail client B2B
- [ ] Analytics avancés
- [ ] Prévisions IA
- [ ] App mobile commerciaux
- [ ] Mode hors-ligne complet

---

## 📱 Applications à Développer

| Application | Plateforme | Priorité |
|-------------|------------|----------|
| Dashboard Web | Next.js PWA | Phase 1 |
| App Livreurs | React Native/Expo | Phase 1 |
| App Commerciaux | React Native/Expo | Phase 2 |
| Portail Client B2B | Next.js | Phase 3 |

---

## 🔧 Variables d'Environnement

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
FIREBASE_ADMIN_PRIVATE_KEY=xxx

# SAGE API
SAGE_API_URL=https://api.xxx.sage.com
SAGE_CLIENT_ID=xxx
SAGE_CLIENT_SECRET=xxx

# Groq AI
GROQ_API_KEY=gsk_xxx

# Virgil Security
VIRGIL_APP_ID=xxx
VIRGIL_APP_KEY_ID=xxx
VIRGIL_APP_KEY=xxx

# OpenRouteService (optionnel, pour quotas plus élevés)
ORS_API_KEY=xxx
```

---

## 📊 Métriques de Performance Attendues

| Métrique | Objectif |
|----------|----------|
| Temps chargement dashboard | < 2s |
| Mise à jour GPS temps réel | < 500ms |
| Envoi notification | < 1s |
| Génération email IA | < 3s |
| Recherche clients | < 200ms |
| Sync SAGE | Toutes les 30min |

---

## 🛡️ Sécurité

- **Authentification** : Firebase Auth + Custom Claims pour rôles
- **Firestore Rules** : Accès basé sur rôles et ownership
- **Messagerie** : Chiffrement E2E Virgil Security
- **API** : Rate limiting + validation
- **HTTPS** : Obligatoire partout
- **Données sensibles** : Jamais en clair côté client

---

## 📞 Support & Maintenance

### Monitoring Inclus (Gratuit)
- Firebase Analytics
- Firebase Crashlytics
- Firebase Performance Monitoring
- Vercel Analytics

### Alertes Budget Firebase
```javascript
// Configurer alerte à 80€ dans Firebase Console
// Billing > Budgets & alerts > Create budget
```

---

*Documentation générée pour le projet FastGross Pro*
*Budget cible: Maximum 120€/mois*
