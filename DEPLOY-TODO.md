# Face Media Factory - Guide de Déploiement

Ce document liste toutes les étapes manuelles nécessaires pour déployer Face Media Factory en production.

---

## 1. Prérequis

- [ ] Node.js 20+ installé
- [ ] Firebase CLI installé (`npm install -g firebase-tools`)
- [ ] Compte Firebase (plan Blaze requis pour les Cloud Functions)
- [ ] Compte Anthropic (pour l'API Claude)
- [ ] Compte Resend (pour l'envoi d'emails)

---

## 2. Créer le projet Firebase

```bash
# Se connecter à Firebase
firebase login

# Créer un nouveau projet
firebase projects:create face-media-factory-prod --display-name="Face Media Factory"

# Sélectionner le projet
firebase use face-media-factory-prod
```

---

## 3. Configurer les services Firebase Console

Aller sur https://console.firebase.google.com et configurer :

### Authentication
1. Cliquer sur "Authentication" > "Get started"
2. Activer "Email/Password" :
   - Sign-in method > Email/Password > Enable
3. Activer "Google" :
   - Sign-in method > Google > Enable
   - Configurer le nom du projet et l'email support

### Firestore Database
1. Cliquer sur "Firestore Database" > "Create database"
2. Sélectionner "Start in production mode"
3. Choisir la région : `europe-west1` (Belgique)

### Hosting
1. Cliquer sur "Hosting" > "Get started"
2. Suivre les instructions

---

## 4. Initialiser Firebase dans le projet

```bash
cd /Users/faicalkriouar/Projects/face-media-factory

# Initialiser (sélectionner les services existants)
firebase init

# Sélectionner :
# - Firestore
# - Functions
# - Hosting

# Pour chaque service, utiliser les fichiers existants (ne pas écraser)
```

---

## 5. Récupérer les clés Firebase

```bash
# Obtenir la configuration SDK
firebase apps:sdkconfig web
```

Mettre à jour `.env.local` (et créer `.env.production`) avec les vraies valeurs :

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=face-media-factory-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=face-media-factory-prod
VITE_FIREBASE_STORAGE_BUCKET=face-media-factory-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Désactiver les émulateurs en production
VITE_USE_EMULATORS=false

VITE_APP_NAME=Face Media Factory
VITE_APP_URL=https://face-media-factory-prod.web.app
```

---

## 6. Configurer les secrets pour les Cloud Functions

```bash
# Clé API Anthropic (Claude)
firebase functions:secrets:set ANTHROPIC_API_KEY
# Entrer votre clé : sk-ant-api03-...

# Clé API Resend (emails)
firebase functions:secrets:set RESEND_API_KEY
# Entrer votre clé : re_...
```

---

## 7. Déployer les Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 8. Déployer les Cloud Functions

```bash
cd functions
npm install
cd ..

firebase deploy --only functions
```

---

## 9. Générer les icônes PWA

Le fichier `public/icon.svg` doit être converti en PNG pour le PWA :

```bash
# Option 1 : Utiliser ImageMagick
convert public/icon.svg -resize 192x192 public/icon-192.png
convert public/icon.svg -resize 512x512 public/icon-512.png

# Option 2 : Utiliser un service en ligne
# - https://svgtopng.com/
# - https://cloudconvert.com/svg-to-png
# Télécharger icon.svg et générer les 2 tailles (192x192 et 512x512)
```

---

## 10. Build et déployer le frontend

```bash
# Build de production
npm run build

# Déployer sur Firebase Hosting
firebase deploy --only hosting
```

---

## 10. Configurer un domaine personnalisé (optionnel)

1. Aller sur Firebase Console > Hosting > "Add custom domain"
2. Suivre les instructions pour configurer les DNS
3. Mettre à jour `VITE_APP_URL` dans `.env.production`

---

## 11. Configurer Stripe pour les paiements (optionnel)

1. Créer un compte Stripe : https://stripe.com
2. Récupérer les clés API (mode test puis production)
3. Configurer les webhooks Stripe vers votre Cloud Function
4. Ajouter le secret webhook :
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```

---

## 12. Configurer Resend pour l'envoi d'emails

1. Créer un compte Resend : https://resend.com
2. Vérifier votre domaine email
3. Créer une clé API
4. Configurer le webhook pour tracker les événements :
   - URL : `https://europe-west1-[PROJECT_ID].cloudfunctions.net/handleEmailWebhook`
   - Events : delivered, opened, clicked, bounced

---

## 13. Vérification post-déploiement

- [ ] Tester l'inscription/connexion
- [ ] Tester le Scanner avec une vraie URL
- [ ] Tester le Forgeur (génération d'emails)
- [ ] Vérifier que le Radar affiche les leads
- [ ] Tester l'envoi d'un email de test
- [ ] Vérifier les logs dans Firebase Console

---

## URLs après déploiement

- **App** : https://face-media-factory-prod.web.app
- **Firebase Console** : https://console.firebase.google.com/project/face-media-factory-prod
- **Functions Logs** : https://console.firebase.google.com/project/face-media-factory-prod/functions/logs

---

## Support

En cas de problème :
- Logs Functions : `firebase functions:log`
- Status Firebase : https://status.firebase.google.com
- Documentation : https://firebase.google.com/docs
