# Guide de Deploiement - FastGross Pro

Guide complet pour deployer FastGross Pro en production.

---

## Table des matieres

1. [Prerequis](#prerequis)
2. [Deploiement sur Vercel](#deploiement-sur-vercel)
3. [Configuration Firebase](#configuration-firebase)
4. [Variables d'environnement](#variables-denvironnement)
5. [Domaine personnalise](#domaine-personnalise)
6. [SSL et Securite](#ssl-et-securite)
7. [Monitoring](#monitoring)
8. [Mise a jour](#mise-a-jour)

---

## Prerequis

### Comptes necessaires

| Service | URL | Gratuit |
|---------|-----|---------|
| Vercel | https://vercel.com | Oui (hobby) |
| Firebase | https://firebase.google.com | Oui (Spark) / Payant (Blaze) |
| Groq | https://console.groq.com | Oui |
| GitHub | https://github.com | Oui |

### Outils

```bash
# Vercel CLI
npm install -g vercel

# Firebase CLI
npm install -g firebase-tools
```

---

## Deploiement sur Vercel

### Option 1 : Deploiement automatique (recommande)

1. **Connecter le repository GitHub**
   - Aller sur https://vercel.com/new
   - Importer le projet depuis GitHub
   - Vercel detecte automatiquement Next.js

2. **Configurer les variables d'environnement**
   - Dans les settings du projet Vercel
   - Ajouter toutes les variables `.env.local`

3. **Deployer**
   - Chaque push sur `main` declenche un deploiement
   - Les branches creent des previews automatiques

### Option 2 : Deploiement manuel

```bash
# Se connecter a Vercel
vercel login

# Deployer en preview
vercel

# Deployer en production
vercel --prod
```

### Configuration Vercel (vercel.json)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "regions": ["cdg1"],
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }
  ]
}
```

---

## Configuration Firebase

### 1. Creer le projet Firebase

```bash
# Se connecter
firebase login

# Initialiser
firebase init
```

Selectionner :
- Firestore
- Realtime Database
- Authentication
- Storage
- Hosting (optionnel)

### 2. Activer les services

**Authentication**
- Activer Email/Password
- Activer Google (optionnel)
- Configurer le domaine autorise

**Firestore**
- Mode production
- Region : europe-west1 (Belgique)

**Realtime Database**
- Creer une instance
- Region : europe-west1

**Storage**
- Creer un bucket
- Configurer les regles

### 3. Regles de securite

**Firestore (firestore.rules)**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return getUserRole() == 'admin';
    }

    function isCommercial() {
      return getUserRole() in ['commercial', 'manager', 'admin'];
    }

    // Users
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId || isAdmin();
    }

    // Clients
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow write: if isCommercial();
    }

    // Products
    match /products/{productId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Orders
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isCommercial();
      allow update: if isAuthenticated();
    }

    // Invoices
    match /invoices/{invoiceId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Alerts
    match /alerts/{alertId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

**Realtime Database (database.rules.json)**

```json
{
  "rules": {
    "driverLocations": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth.uid == $userId"
      }
    },
    "presence": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth.uid == $userId"
      }
    }
  }
}
```

**Storage (storage.rules)**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Deployer les regles

```bash
firebase deploy --only firestore:rules
firebase deploy --only database
firebase deploy --only storage
```

---

## Variables d'environnement

### Vercel Dashboard

Settings > Environment Variables

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Oui | Oui | Non |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Oui | Oui | Non |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Oui | Oui | Non |
| GROQ_API_KEY | Oui | Oui | Non |

### Liste complete

```env
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fastgross-pro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fastgross-pro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fastgross-pro.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://fastgross-pro-default-rtdb.europe-west1.firebasedatabase.app

# Firebase Admin (secret)
FIREBASE_PROJECT_ID=fastgross-pro
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fastgross-pro.iam.gserviceaccount.com

# AI
GROQ_API_KEY=gsk_xxxxx
OPENAI_API_KEY=sk-xxxxx

# App
NEXT_PUBLIC_APP_URL=https://app.fastgross.pro
```

---

## Domaine personnalise

### Configuration DNS

1. **Vercel Dashboard** > Settings > Domains
2. Ajouter le domaine : `app.fastgross.pro`
3. Configurer les DNS :

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### Verification

```bash
# Verifier la propagation DNS
nslookup app.fastgross.pro
dig app.fastgross.pro
```

### Firebase Auth

Ajouter le domaine dans Firebase Console :
- Authentication > Settings > Authorized domains
- Ajouter `app.fastgross.pro`

---

## SSL et Securite

### HTTPS

Vercel fournit automatiquement un certificat SSL Let's Encrypt.

### Headers de securite

Configurer dans `next.config.js` :

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};
```

### Variables sensibles

- Ne jamais commiter `.env.local`
- Utiliser les secrets Vercel
- Rotation reguliere des API keys

---

## Monitoring

### Vercel Analytics

Activer dans le dashboard Vercel :
- Web Vitals
- Visitor insights

### Firebase Performance

```typescript
import { getPerformance } from 'firebase/performance';

const perf = getPerformance(app);
```

### Sentry (optionnel)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Alerting

Configurer des alertes pour :
- Erreurs 5xx > 1%
- Latence P95 > 3s
- Echecs de build

---

## Mise a jour

### Processus de deploiement

1. **Developpement**
   ```bash
   git checkout -b feature/nouvelle-fonctionnalite
   # ... modifications
   git commit -m "feat: nouvelle fonctionnalite"
   git push origin feature/nouvelle-fonctionnalite
   ```

2. **Review**
   - Ouvrir une Pull Request
   - Vercel cree un preview automatique
   - Review du code

3. **Merge**
   ```bash
   git checkout main
   git merge feature/nouvelle-fonctionnalite
   git push origin main
   ```

4. **Deploiement automatique**
   - Vercel detecte le push
   - Build et deploiement en production

### Rollback

```bash
# Via Vercel CLI
vercel rollback

# Ou via le dashboard
# Deployments > Choisir une version > Promote to Production
```

### Base de donnees

Pour les migrations Firestore :

```typescript
// scripts/migrate-v2.ts
import { getFirestore } from 'firebase-admin/firestore';

async function migrate() {
  const db = getFirestore();

  // Ajouter un champ a tous les clients
  const clients = await db.collection('clients').get();
  const batch = db.batch();

  clients.docs.forEach(doc => {
    batch.update(doc.ref, { newField: 'defaultValue' });
  });

  await batch.commit();
  console.log('Migration terminee');
}

migrate();
```

---

## Checklist pre-production

- [ ] Variables d'environnement configurees
- [ ] Regles Firebase deployees
- [ ] Domaine configure et SSL actif
- [ ] Analytics active
- [ ] Monitoring configure
- [ ] Backup Firestore active
- [ ] Tests E2E passes
- [ ] Performance verifiee (Lighthouse > 90)

---

## Support

En cas de probleme :
1. Verifier les logs Vercel (Functions)
2. Verifier la console Firebase
3. Contacter support@fastgross.pro
