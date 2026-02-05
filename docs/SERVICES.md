# Services - FastGross Pro

Documentation technique des services de l'application.

---

## Vue d'ensemble

FastGross Pro utilise une architecture de services modulaire. Chaque service encapsule une fonctionnalite metier specifique et communique avec Firebase.

```
src/services/
├── ai-service.ts              # Intelligence artificielle (Groq/OpenAI)
├── commercial-service.ts      # Fonctionnalites commerciaux
├── livreur-service.ts         # Fonctionnalites livreurs
├── client-portal-service.ts   # Portail client B2B
├── alert-notification-service.ts # Alertes et notifications
└── sage-service.ts            # Integration ERP SAGE
```

---

## AI Service

**Fichier** : `src/services/ai-service.ts`

Service d'intelligence artificielle utilisant Groq (principal) ou OpenAI (fallback).

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `scoreProspect()` | Scoring automatique d'un prospect (0-100) |
| `generateEmail()` | Generation d'email personnalise |
| `analyzeClientTrend()` | Analyse des tendances client |
| `optimizeRoute()` | Optimisation des tournees de livraison |
| `askAssistant()` | Assistant conversationnel |

### Configuration

```env
# Groq (recommande - rapide et economique)
GROQ_API_KEY=gsk_xxxxx

# OpenAI (optionnel - fallback)
OPENAI_API_KEY=sk-xxxxx
```

### Exemple d'utilisation

```typescript
import { scoreProspect, generateEmail } from '@/services/ai-service';

// Scoring d'un prospect
const score = await scoreProspect({
  name: "Pizza Roma",
  type: "pizzeria",
  address: "Marseille",
  employees: 5
});
// Retourne: { score: 85, reasons: ["Zone compatible", "Type prioritaire"] }

// Generation d'email
const email = await generateEmail({
  clientName: "Marco",
  businessType: "pizzeria",
  template: "relance"
});
```

### Modeles utilises

| Provider | Modele | Usage |
|----------|--------|-------|
| Groq | llama-3.3-70b-versatile | Scoring, analyse |
| Groq | mixtral-8x7b-32768 | Generation texte |
| OpenAI | gpt-4-turbo | Fallback premium |

---

## Commercial Service

**Fichier** : `src/services/commercial-service.ts`

Gestion des fonctionnalites pour les commerciaux terrain.

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `getCommercialDashboard()` | Donnees du tableau de bord |
| `getMyClients()` | Liste des clients assignes |
| `createQuickOrder()` | Prise de commande rapide |
| `getMyProspects()` | Liste des prospects |
| `logVisit()` | Enregistrer une visite client |
| `addClientNote()` | Ajouter une note client |
| `getCommercialStats()` | Statistiques individuelles |
| `optimizeRoute()` | Optimiser la tournee du jour |

### Acces

Accessible uniquement aux utilisateurs avec le role `commercial` ou superieur.

### Exemple

```typescript
import { getMyClients, createQuickOrder } from '@/services/commercial-service';

// Recuperer mes clients
const clients = await getMyClients(userId);

// Passer une commande rapide
const order = await createQuickOrder(userId, {
  clientId: "client-1",
  items: [
    { productId: "prod-9", quantity: 2 },
    { productId: "prod-26", quantity: 3 }
  ]
});
```

---

## Livreur Service

**Fichier** : `src/services/livreur-service.ts`

Gestion des fonctionnalites pour les livreurs.

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `getTodayDeliveries()` | Livraisons du jour |
| `updateDeliveryStatus()` | Mettre a jour le statut |
| `updateLocation()` | Envoyer position GPS |
| `getOptimizedRoute()` | Itineraire optimise |
| `confirmDelivery()` | Confirmer une livraison |
| `reportIssue()` | Signaler un probleme |
| `getDeliveryHistory()` | Historique des livraisons |

### Tracking GPS

Les positions sont stockees dans Firebase Realtime Database pour un suivi temps reel.

```typescript
// Structure des donnees GPS
{
  livreurId: "livreur-1",
  location: {
    lat: 43.2965,
    lng: 5.3698,
    heading: 45,
    speed: 35,
    updatedAt: "2024-12-19T11:45:00Z"
  },
  status: "delivering",
  currentOrderId: "order-7"
}
```

### Exemple

```typescript
import { updateLocation, confirmDelivery } from '@/services/livreur-service';

// Mettre a jour la position
await updateLocation(livreurId, {
  lat: 43.2965,
  lng: 5.3698,
  heading: 45,
  speed: 35
});

// Confirmer une livraison
await confirmDelivery(orderId, {
  signature: "base64...",
  photo: "base64...",
  notes: "Client absent, laisse chez le voisin"
});
```

---

## Client Portal Service

**Fichier** : `src/services/client-portal-service.ts`

Fonctionnalites du portail client B2B.

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `getClientDashboard()` | Tableau de bord client |
| `getAvailableProducts()` | Catalogue produits |
| `createOrder()` | Passer une commande |
| `getOrderHistory()` | Historique commandes |
| `getInvoices()` | Liste des factures |
| `trackDelivery()` | Suivi de livraison |
| `reorderFromHistory()` | Renouveler une commande |
| `downloadInvoice()` | Telecharger une facture |

### Acces

Accessible uniquement aux utilisateurs avec le role `client`.

### Exemple

```typescript
import { createOrder, trackDelivery } from '@/services/client-portal-service';

// Passer une commande
const order = await createOrder(clientId, {
  items: [
    { productId: "prod-16", quantity: 5 },
    { productId: "prod-2", quantity: 2 }
  ],
  deliveryDate: "2024-12-20",
  notes: "Livraison avant 10h"
});

// Suivre une livraison
const tracking = await trackDelivery(orderId);
// Retourne: { status, driver, eta, location }
```

---

## Alert Notification Service

**Fichier** : `src/services/alert-notification-service.ts`

Gestion des alertes et notifications.

### Types d'alertes

| Type | Description | Priorite |
|------|-------------|----------|
| `stock` | Stock bas ou critique | high/medium |
| `payment` | Facture en retard | high |
| `delivery` | Probleme livraison | medium |
| `client` | Credit limite atteint | low/medium |
| `system` | Alertes systeme | low |

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `getAlerts()` | Liste des alertes |
| `getUnreadAlerts()` | Alertes non lues |
| `markAsRead()` | Marquer comme lu |
| `createAlert()` | Creer une alerte |
| `sendNotification()` | Envoyer notification push |

### Exemple

```typescript
import { createAlert, sendNotification } from '@/services/alert-notification-service';

// Creer une alerte stock
await createAlert({
  type: "stock",
  priority: "high",
  title: "Stock critique",
  message: "Produit X : seulement 5 unites restantes",
  productId: "prod-9"
});

// Envoyer notification
await sendNotification({
  userId: "admin-1",
  title: "Nouvelle alerte",
  body: "Stock critique detecte"
});
```

---

## SAGE Service

**Fichier** : `src/services/sage-service.ts`

Integration avec les ERP SAGE.

### ERP supportes

- Sage Business Cloud Accounting
- Sage X3
- Sage Intacct
- Sage 300

### Fonctionnalites

| Fonction | Description |
|----------|-------------|
| `syncClients()` | Synchroniser les clients |
| `syncProducts()` | Synchroniser les produits |
| `exportInvoice()` | Exporter une facture |
| `importOrders()` | Importer les commandes |

### Configuration

```env
SAGE_API_URL=https://api.sage.com/...
SAGE_CLIENT_ID=xxxxx
SAGE_CLIENT_SECRET=xxxxx
SAGE_COMPANY_ID=xxxxx
```

### Exemple

```typescript
import { syncClients, exportInvoice } from '@/services/sage-service';

// Synchroniser les clients
await syncClients();

// Exporter une facture vers SAGE
await exportInvoice(invoiceId);
```

---

## Firebase Collections

### Firestore

| Collection | Description |
|------------|-------------|
| `users` | Utilisateurs et profils |
| `clients` | Clients B2B |
| `products` | Catalogue produits |
| `orders` | Commandes |
| `invoices` | Factures |
| `alerts` | Alertes systeme |
| `settings` | Configuration |
| `stats` | Statistiques |

### Realtime Database

| Path | Description |
|------|-------------|
| `/driverLocations/{id}` | Position GPS en temps reel |
| `/presence/{id}` | Statut en ligne des utilisateurs |

---

## Securite

### Firestore Rules

Les regles de securite sont definies dans `firestore.rules` :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utilisateurs
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || isAdmin();
    }

    // Clients
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow write: if isCommercial() || isAdmin();
    }

    // Commandes
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isCommercial() || isClient();
      allow update: if isLivreur() || isAdmin();
    }
  }
}
```

### Fonctions helpers

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

function isCommercial() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['commercial', 'admin'];
}

function isLivreur() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['livreur', 'admin'];
}

function isClient() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'client';
}
```

---

## Performance

### Bonnes pratiques

1. **Pagination** : Utiliser `limit()` et `startAfter()` pour les grandes collections
2. **Indexes** : Creer des indexes composites pour les requetes frequentes
3. **Cache** : Utiliser le cache Firestore cote client
4. **Batch** : Regrouper les ecritures avec `writeBatch()`

### Indexes recommandes

```
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "fields": [
        { "fieldPath": "clientId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "invoices",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "dueDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## Logs et Monitoring

### Logs applicatifs

Les services loguent les actions importantes :

```typescript
console.log(`[AI-Service] Scoring prospect: ${prospectId}`);
console.log(`[Commercial-Service] Order created: ${orderId}`);
console.error(`[Livreur-Service] GPS update failed: ${error}`);
```

### Firebase Analytics

Activer Firebase Analytics pour le suivi des evenements :

```typescript
import { logEvent } from 'firebase/analytics';

logEvent(analytics, 'order_created', {
  orderId,
  clientId,
  totalTTC
});
```
