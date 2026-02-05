# Face Media Factory - Instructions Claude Code

## Vue d'ensemble

Face Media Factory est un SaaS multi-tenant de prospection intelligente propulsé par l'IA Claude.
Stack : 100% Firebase + React/Vite + Tailwind CSS.

## Architecture

```
face-media-factory/
├── src/                          # Frontend React
│   ├── App.jsx                   # Router + Auth guards
│   ├── main.jsx                  # Entry point + Toast config
│   ├── components/               # Composants réutilisables
│   │   ├── Layout.jsx            # Sidebar + navigation
│   │   ├── StatsCard.jsx         # Carte statistique
│   │   ├── LeadTable.jsx         # Table des leads
│   │   ├── Modal.jsx             # Modal animé
│   │   ├── Tabs.jsx              # Composant tabs
│   │   ├── EmptyState.jsx        # État vide
│   │   ├── ActivityFeed.jsx      # Feed d'activité
│   │   ├── KanbanBoard.jsx       # Board Kanban
│   │   ├── LeadDrawer.jsx        # Panneau lead
│   │   ├── ProgressSteps.jsx     # Steps animés
│   │   └── EmailPreview.jsx      # Preview email Gmail-like
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Firebase Auth state
│   │   └── OrgContext.jsx        # Multi-tenant org state
│   ├── hooks/
│   │   ├── useFirestore.js       # CRUD + real-time listeners
│   │   └── useCloudFunctions.js  # Hooks Cloud Functions
│   ├── lib/
│   │   └── firebase.js           # Firebase init + emulators
│   ├── pages/
│   │   ├── Landing.jsx           # Page d'accueil publique
│   │   ├── Login.jsx             # Connexion
│   │   ├── Signup.jsx            # Inscription
│   │   ├── Onboarding.jsx        # Onboarding 3 étapes
│   │   ├── Dashboard.jsx         # Vue d'ensemble
│   │   ├── Scanner.jsx           # Module 1: Analyse
│   │   ├── Forgeur.jsx           # Module 2: Séquences
│   │   ├── Radar.jsx             # Module 3: Scoring
│   │   ├── Proof.jsx             # Module 4: Rapports
│   │   ├── Clients.jsx           # Liste clients
│   │   ├── ClientDetail.jsx      # Détail client
│   │   └── Settings.jsx          # Paramètres
│   └── styles/
│       └── globals.css           # Tailwind + composants CSS
├── functions/                    # Firebase Cloud Functions
│   └── src/
│       ├── index.js              # Entry point + exports
│       ├── scanner/              # analyzeWebsite.js
│       ├── forgeur/              # generateSequence.js
│       ├── email/                # sendEmail.js + webhooks
│       ├── proof/                # generateReport.js
│       └── dev/                  # seedData.js
├── firebase.json                 # Config Firebase + emulators
├── firestore.rules               # Sécurité multi-tenant
└── tailwind.config.js            # Thème personnalisé
```

## Design System

### Couleurs
- **Brand** : Vert émeraude `#00d49a` (brand-500)
- **Dark** : Base `#0d0d1a` (dark-950)
- **Accent** : Utilisés pour les modules (blue, amber, purple)

### Classes CSS utilitaires
```css
.glass-card        /* Card avec blur et bordure subtile */
.glass-card-hover  /* Card avec effet hover */
.btn-primary       /* Bouton brand vert */
.btn-secondary     /* Bouton dark avec bordure */
.btn-ghost         /* Bouton transparent */
.input-field       /* Input avec focus vert */
.badge-success     /* Badge vert */
.badge-warning     /* Badge orange */
.badge-danger      /* Badge rouge */
.badge-info        /* Badge bleu */
.stat-value        /* Grande valeur stats */
.stat-label        /* Label stats */
.section-title     /* Titre de section */
.page-title        /* Titre de page */
.gradient-text     /* Texte dégradé brand */
```

### Fonts
- **Display** : Outfit (titres)
- **Body** : DM Sans (corps)
- **Mono** : JetBrains Mono (code)

## Conventions

### Nommage fichiers
- Pages : `PascalCase.jsx` (ex: `ClientDetail.jsx`)
- Composants : `PascalCase.jsx` (ex: `LeadTable.jsx`)
- Hooks : `camelCase.js` avec préfixe `use` (ex: `useFirestore.js`)

### Structure page
```jsx
export default function PageName() {
  // 1. Hooks (auth, org, data)
  // 2. State local
  // 3. Handlers

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">...</h1>
        <p className="text-dark-400 mt-1">...</p>
      </div>

      {/* Content */}
      ...
    </div>
  )
}
```

### Multi-tenant
- Toute donnée doit avoir un champ `orgId`
- Utiliser `useCollection()` avec `orgFilter: true` (défaut)
- Les mutations ajoutent automatiquement `orgId`

## Commandes

```bash
# Dev
npm run dev              # Frontend (http://localhost:5173)
firebase emulators:start # Emulators Firebase

# Build
npm run build            # Production build

# Deploy
npm run deploy           # Build + déploie tout
npm run deploy:hosting   # Frontend seul
npm run deploy:functions # Cloud Functions seul

# Seed data (en dev)
# Appeler http://localhost:5001/[project]/europe-west1/seedData
```

## Ajouter une nouvelle page

1. Créer `src/pages/MaPage.jsx`
2. Ajouter la route dans `App.jsx`
3. Ajouter le lien dans `Layout.jsx` (navItems)

## Ajouter une Cloud Function

1. Créer le fichier dans `functions/src/[module]/maFonction.js`
2. Exporter dans `functions/src/index.js`
3. Créer le hook dans `src/hooks/useCloudFunctions.js`

## Règles absolues

- **Ne jamais supprimer** de code sans remplacement
- **Toujours tester** avec `npm run build` avant commit
- **Utiliser le design system** existant
- **Pas de TODO** ni de placeholder dans le code final
- **UI en français**
- **Gestion d'erreurs** partout (toast pour feedback utilisateur)
- **Responsive** sur toutes les pages
