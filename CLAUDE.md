# Face Media Factory v1.6.0 - Instructions Claude Code

## Vue d'ensemble

Face Media Factory est un SaaS multi-tenant de prospection intelligente multicanale propulse par l'IA.

### Stack Principal
- **Frontend** : React 18 + Vite + Tailwind CSS
- **Backend** : Firebase (Auth, Firestore, Functions, Hosting)
- **Orchestration** : Windmill (self-hosted, code-first)

### Services Externes
| Canal | Service | Notes |
|-------|---------|-------|
| Email Transactionnel | Amazon SES | $0.10/1000 emails |
| Cold Outreach | Saleshandy | $25/mois, comptes illimites |
| SMS | BudgetSMS | Meilleur rapport qualite/prix Europe |
| WhatsApp | Evolution API | Open-source, self-hosted gratuit |
| Instagram DM | ManyChat | Limites API strictes |
| Voicemail | Ringover | VoIP + voicemail drop |
| Courrier | Merci Facteur | Lettres recommandees |

Voir `STACK.md` pour la documentation technique complete.

## Architecture v2.0

```
face-media-factory/
├── src/
│   ├── App.jsx                   # Router + Auth/Org guards + permissions
│   ├── main.jsx                  # Entry point + Toast config
│   │
│   ├── components/               # Composants reutilisables
│   │   ├── Layout.jsx            # Sidebar dark + TopBar + org switcher
│   │   ├── LeadDrawer.jsx        # Panneau prospect multicanal
│   │   ├── LeadTable.jsx         # Table prospects avec filtres
│   │   ├── Modal.jsx             # Modal anime
│   │   ├── CommandPalette.jsx    # Cmd+K search
│   │   ├── NotificationPanel.jsx # Panneau notifications
│   │   └── ...                   # Autres composants
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Firebase Auth + profil + onboarding
│   │   └── OrgContext.jsx        # Multi-tenant + RBAC + limites plan
│   │
│   ├── hooks/
│   │   ├── useFirestore.js       # CRUD + real-time listeners
│   │   ├── usePermissions.jsx    # Hooks RBAC (can, canAction, isRoleAtLeast)
│   │   └── useCloudFunctions.js  # Hooks Cloud Functions
│   │
│   ├── services/                 # Logique metier v2.0
│   │   ├── permissions.js        # RBAC (5 roles: owner > admin > manager > member > viewer)
│   │   ├── organization.js       # Org CRUD, members, invitations, plans
│   │   ├── prospects.js          # Prospects multicanaux
│   │   ├── sequences.js          # Sequences multicanales orchestrees
│   │   ├── templates.js          # Templates par canal
│   │   └── interactions.js       # Timeline interactions
│   │
│   ├── engine/
│   │   └── multiChannelEngine.js # Orchestration 5 canaux
│   │
│   ├── pages/                    # Pages v2.0
│   │   ├── Landing.jsx           # Page d'accueil publique
│   │   ├── Login.jsx             # Connexion
│   │   ├── Signup.jsx            # Inscription
│   │   ├── Dashboard.jsx         # KPIs temps reel multicanaux
│   │   ├── Prospects.jsx         # Gestion prospects
│   │   ├── Templates.jsx         # Templates par canal
│   │   ├── Sequences.jsx         # Sequences multicanales
│   │   ├── Interactions.jsx      # Timeline interactions
│   │   ├── Analytics.jsx         # Analytics avances
│   │   ├── Team.jsx              # Gestion equipe RBAC
│   │   └── Settings.jsx          # Parametres multi-tabs
│   │
│   ├── lib/
│   │   └── firebase.js           # Firebase init + emulators
│   │
│   └── styles/
│       └── globals.css           # Tailwind + composants CSS
│
├── functions/                    # Firebase Cloud Functions
├── firestore.rules               # Securite multi-tenant RBAC
├── firebase.json                 # Config Firebase + emulators
└── tailwind.config.js            # Theme personnalise
```

## RBAC (5 roles)

| Role    | Niveau | Permissions                              |
|---------|--------|------------------------------------------|
| owner   | 100    | Tout + facturation + suppression org     |
| admin   | 80     | Gestion equipe, integrations, parametres |
| manager | 60     | Gestion prospects, sequences, templates  |
| member  | 40     | Creation/modification, pas suppression   |
| viewer  | 20     | Lecture seule                            |

### Utilisation dans les composants

```jsx
// Hook usePermissions
const { can, canAction, isRoleAtLeast, isAdmin } = usePermissions()

// Verifier une permission
if (can('prospects:delete')) { ... }

// Verifier un role minimum
if (isRoleAtLeast('manager')) { ... }

// Composant conditionnel
<RoleGuard minRole="admin">
  <AdminContent />
</RoleGuard>
```

## Canaux de prospection

| Canal        | Couleur  | Max/sequence | Delai min |
|--------------|----------|--------------|-----------|
| email        | emerald  | 5            | 1 jour    |
| sms          | blue     | 2            | 3 jours   |
| whatsapp     | green    | 2            | 3 jours   |
| instagram_dm | pink     | 1            | 5 jours   |
| voicemail    | purple   | 1            | 7 jours   |
| courrier     | amber    | 1            | 14 jours  |

## Firestore Structure v2.0

```
/organizations/{orgId}
├── name, slug, logo, plan, billing{}, limits{}, usage{}
├── /members/{userId}
│   └── uid, email, role, joinedAt, status
├── /prospects/{prospectId}
│   └── firstName, lastName, email, phone, company, status, score
│   └── channels{email{}, sms{}, instagram_dm{}, ...}
│   └── /activities/{activityId}
├── /templates/{templateId}
│   └── name, channel, category, subject, content, stats{}
├── /sequences/{sequenceId}
│   └── name, status, channels[], config{}, stats{}
│   └── /steps/{stepId}
│   └── /enrollments/{enrollmentId}
├── /interactions/{interactionId}
│   └── type, channel, direction, prospectId, content
├── /channels/{channelId}
│   └── enabled, provider, config{}
└── /settings/{settingId}
```

## Design System

### Couleurs
- **Brand** : Vert emeraude `#00d49a` (brand-500)
- **Dark** : Base `#0d0d1a` (dark-950)
- **Accent** : blue, amber, purple, pink, emerald

### Classes CSS
```css
.glass-card        /* Card avec blur et bordure subtile */
.btn-primary       /* Bouton brand vert */
.btn-secondary     /* Bouton dark avec bordure */
.btn-ghost         /* Bouton transparent */
.input-field       /* Input avec focus vert */
.badge-success     /* Badge vert */
.badge-warning     /* Badge orange */
.page-title        /* Titre de page */
.section-title     /* Titre de section */
```

## Commandes

```bash
# Dev
npm run dev              # Frontend (http://localhost:5173)
firebase emulators:start # Emulators Firebase

# Build & Deploy
npm run build            # Production build
firebase deploy --only hosting  # Deploy frontend
```

## Regles absolues

- **Ne jamais supprimer** de code sans remplacement
- **Toujours tester** avec `npm run build` avant commit
- **Utiliser le design system** existant
- **Pas de TODO** ni de placeholder dans le code final
- **UI en francais** (sans accents dans le code)
- **Gestion d'erreurs** partout (toast pour feedback)
- **Responsive** sur toutes les pages
- **RBAC** : toujours verifier les permissions
