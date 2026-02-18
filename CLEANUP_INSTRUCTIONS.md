# INSTRUCTIONS DE CLEANUP - CHANGEMENT DES API KEYS

## CRITIQUE - A FAIRE IMMEDIATEMENT APRES VALIDATION

Les API keys actuelles sont **TEMPORAIRES** et ont ete partagees. Elles doivent etre changees.

---

## PROCEDURE COMPLETE (15 minutes)

### ETAPE 1: Creer de NOUVELLES cles (10 min)

#### Groq
1. Va sur: https://console.groq.com
2. **Supprimer l'ancienne cle** (celle utilisee pour tests)
3. Creer une NOUVELLE cle
4. Copier: `gsk_...`

#### OpenRouter
1. Va sur: https://openrouter.ai
2. Settings > API Keys
3. **Supprimer l'ancienne cle**
4. Creer une NOUVELLE cle
5. Copier: `sk-or-...`

#### Gemini
1. Va sur: https://aistudio.google.com
2. **Supprimer l'ancienne cle**
3. Creer une NOUVELLE cle
4. Copier: `AIzaSy...`

---

### ETAPE 2: Update .env (2 min)

```bash
cd ~/Projects/face-media-factory/functions
nano .env
```

Remplacer les 3 lignes:
```
GROQ_API_KEY=ta_nouvelle_cle_groq
OPENROUTER_API_KEY=ta_nouvelle_cle_openrouter
GEMINI_API_KEY=ta_nouvelle_cle_gemini
```

Save: `Ctrl+O` puis `Enter` puis `Ctrl+X`

---

### ETAPE 3: Redeploy (3 min)

```bash
cd ~/Projects/face-media-factory
firebase deploy --only functions
```

Attendre que toutes les fonctions soient deployees.

---

### ETAPE 4: Verification (2 min)

Test rapide:
```
1. Va sur /app/test-autopilot
2. Click "Lancer le test"
3. Verifie que ca marche toujours
```

---

### ETAPE 5: Cleanup final (1 min)

```bash
# Supprimer les backups de .env avec anciennes cles
cd ~/Projects/face-media-factory/functions
rm -f .env.backup.*

# Verifier
ls -la .env*
```

Tu ne dois voir QUE `.env` (pas de .backup)

---

## CHECKLIST FINALE

- [ ] Anciennes cles supprimees sur Groq
- [ ] Anciennes cles supprimees sur OpenRouter
- [ ] Anciennes cles supprimees sur Gemini
- [ ] Nouvelles cles creees
- [ ] .env mis a jour
- [ ] Functions redeployees
- [ ] Test de verification OK
- [ ] Backups .env supprimes

---

## SECURITE

**Apres ces etapes:**
- Les anciennes cles sont revoquees
- Impossible de les reutiliser
- Nouvelles cles securisees
- Systeme protege

**Si tu ne fais pas ca:**
- Tes cles API sont publiques dans ce chat
- Risque d'utilisation frauduleuse
- Epuisement des quotas gratuits
- Possibles couts non desires

---

**FAIS-LE MAINTENANT !**
