# Audit Site Vitrine & Modes - FACE MEDIA GROSSISTE (DISTRAM)

**Date d'audit :** 6 février 2026
**Repo :** `~/fastgross-pro`
**URL déployée :** https://facemediagrossiste.web.app

---

## 1. Site Vitrine

| Élément | Statut | Remarque |
|---------|--------|----------|
| Page d'accueil existe | ✅ OUI | Mais c'est un **dashboard opérationnel**, pas une vitrine marketing |
| Présentation features | ❌ NON | Pas de page de présentation marketing |
| Boutons vers les modes en bas de page | ❌ NON | Navigation sidebar uniquement |
| Landing pages marketing | ✅ OUI | `/landing/[slug]` avec 4 templates (offre-decouverte, special-kebab, parrainage, salon-restauration) |

### Problème identifié
La page d'accueil (`/`) affiche directement un **dashboard manager** avec statistiques, commandes récentes, livreurs, etc. Ce n'est pas un site vitrine de présentation.

---

## 2. Modes disponibles

| Mode | Route | Page existe | Fonctionnel | Sous-pages |
|------|-------|-------------|-------------|------------|
| Dashboard | `/` | ✅ OUI | ✅ OUI | Stats, commandes, livreurs, quick actions |
| Commercial | `/commercial` | ✅ OUI | ✅ OUI | `/clients`, `/map`, `/prospects`, `/stats`, `/profile` |
| Livreur | `/livreur` | ✅ OUI | ✅ OUI | `/map`, `/messages`, `/profile`, `/[id]` |
| Manager/Supervision | `/supervision` | ✅ OUI | ✅ OUI | `/equipe`, `/equipe/[id]`, `/performances`, `/validations` |
| Admin/Settings | `/settings` | ✅ OUI | ✅ OUI | `/pricing`, `/users` |
| Client B2B (Portail) | `/portail` | ✅ OUI | ✅ OUI | Voir section 3 |

### Navigation vers les modes
- **Sidebar principale** : Dashboard, Commandes, Clients, Catalogues, Livraisons, Tracking, Messages, Prospects, Commercial, Marketing, Analytics, Alertes, Paramètres
- **Liens directs** : `/supervision`, `/commercial`, `/livreur`, `/portail`

---

## 3. App Commande Client (Portail B2B)

| Page | Route | Existe | Contenu/Fonctionnalités |
|------|-------|--------|-------------------------|
| Accueil client | `/portail` | ✅ OUI | Dashboard client avec stats, produits en promo, commandes récentes, notifications |
| Catalogue | `/portail/catalogue` | ✅ OUI | 98 produits DISTRAM, recherche, filtres par catégorie, ajout au panier |
| Panier | `/portail/panier` | ✅ OUI | Modification quantités, choix date/créneau livraison, notes, validation commande |
| Mes commandes | `/portail/commandes` | ✅ OUI | Historique avec filtres (Toutes/En cours/Livrées), détails, bouton "Recommander" |
| Détail commande | `/portail/commandes/[id]` | ✅ OUI | Détail complet d'une commande |
| Mes factures | `/portail/factures` | ✅ OUI | Liste des factures |
| Détail facture | `/portail/factures/[id]` | ✅ OUI | Détail d'une facture |
| Mon compte | `/portail/profile` | ✅ OUI | Profil client, adresse, informations |

### Catalogue DISTRAM
- **98 produits** halal pour restauration rapide
- **Catégories** : Viandes, Sauces, Pains, Légumes, Surgelés, Boissons, Emballages, Épicerie
- **Fonctionnalités** : Recherche, filtres, promotions, bestsellers
- **Service** : `src/data/distram-catalog.ts` et `src/services/client-portal-service.ts`

---

## 4. Version Mobile

| Élément | Statut | Détails |
|---------|--------|---------|
| Design responsive | ✅ OUI | 216+ classes Tailwind responsive (sm:/md:/lg:/xl:) |
| Bouton "Vue Mobile" | ✅ OUI | `PhonePreviewButton` - Bouton flottant qui ouvre modal avec iframe iPhone |
| Navigation mobile | ✅ OUI | `mobile-nav.tsx` avec navigation spécifique par mode |
| PWA configurée | ✅ OUI | `manifest.json` avec icônes, shortcuts, etc. |

### Composants Mobile
- **PhonePreviewButton** (`src/components/ui/phone-preview.tsx`) : Aperçu iPhone 14 Pro (375x812px)
- **MobileNav** (`src/components/layout/mobile-nav.tsx`) : Navigation bottom différente selon le mode (livreur/commercial/portail)

---

## 5. Architecture des pages

```
src/app/
├── page.tsx                    # Dashboard principal (Manager view)
├── login/                      # Connexion
├── register/                   # Inscription
├── welcome/                    # Page bienvenue
├── landing/[slug]/             # Landing pages marketing
├── commercial/                 # Mode Commercial
│   ├── page.tsx               # Dashboard commercial
│   ├── clients/               # Gestion clients
│   ├── map/                   # Carte clients
│   ├── prospects/             # Prospection
│   ├── stats/                 # Statistiques
│   └── profile/               # Profil commercial
├── livreur/                    # Mode Livreur
│   ├── page.tsx               # Dashboard livreur
│   ├── [id]/                  # Détail livraison
│   ├── map/                   # Carte tournée
│   ├── messages/              # Messages
│   └── profile/               # Profil livreur
├── supervision/                # Mode Manager
│   ├── page.tsx               # Dashboard supervision
│   ├── equipe/                # Gestion équipe
│   ├── performances/          # Performances
│   └── validations/           # Validations
├── portail/                    # Mode Client B2B
│   ├── page.tsx               # Accueil client
│   ├── catalogue/             # Catalogue produits
│   ├── panier/                # Panier
│   ├── commandes/             # Historique commandes
│   ├── factures/              # Factures
│   └── profile/               # Mon compte
├── settings/                   # Mode Admin
│   ├── page.tsx               # Paramètres généraux
│   ├── pricing/               # Tarification
│   └── users/                 # Gestion utilisateurs
└── (app)/                      # Autres pages
    ├── analytics/             # Analytics
    ├── anti-churn/            # Anti-churn IA
    ├── assistant/             # Assistant IA
    ├── devis/                 # Devis
    ├── scan-menu/             # Scan menu IA
    ├── stocks/                # Gestion stocks
    └── tournees/              # Optimisation tournées
```

---

## 6. Problèmes détectés

### Critique
1. **Pas de page vitrine marketing** - La page d'accueil est un dashboard, pas une présentation
2. **Pas de sélecteur de mode** - Pas de boutons pour choisir entre Commercial, Livreur, Manager, Client B2B sur la page d'accueil

### Mineurs
3. Les landing pages (`/landing/[slug]`) ne sont pas accessibles depuis la navigation principale
4. Pas de page "À propos" ou "Contact" sur le site

---

## 7. Actions recommandées

### Option A : Ajouter un sélecteur de mode sur le dashboard
Créer un composant `ModeSelector` en haut ou en bas du dashboard actuel pour permettre de basculer entre les modes.

### Option B : Créer une vraie page vitrine marketing
Remplacer la page d'accueil par une page vitrine avec :
- Hero section de présentation
- Features de l'application
- Témoignages clients
- Boutons vers chaque mode (Commercial, Livreur, Manager, Client B2B)
- Lien vers les landing pages marketing

### Recommandation
**Option B** est préférable pour une vraie présence web marketing.

---

## 8. Résumé

```
AUDIT TERMINÉ

✅ Site vitrine : À CRÉER (actuellement dashboard)
✅ Landing pages marketing : OK (/landing/[slug])
✅ Boutons modes : À AJOUTER (navigation sidebar existe)
✅ Mode Commercial : OK - /commercial
✅ Mode Livreur : OK - /livreur
✅ Mode Manager : OK - /supervision
✅ Mode Admin : OK - /settings
✅ Portail Client B2B : OK - /portail
  - Catalogue : OK (98 produits)
  - Panier : OK
  - Commandes : OK
  - Factures : OK
  - Profil : OK
✅ Version mobile : RESPONSIVE + BOUTON VUE MOBILE
✅ PWA : OK (manifest configuré)

Actions à effectuer :
- [ ] Créer une page vitrine marketing OU ajouter sélecteur de mode
- [ ] Lier les landing pages à la navigation
```

---

**Audit réalisé par Claude Code**
*6 février 2026*
