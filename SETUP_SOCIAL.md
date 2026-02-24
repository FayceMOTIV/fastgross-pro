# Setup Social Hunters - Face Media Factory

## Architecture

```
Hunters (3 plateformes)
├── Instagram Hunter  → instagrapi (Python) → profils + contacts
├── TikTok Hunter     → tiktok-scraper (Node) → profils + bio parsing
├── Facebook Hunter   → Serper.dev + cheerio → pages publiques
└── Orchestrateur     → coordination + dedup + scoring unifie

Outreach (3 canaux)
├── Instagram DM      → multi-comptes + rotation + delays gaussiens
├── WhatsApp          → Evolution API (self-hosted, gratuit)
└── Email Sequences   → Resend API (multi-etapes)
```

## 1. Instagram Hunter

### Credentials requis

Creer un **compte Instagram dedie** a la prospection (ne pas utiliser un compte personnel).

```bash
# functions/.env
IG_USERNAME=votre_compte_prospection
IG_PASSWORD=votre_mot_de_passe
INSTAGRAM_ENCRYPTION_KEY=cle_aleatoire_de_32_caracteres
```

### Generer la cle de chiffrement

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rate limits (anti-ban)

| Action | Limite | Delai |
|--------|--------|-------|
| Scraping profils | 50/scan | 1s entre chaque |
| DMs par heure | 4/compte | delais gaussiens |
| DMs par jour | 30/compte | pause fatigue toutes les 3 actions |
| Horaires actifs | 7h-23h | aucune activite la nuit |
| Week-end | Desactive | aucune activite samedi/dimanche |

### Multi-comptes

Le systeme supporte jusqu'a 10 comptes Instagram avec rotation automatique. Les mots de passe sont chiffres en AES-256-CBC.

Pour ajouter des comptes : **Hunter > onglet Comptes > Ajouter un compte**

---

## 2. TikTok Hunter

### Aucun credential requis

Le TikTok Hunter utilise `tiktok-scraper` (npm) qui scrape les hashtags publics.

### Configuration optionnelle (Apify)

Pour un scraping plus fiable et a grande echelle :

```bash
# functions/.env
APIFY_API_KEY=votre_cle_apify
```

### Rate limits

| Action | Limite | Delai |
|--------|--------|-------|
| Profils par scan | 50 | 2s entre chaque |
| Scans par jour | 3 hashtags max | execution quotidienne a 10h |

---

## 3. Facebook Hunter

### Aucun token Facebook requis

Le Facebook Hunter utilise **Serper.dev** (deja configure) avec des requetes `site:facebook.com` puis scrape les pages publiques avec cheerio.

```bash
# Deja configure dans functions/.env
SERPER_API_KEY=votre_cle_serper
```

### Quota Serper

- **Plan gratuit** : 2500 recherches/mois
- Le Facebook Hunter utilise ~3 recherches par execution quotidienne
- Budget mensuel : ~90 recherches (3 recherches x 30 jours)

### Rate limits

| Action | Limite | Delai |
|--------|--------|-------|
| Recherches par execution | 3 mots-cles max | - |
| Resultats par recherche | 10 pages max | - |
| Scraping pages | 1 page toutes les 3s | - |

---

## 4. WhatsApp (Evolution API)

### Installation (self-hosted, gratuit)

```bash
# Docker Compose
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=votre_cle_api \
  atendai/evolution-api:latest
```

### Configuration

```bash
# functions/.env
EVOLUTION_API_URL=http://votre-serveur:8080
EVOLUTION_API_KEY=votre_cle_api
EVOLUTION_INSTANCE_NAME=facemedia
```

### Connecter WhatsApp

1. Acceder a `http://votre-serveur:8080/manager`
2. Creer une instance "facemedia"
3. Scanner le QR code avec WhatsApp sur votre telephone
4. L'instance reste connectee tant que le telephone a internet

### Rate limits

| Action | Limite |
|--------|--------|
| Messages par heure | 10 |
| Messages par jour | 50 |
| Verification numeros | 100/batch |

---

## 5. Deploiement

### Deployer les Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Activer les hunters pour une organisation

Dans Firestore, ajouter a `organizations/{orgId}` :

```json
{
  "hunterConfig": {
    "instagramEnabled": true,
    "tiktokEnabled": true,
    "facebookEnabled": true
  }
}
```

### Executions planifiees

| Hunter | Schedule | Timezone |
|--------|----------|----------|
| Instagram | Tous les jours a 9h | Europe/Paris |
| TikTok | Tous les jours a 10h | Europe/Paris |
| Facebook | Tous les jours a 11h | Europe/Paris |
| WhatsApp Checker | Tous les jours a 2h | Europe/Paris |

---

## 6. Tests

```bash
# Lancer les tests (Serper + regex + dedup + scoring)
node scripts/test-social-hunters.mjs

# Le rapport est genere dans SOCIAL_HUNTERS_REPORT.md
```

---

## 7. Risques et precautions

### Instagram

- **Risque de ban** : Instagram detecte l'automatisation. Utiliser des comptes dedies.
- **2FA** : Desactiver la 2FA sur les comptes de prospection ou utiliser les app passwords.
- **Proxy** : En production, utiliser des proxies residentiels pour chaque compte.

### TikTok

- **Risque faible** : Le scraping de hashtags publics est moins surveille.
- **Fallback** : Si tiktok-scraper echoue, les mock data sont retournes.

### Facebook

- **Risque faible** : Utilise Serper (Google) + scraping de pages publiques.
- **Limitation** : Facebook peut bloquer le scraping direct. Les snippets Serper fournissent un fallback.

### WhatsApp

- **Risque moyen** : WhatsApp peut bannir les numeros qui envoient trop de messages.
- **Precautions** : Limites strictes (10/heure, 50/jour). Commencer lentement.
- **Multi-device** : Evolution API utilise le protocole multi-device officiel.
