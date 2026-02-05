# Changelog

## [1.4.0] - 2026-02-05

### Ajouts majeurs

#### Performance & Code Splitting
- **Lazy loading** : Toutes les pages chargées dynamiquement avec React.lazy
- **Suspense fallback** : Composant PageLoader pendant le chargement
- **Chunks séparés** : Bundle principal réduit, pages chargées à la demande

#### Command Palette (Cmd+K)
- **Recherche globale** : Accessible via `⌘K` ou bouton dans la sidebar
- **Navigation rapide** : Accès à toutes les pages de l'app
- **Actions rapides** : Nouveau scan, ajouter client, créer séquence, déconnexion
- **Recherche clients/leads** : Affiche les 5 premiers résultats
- Package : `cmdk`

#### Système de notifications
- **NotificationContext** : Gestion centralisée des notifications
- **Types** : info, success, warning, error
- **Persistance** : Sauvegarde dans localStorage (max 50)
- **NotificationPanel** : Panneau dans le header avec badge compteur
- Marquer comme lu, tout supprimer, navigation vers liens

#### Mode clair/sombre
- **ThemeContext** : Gestion du thème avec persistance localStorage
- **CSS Variables** : Variables pour couleurs principales
- **Onglet Apparence** : Nouveau dans Settings avec sélecteur visuel
- **Toggle compact** : Dans le header pour changement rapide
- Support système de préférence (prefers-color-scheme)

#### Raccourcis clavier
- **useKeyboardShortcuts** : Hook personnalisé pour les raccourcis
- **Navigation** : `⌘+D` Dashboard, `⌘⇧+C` Clients, `⌘⇧+S` Scanner, etc.
- **Modal d'aide** : `Shift+?` affiche tous les raccourcis
- **Paramètres** : `⌘+,` pour accès rapide

### Nouveaux composants
- `src/components/PageLoader.jsx` : Spinner de chargement
- `src/components/CommandPalette.jsx` : Palette de commandes cmdk
- `src/contexts/NotificationContext.jsx` : Gestion notifications
- `src/components/NotificationPanel.jsx` : UI notifications
- `src/contexts/ThemeContext.jsx` : Gestion du thème
- `src/components/ThemeToggle.jsx` : Sélecteur de thème
- `src/hooks/useKeyboardShortcuts.js` : Hook raccourcis clavier
- `src/components/KeyboardShortcutsHelp.jsx` : Modal aide raccourcis

### Technique
- Build : code splitting actif, chunks par page
- Index principal : ~838KB (gzip: 229KB)
- Nouvelles dépendances : cmdk

---

## [1.3.0] - 2026-02-05

### Ajouts majeurs

#### Export de donnees
- **Export CSV des leads** : Bouton "Exporter" dans Radar qui telecharge tous les leads filtres
- **Export PDF des rapports** : Bouton "Telecharger PDF" dans Proof avec generation via @react-pdf/renderer

#### PWA (Progressive Web App)
- **Manifest** : `public/manifest.json` configure pour installation
- **Service Worker** : `public/sw.js` pour mise en cache basique
- **Icones** : `public/icon.svg` a convertir en PNG (192x192 et 512x512)
- **Meta tags** : theme-color, apple-mobile-web-app-capable, etc.

#### Tour guide interactif
- **OnboardingTour** : Component avec @reactour/tour
- 5 etapes : Scanner, Forgeur, Radar, Proof, nouveau scan
- Declenchement automatique pour les nouveaux utilisateurs
- Bouton "Revoir le tour guide" dans Settings

#### Page Analytics (`/app/analytics`)
- **TrendChart** : Graphiques de tendance avec gradient
- **PeriodComparison** : Comparaison de periodes avec indicateurs
- Filtres par periode (7d, 30d, 90d)
- Performance par client
- Section Insights

#### Tooltips
- **Tooltip component** : Base sur @radix-ui/react-tooltip
- Tooltips sur : logout, actions LeadTable, boutons Radar

### Nouveaux composants
- `src/utils/exportCsv.js` : Fonction export CSV
- `src/components/ReportPdf.jsx` : Generation PDF rapports
- `src/components/OnboardingTour.jsx` : Tour guide
- `src/components/TrendChart.jsx` : Graphique tendance
- `src/components/PeriodComparison.jsx` : Comparaison periodes
- `src/components/Tooltip.jsx` : Tooltips Radix
- `src/pages/Analytics.jsx` : Page analytics

### Technique
- Build : 3MB JS, 37KB CSS (production)
- 3373 modules compiles
- Nouvelles dependances : @react-pdf/renderer, @reactour/tour, @radix-ui/react-tooltip

---

## [1.2.0] - 2026-02-05

### Ajouts majeurs

#### Landing Page (refonte complète)
- Hero section avec statistiques (+312% leads, 73% taux ouverture)
- Section "Pain Points" avec 4 problèmes résolus
- Présentation détaillée des 4 modules avec animations
- Section "Comment ça marche" en 4 étapes
- Témoignages clients (3 citations)
- Grille de pricing avec 3 plans (Solo, Pro, Agency)
- FAQ complète (8 questions)
- Footer avec 5 colonnes de liens
- Navigation fixe avec CTA

#### Pages légales (`/legal`)
- **CGV** : Conditions générales de vente complètes
- **Politique de confidentialité** : Conformité RGPD
- **Mentions légales** : Informations entreprise
- Navigation par tabs avec URL params

#### Séquences email de démo
- **4 tons disponibles** : Expert, Amical, Challenger, Storyteller
- **4 emails par séquence** avec délais et psychologie
- Intégration dans le Forgeur via bouton "Voir les exemples"
- Modal de sélection avec preview des emails
- Fonction "Utiliser ce template" pour pré-remplir

### Améliorations UX
- Toasts ajoutés à Scanner, Clients, Radar (+ existant Settings, Forgeur)
- Feedback utilisateur sur toutes les actions (ajout, modification, erreur)
- Messages de succès contextuels

### Documentation
- `DEPLOY-TODO.md` : Guide complet de déploiement Firebase
- Instructions détaillées pour chaque service (Auth, Firestore, Functions, Hosting)

---

## [1.1.0] - 2026-02-05

### Ajouts majeurs

#### Nouvelles pages
- **Landing page** (`/`) : Page d'accueil publique spectaculaire avec hero, modules, pricing, FAQ, témoignages
- **Settings** (`/app/settings`) : Page de paramètres complète avec 6 sections (Profil, Organisation, Email, Plan, Équipe, Zone dangereuse)
- **ClientDetail** (`/app/clients/:id`) : Page de détail client avec 5 onglets (Aperçu, Scans, Séquences, Leads, Rapports)

#### Nouveaux composants UI
- `Modal.jsx` : Modal réutilisable avec animations framer-motion
- `Tabs.jsx` : Composant tabs générique avec support d'icônes et compteurs
- `EmptyState.jsx` : État vide réutilisable avec icône, titre, description, CTA
- `ActivityFeed.jsx` : Feed d'activité avec icônes et timestamps relatifs
- `KanbanBoard.jsx` : Board Kanban drag & drop pour le Radar
- `LeadDrawer.jsx` : Panneau latéral pour détails lead avec historique
- `ProgressSteps.jsx` : Indicateur de progression animé pour le Scanner
- `EmailPreview.jsx` : Preview d'email style Gmail

#### Cloud Functions
- `seedData` : Fonction de peuplement des données de démo (dev uniquement)
  - 1 organisation "Agence Demo"
  - 3 clients avec scans
  - 20 leads avec scores variés (0-10)
  - 2 campagnes (1 active, 1 brouillon)
  - 50 événements email
  - 3 rapports Proof

### Améliorations
- Intégration Toast (react-hot-toast) avec thème dark personnalisé
- Routing mis à jour avec nouvelles routes
- Configuration `.env.local` pour les émulateurs Firebase

### Technique
- Build : 1.3MB JS, 35KB CSS (production)
- 3091 modules compilés
- Compatible React 18 + Vite 6

---

## [1.0.0] - Initial

### Fonctionnalités de base
- Authentification Firebase (Email + Google)
- Multi-tenant via orgId
- 4 modules principaux : Scanner, Forgeur, Radar, Proof
- Cloud Functions pour l'IA (Claude) et l'envoi d'emails (Resend)
- Design system dark mode premium
