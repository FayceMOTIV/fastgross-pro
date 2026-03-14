# ALEX V4 — PROMPT DE LANCEMENT CLAUDE CODE
## Intégration complète dans le projet existant
### Mars 2026 — NE RIEN CASSER, TOUT VÉRIFIER 3 FOIS

---

# CONTEXTE PROJET

Alex est un SaaS de prospection automatisée. L'objectif est qu'Alex soit 100% autonome : détection d'intentions, identification de prospects dans n'importe quelle niche (B2B et B2C), récupération des contacts, outreach personnalisé, et livraison des leads chauds prêts à signer.

**Stack existant :** Firebase (Firestore, Auth, Functions, Hosting). Domaine : facemedia.tech. Alex fait partie de l'écosystème Morpheus (meta-agent orchestrateur).

**Philosophie :** Zéro dépendance SaaS payant. Budget cible : 0€/mois. Outils gratuits, open-source, techniques OSINT détournées pour la prospection commerciale. Coder des solutions custom plutôt que dépendre d'outils existants.

**Fichiers existants à connaître (ne pas écraser) :**
- `AlexProspectorV2.jsx` — App React existante avec scan multi-sources, email permutator, OSINT reverse lookup
- `ALEX_V2_PROMPT_SYSTEME.md` — 10 prompts système optimisés
- Toute la codebase Firebase existante

---

# CE QUE TU DOIS IMPLÉMENTER

## PLAN 1 — LES 10 PÉPITES (Trouver les prospects + Visibilité IA)

### BLOC HUNTER (5 modules — trouver des prospects)

#### MODULE 1 — Domaines Fraîchement Enregistrés
**Quoi :** Scraper les 200K-300K nouveaux domaines enregistrés chaque jour pour trouver des businesses qui viennent de naître.
**Sources gratuites :**
- WhoisDS (whoisds.com) — téléchargement quotidien gratuit de tous les nouveaux domaines
- GitHub repo `shreshta-labs/newly-registered-domains` — données quotidiennes
- WhoisExtractor — 30 jours gratuits
**Logique :**
1. Télécharger la liste quotidienne des nouveaux domaines
2. Filtrer par keyword dans le nom de domaine pour identifier la niche (ex: "dental" dans le domaine = niche dentaire)
3. Scanner la stack techno du domaine (via requête HTTP basique)
4. Score : +20 si < 7 jours, +25 si niche match, +15 si pas encore de site construit
**Implémentation :** Cloud Function Firebase qui tourne chaque matin à 6h. Stocke les résultats dans Firestore collection `prospects/new_domains`.

#### MODULE 2 — Job Postings Scraping
**Quoi :** Utiliser JobSpy (github.com/speedyapply/JobSpy) pour scraper les offres d'emploi et en déduire les besoins des entreprises.
**Logique :**
- Une entreprise qui recrute un "Growth Marketer" → besoin marketing
- Une qui recrute "DevOps" → scale son infra
- Une qui recrute "Head of Sales" → besoin outils sales
**Implémentation :**
1. Script Python (dans Cloud Function ou séparé) qui appelle JobSpy
2. Filtre par mots-clés liés à la niche du user
3. Analyse la description du job pour détecter le VRAI besoin (via prompt IA)
4. Enrichit le décideur de l'entreprise
5. Stocke dans Firestore `prospects/job_signals`

#### MODULE 3 — Reddit Intent Monitoring
**Quoi :** Utiliser F5Bot (f5bot.com) pour monitorer Reddit/HN/Lobsters en temps réel.
**Configuration F5Bot :**
- Keywords à configurer par niche du user : "looking for [catégorie]", "alternative to [concurrent]", "frustrated with [concurrent]", "willing to pay for", "recommend [catégorie]", "switched from [concurrent]"
**Phrases magiques à détecter (scorer automatiquement) :**
- "looking for alternative to [X]" → Score BRÛLANT (+30)
- "willing to pay for" → Score BRÛLANT (+30)
- "switched from" → Score TRÈS CHAUD (+25)
- "frustrated with" → Score CHAUD (+20)
- "anyone recommend" → Score TIÈDE (+15)
**Implémentation :**
1. Webhook ou parsing email des alertes F5Bot
2. IA analyse le post pour extraire : besoin exact, urgence, budget probable
3. Si possible, identifier le poster (via profil Reddit → OSINT)
4. Stocke dans Firestore `prospects/reddit_signals`
**Règle critique :** Réagir dans les 1-3 premières heures après publication (taux de réponse chute de 80% après)

#### MODULE 4 — Tech Stack Detection
**Quoi :** Scanner la stack techno des sites web des prospects pour identifier les manques.
**Outils gratuits :** WhatRuns (API si dispo), Wappalyzer (extension), BuiltWith (lookups gratuits)
**Signaux à détecter :**
- WordPress sans plugin SEO → proposer SEO
- Shopify sans analytics avancé → proposer analytics
- Pas de chat widget → proposer chatbot
- Pas de CRM détecté → proposer CRM
- Changement de techno récent → signal d'achat massif (+25)
- Utilise un concurrent direct du user → score +25
**Implémentation :**
1. Pour chaque prospect trouvé, HTTP GET sur le domaine
2. Parser les headers, meta tags, scripts chargés pour détecter la stack
3. Comparer avec la liste de "stack manquante" par niche
4. Stocker dans Firestore `prospects/tech_stack`

#### MODULE 5 — Google Maps Reviews Mining
**Quoi :** Utiliser Google Maps Scraper (github.com/omkarcloud/google-maps-scraper) pour trouver des prospects locaux.
**4 tactiques :**
- A) Avis 1-2 étoiles des concurrents = clients mécontents à contacter
- B) Entreprises < 10 avis = pas de marketing → leur en proposer
- C) Pas de site web listé = besoin urgent de présence web
- D) Note < 3.5 = problèmes opérationnels → leur proposer des solutions
**Implémentation :**
1. Scraper les résultats Google Maps par niche + localisation
2. Extraire : nom, téléphone, site web, note moyenne, nombre d'avis
3. Scorer selon les 4 tactiques
4. Stocker dans Firestore `prospects/google_maps`

### BLOC SHIELD (5 modules — visibilité IA)

#### MODULE 6 — Wikidata Entity Creation
#### MODULE 7 — Fichier llms.txt
#### MODULE 8 — EAV-E Content Rewriting
#### MODULE 9 — AI Crawler Audit
#### MODULE 10 — Citability Score Dashboard

---

## PLAN 2 — CONTACT & CONVERSION (Les super pouvoirs)

### 10 SUPER POUVOIRS DE CONTACT

#### SUPER POUVOIR 1 — Signal-Based Email
Chaque email référence LE signal spécifique qui a déclenché l'outreach. 5 templates par signal.

#### SUPER POUVOIR 2 — Vidéo Personnalisée IA
#### SUPER POUVOIR 3 — Note Vocale LinkedIn
#### SUPER POUVOIR 4 — Agent Fantôme Reddit
#### SUPER POUVOIR 5 — Loom Audit Gratuit
#### SUPER POUVOIR 6 — WhatsApp Bridge
#### SUPER POUVOIR 7 — Micro-Gift Digital
#### SUPER POUVOIR 8 — Social Warming
#### SUPER POUVOIR 9 — Sniper Follow-Up
#### SUPER POUVOIR 10 — Timing Prédictif

### 5 SYSTÈMES DE CONVERSION
#### SYSTÈME 1 — Qualification Bot IA
#### SYSTÈME 2 — Nurturing Perpétuel
#### SYSTÈME 3 — Social Proof Engine
#### SYSTÈME 4 — Booking Automatisé Intelligent
#### SYSTÈME 5 — Dashboard de Guerre

---

# SCORING COMPLET D'UN PROSPECT

```javascript
function scoreProspect(prospect) {
  let score = 0;

  // Contact info
  if (prospect.email) score += 30;
  if (prospect.phone) score += 15;
  if (prospect.linkedin) score += 10;

  // Signals HUNTER
  if (prospect.signal_type === 'reddit_intent') score += 25;
  if (prospect.signal_type === 'job_posting') score += 20;
  if (prospect.signal_type === 'new_domain' && prospect.domain_age_days < 7) score += 20;
  if (prospect.signal_type === 'competitor_user') score += 25;
  if (prospect.signal_type === 'no_website') score += 15;
  if (prospect.signal_type === 'low_reviews' && prospect.review_count < 10) score += 15;
  if (prospect.signal_type === 'missing_tech') score += 10;

  // Enrichment quality
  if (prospect.company_size) score += 5;
  if (prospect.title) score += 10;
  if (prospect.website) score += 5;

  // Funding signals
  if (prospect.signal?.match(/fund|rais|series|invest/i)) score += 10;
  if (prospect.signal?.match(/hiring|recruit|growing/i)) score += 5;
  if (prospect.signal?.match(/frustrat|switch|hate|alternative/i)) score += 15;

  return Math.min(score, 100);
}
```

---

# STRUCTURE FIRESTORE ALEX V4

```
organizations/{orgId}/
  hunterResults/new_domains/{id}     # Module 1
  hunterResults/reddit_signals/{id}  # Module 3
  hunterResults/google_maps/{id}     # Module 5
  hunterResults/tech_stack/{id}      # Module 4
  hunterResults/job_signals/{id}     # Module 2
```

---

# RÈGLES ABSOLUES

1. **NE RIEN CASSER** — Fais un audit de l'existant avant de toucher quoi que ce soit
2. **Firebase uniquement** — Pas de nouveau service, pas de nouvelle base de données
3. **Budget 0€** — N'utilise que des outils/APIs gratuits ou free tier
4. **Vérifie 3 fois** — Chaque module doit être testé unitairement avant déploiement
5. **Modules indépendants** — Chaque module fonctionne seul, peut être activé/désactivé
6. **Pas de commandes techniques** — L'interface doit être en langage naturel
7. **Langue : français** — Toute l'interface utilisateur est en français
8. **LLM : Claude** — Utiliser l'API Claude (claude-sonnet-4-20250514) avec web_search_20250305
9. **Pas de localStorage** — Utiliser React state ou Firestore

---

# ORDRE D'IMPLÉMENTATION (PAR PRIORITÉ)

## Phase 1 — Quick Wins HUNTER (Semaine 1-2)
1. Module Domaines Neufs (collecte quotidienne)
2. Module Reddit Intent (F5Bot webhook + parsing)
3. Module Google Maps Mining (scraping local)
4. Module Tech Stack Detection (scan automatique)
5. Module Job Postings (JobSpy integration)

## Phase 2 — Contact & Outreach (Semaine 2-3)
## Phase 3 — SHIELD Quick Wins (Semaine 3-4)
## Phase 4 — Scale (Semaine 5-8)
