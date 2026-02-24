# FIRST RUN REPORT - Face Media Factory AutoPilot

**Date:** 2026-02-21
**Mode:** DRY RUN (aucun email envoye)
**OrgId:** `IGtZSfpd8eyoIzn6W0ba`

---

## Resultat Global

| Phase | Metrique | Resultat |
|-------|----------|----------|
| Phase 1 - Recherche (Serper.dev) | Prospects trouves | **27** |
| Phase 2 - Scraping emails | Avec email | **16** (59%) |
| Phase 3 - Scoring | Scores | **16** |
| Phase 4 - Generation emails | Prets a envoyer | **10** |
| Phase 5 - Envoi | Envoyes | **0** (dry run) |

---

## Configuration AutoPilot

```json
{
  "enabled": true,
  "keywords": ["agence marketing Paris", "restaurant Lyon", "coiffeur Bordeaux"],
  "location": "France",
  "sector": "video et marketing digital",
  "emailsPerDay": 10,
  "pauseWeekends": false,
  "senderName": "Faical Kriouar",
  "maxProspectsPerRun": 10
}
```

---

## Pipeline Execute

```
Serper.dev (3 requetes) --> 27 prospects trouves
       |
       v
Scraping (27 sites) --> 16 emails extraits (59% taux extraction)
       |
       v
Scoring (0-100) --> 16 prospects scores
       |
       v
Email generation --> 10 emails personnalises generes
       |
       v
Sauvegarde Firestore --> OK (autopilotLogs + prospects)
```

---

## Recherches Effectuees

| Requete | Resultats |
|---------|-----------|
| `agence marketing Paris France contact` | 9 prospects |
| `restaurant Lyon France contact` | 10 prospects |
| `coiffeur Bordeaux France contact` | 8 prospects |

---

## Top 10 Prospects (emails generes)

| # | Entreprise | Domaine | Score | Email | Telephone |
|---|-----------|---------|-------|-------|-----------|
| 1 | Dissemblance Bordeaux | dissemblancebordeaux.fr | 85 | contact@dissemblancebordeaux.fr | 0535548490 |
| 2 | Guest Coiffure Bordeaux | guestcoiffure.com | 80 | guestcoiffure33@gmail.com | 0556449014 |
| 3 | Brasserie Georges Lyon | brasseriegeorges.com | 80 | contact@brasseriegeorges.com | 0472565454 |
| 4 | Le Coiffeur de la Cour | lecoiffeurdelacour.fr | 80 | jakvlecoiffeurdelacour@gmail.com | +33556819507 |
| 5 | M Restaurant Lyon | mrestaurant.fr | 80 | mrestaurant@orange.fr | 0489410859 |
| 6 | Leon de Lyon | leon-de-lyon.com | 80 | commercial@maisons-de-lyon.com | +33472101112 |
| 7 | Restaurant Le Vieux Lyon | restaurant-le-vieux-lyon.com | 80 | nom@domain.com | 0261598391 |
| 8 | Sortlist (Agences Paris) | sortlist.fr | 80 | contact@adeliom.com | +33756798223 |
| 9 | Agence 404 | agence404.com | 75 | bonjour@agence404.com | 0863200378 |
| 10 | Tchip Coiffure Bordeaux | salons.tchip.fr | 75 | pam33000@hotmail.fr | +33556480072 |

---

## Exemple d'Email Genere

**Destinataire:** contact@dissemblancebordeaux.fr
**Objet:** Salon de Haute Coiffure Dissemblance Bordeaux -- une idee pour booster votre visibilite

```
Bonjour Bonjour,

Je m'appelle Faical Kriouar et je realise des videos courtes pour les
professionnels du secteur video et marketing digital a France.

En visitant votre site, j'ai remarque que vous n'aviez pas de video sur
votre site et pas de chaine YouTube. La video est aujourd'hui le format
le plus engageant : +80% de visibilite en ligne en moyenne.

Je pourrais realiser pour Salon de Haute Coiffure Dissemblance Bordeaux :
- Une video de presentation courte (30-60s)
- Des stories/reels pour vos reseaux sociaux
- Un temoignage client filme

Seriez-vous disponible pour un appel de 15 minutes ?

Bonne journee,
Faical Kriouar
```

---

## Repartition par Statut (Firestore)

| Statut | Nombre | Description |
|--------|--------|-------------|
| `ready` | 10 | Email genere, pret a envoyer |
| `scored` | 6 | Score calcule, pas d'email genere (hors top 10) |
| `no_email` | 11 | Aucun email trouve sur le site |

---

## Bugs Corriges

### 1. `autopilotConfig/settings` au mauvais chemin
- **Probleme:** Le document `enabled: true` etait place a la racine Firestore (`autopilotConfig/settings`) au lieu de sous l'organisation (`organizations/{orgId}/autopilotConfig/settings`)
- **Impact:** Le scheduler trouvait 0 organisations actives
- **Fix:** Cree le document au bon chemin, supprime l'ancien

### 2. `scheduler.js` utilisait Google CSE au lieu de Serper.dev
- **Probleme:** La fonction `searchProspects()` dans `scheduler.js` necessitait `googleCseApiKey` et `googleCseCxId` (Google Custom Search Engine). Ces credentials n'existaient pas. Le module Serper.dev (`googleCSE.js`) existait mais n'etait pas utilise par le scheduler.
- **Impact:** La Phase 1 retournait toujours 0 prospects (skip avec le message "Pas de cle Google CSE")
- **Fix:** Reecrit `searchProspects()` pour utiliser l'API Serper.dev avec `process.env.SERPER_API_KEY`
- **Fichier:** `functions/src/autopilot/scheduler.js` (lignes 113-181)

### 3. Membre admin manquant
- **Probleme:** L'utilisateur `W0bwp2pdUoaUUaH0qU2c4M7vtSI3` n'etait membre d'aucune organisation (collection `members` vide)
- **Impact:** `runAutoPilotManual` refusait l'execution (permission denied)
- **Fix:** Ajoute comme `admin` dans `organizations/{orgId}/members/{userId}`

---

## Points d'Attention pour la Production

### Qualite des Donnees
- Certains emails extraits sont incorrects (ex: `nom@domain.com` = placeholder, `wavy@treatwell.fr` = email de la plateforme, pas du salon)
- Le scraping extrait parfois des emails de sites tiers presents sur la page (ads, widgets)
- Recommandation: ajouter un filtre pour exclure les domaines generiques (treatwell.fr, hotmail.fr, gmail.com pour les entreprises)

### Configuration Manquante
- **0 emailAccounts** configures - necessaire pour l'envoi reel
- **Template email** a personnaliser (le "Bonjour Bonjour" quand pas de prenom)
- **Secteur/Location** dans le template devrait etre adapte au prospect, pas a la config globale

### Securite
- Les API keys sont en clair dans `functions/.env` - migrer vers Firebase Secrets Manager
- Le warmup d'email n'est pas encore actif (0 comptes)

---

## Prochaines Etapes

1. Configurer au moins 1 emailAccount (SMTP ou Gmail OAuth) pour l'envoi reel
2. Ameliorer le filtre d'emails (exclure placeholders et plateformes)
3. Ajouter la personnalisation du prenom (fallback plus elegant que "Bonjour Bonjour")
4. Activer le warmup progressif avant d'envoyer en volume
5. Tester l'envoi reel sur 1-2 prospects valides

---

## Verification Firestore

```
organizations/IGtZSfpd8eyoIzn6W0ba/
  autopilotConfig/settings    -> enabled: true, keywords: [...], OK
  members/W0bwp2pd...         -> role: admin, OK
  prospects/                  -> 27 documents, OK
  autopilotLogs/              -> 1 document (dry run), OK
```

**Pipeline Status: OPERATIONNEL**
