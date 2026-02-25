# AUDIT_BEFORE.md — Etat reel du scheduler avant corrections

1. **Bug Bonjour** : `generateEmail()` L468 fait `body.replace(/Bonjour\s*,/g, 'Bonjour,')` — ne supprime PAS la virgule, produit "Bonjour," quand prenom vide.
2. **Filtre emails** : `isValidProspectEmail()` L51 et `getBestEmail()` L62 existent DEJA — filtrent domaines plateformes et prefixes generiques. MAIS pas de filtre `companyDomain` ni longueur prefixe < 4 chars.
3. **Deduplication** : `searchProspects()` L199 verifie les doublons par `domain` dans Firestore AVANT ajout. MAIS aucune dedup par `email` ni par `contactedAt` — un prospect deja contacte peut etre re-scrape si son status change.
4. **emailAccounts** : `runPipeline()` L554 lit bien `emailAccounts` collection avec status `active`/`warming_up`. MAIS ne GENERE PAS l'email via `emailRouter.js` — il genere seulement le contenu et met status `ready`. L'envoi reel n'est PAS dans scheduler.js.
5. **Multi-niches** : `searchProspects()` L164 lit `config.keywords` (tableau plat) + `config.location` (string unique). Pas de support multi-niches.
6. **Enrichissement** : Pas d'enrichissement conditionnel par score — tous les prospects `found` sont scrapes (L492-517).
7. **callAI** : Non utilise dans scheduler.js — le scoring est fait avec des heuristiques HTML (L340-411), pas d'IA.
8. **Pipeline** : 5 phases — search → scrape emails → score → generate email → log. Pas d'envoi reel dans scheduler.
9. **Config** : `autopilotConfig/settings` avec `enabled`, `keywords`, `location`, `sector`, `emailsPerDay`, `pauseWeekends`, `senderName`.
10. **Warmup** : Systeme complet de warmup progressif (5→15→30→60→100 emails) avec round-robin entre comptes.
