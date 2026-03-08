---
description: Checklist de deploiement Cloud Functions Firebase
allowed-tools: Bash, Read
---

Execute cette checklist de deploiement pour : $ARGUMENTS

1. Verifier que la region est `europe-west1` dans toutes les fonctions modifiees
2. Verifier `request.auth` dans chaque fonction onCall
3. Verifier que customer_uid est lu depuis `request.auth.uid`
4. Verifier la validation des donnees entrantes
5. Verifier les logs structures (uid, action, timestamp)
6. Lancer `npm run lint` dans functions/
7. Lancer `npm run build` pour confirmer la compilation TypeScript
8. Donner un rapport GO / NO-GO avec les problemes trouves
