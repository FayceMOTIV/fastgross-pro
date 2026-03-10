# PROMPT ⑥ — SOCIAL SCANNER : 4 PLATEFORMES × 500 USERS
# Face Media Factory — Claude Code Autonomous Execution Prompt
# Date : 10 mars 2026 | ~2 700 lignes | 10 phases

---

## CONTEXTE GLOBAL

Tu travailles sur **Face Media Factory (FMF)**, un SaaS B2B de prospection multicanal pour TPE/PME françaises.

**Stack existant :**
- Frontend : React/Vite/Tailwind dans `~/Projects/face-media-factory/src/`
- Backend : Firebase Cloud Functions (europe-west1) dans `~/Projects/face-media-factory/functions/`
- Firebase project : `face-media-factory`, déployé sur `face-media-factory.web.app`
- VPS Hetzner : `94.130.184.44` (déjà : Evolution API v2.3.7 sur port 8080, microservice Python Intent Hunter)
- Agent Alex : Groq `llama-3.3-70b`
- Channels : WhatsApp (Evolution API), Email (Resend), SMS (OVH)
- ~28+ Cloud Functions déployées en production

**Ce que ce prompt construit :**
Un moteur de scan social qui scrape YouTube, Instagram, Facebook Groups et Telegram pour trouver des prospects TPE/PME françaises. Architecture shared-pool : les workers scannent en boucle, cachent les résultats, et distribuent les leads aux tenants par filtrage mot-clé.

**RÈGLES ABSOLUES :**
1. NE BUILD PAS (`npm run build`) NI DEPLOY (`firebase deploy`) sans instruction explicite
2. Cloud Functions TOUJOURS en `europe-west1`
3. Imports ESM (`import`/`export`) dans les Cloud Functions
4. `FieldValue` importé depuis `firebase-admin/firestore`
5. Variables d'env sensibles dans `functions/.env` (jamais dans le code)
6. CORS : utiliser `ALLOWED_ORIGINS` déjà configuré dans le projet
7. Chaque fichier créé doit être complet et fonctionnel — pas de `// TODO` ni `...`

---

## PHASE 1 — INFRASTRUCTURE VPS : REDIS + STRUCTURE PROJET

### 1.1 — Installer Redis sur le VPS

**⚠️ Le VPS a DÉJÀ Evolution API sur port 8080 et un microservice Python. NE PAS toucher à ces services existants.**

Créer le script d'installation : `~/Projects/face-media-factory/vps/social-scanner/setup-redis.sh`

```bash
#!/bin/bash
# Redis dédié pour BullMQ — ATTENTION : NE PAS installer sur le port par défaut si Redis existe déjà
# Vérifier d'abord : redis-cli ping

set -e

# Installation Redis 7+
sudo apt-get update
sudo apt-get install -y redis-server

# Configuration dédiée BullMQ sur port 6380 (pour éviter conflit si Redis déjà installé)
sudo cp /etc/redis/redis.conf /etc/redis/redis-bullmq.conf

# Appliquer les modifications critiques avec sed
sudo sed -i 's/^port 6379$/port 6380/' /etc/redis/redis-bullmq.conf
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 512mb/' /etc/redis/redis-bullmq.conf
# OBLIGATOIRE pour BullMQ — toute autre policy corrompt les queues
sudo sed -i 's/^# maxmemory-policy noeviction$/maxmemory-policy noeviction/' /etc/redis/redis-bullmq.conf
# Si la ligne n'existait pas en commentaire, l'ajouter
grep -q "^maxmemory-policy" /etc/redis/redis-bullmq.conf || echo "maxmemory-policy noeviction" | sudo tee -a /etc/redis/redis-bullmq.conf
grep -q "^maxmemory 512mb" /etc/redis/redis-bullmq.conf || echo "maxmemory 512mb" | sudo tee -a /etc/redis/redis-bullmq.conf
# Persistence AOF
sudo sed -i 's/^appendonly no$/appendonly yes/' /etc/redis/redis-bullmq.conf
sudo sed -i 's/^# appendfsync everysec$/appendfsync everysec/' /etc/redis/redis-bullmq.conf
# Bind local uniquement
sudo sed -i 's/^bind 127.0.0.1 -::1$/bind 127.0.0.1/' /etc/redis/redis-bullmq.conf
# Mot de passe — CHANGER CETTE VALEUR EN PRODUCTION
echo 'requirepass FMF_REDIS_SECRET_CHANGE_ME' | sudo tee -a /etc/redis/redis-bullmq.conf

# Créer un service systemd dédié
sudo tee /etc/systemd/system/redis-bullmq.service > /dev/null <<EOF
[Unit]
Description=Redis for BullMQ (port 6380)
After=network.target

[Service]
ExecStart=/usr/bin/redis-server /etc/redis/redis-bullmq.conf
Restart=always
User=redis
Group=redis

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable redis-bullmq
sudo systemctl start redis-bullmq
echo "Redis BullMQ démarré sur port 6380"
redis-cli -p 6380 -a FMF_REDIS_SECRET_CHANGE_ME ping

# Vérification que noeviction est bien appliqué (CRITIQUE)
POLICY=$(redis-cli -p 6380 -a FMF_REDIS_SECRET_CHANGE_ME CONFIG GET maxmemory-policy | tail -1)
if [ "$POLICY" != "noeviction" ]; then
  echo "ERREUR CRITIQUE : maxmemory-policy n'est pas noeviction (trouvé: $POLICY)"
  echo "BullMQ va corrompre ses queues. Corriger manuellement."
  exit 1
fi
echo "✅ maxmemory-policy = noeviction confirmé"
```

### 1.2 — Structure du projet Social Scanner sur le VPS

Créer la structure suivante dans `~/Projects/face-media-factory/vps/social-scanner/` :

```
vps/social-scanner/
├── package.json
├── .env                          ← Variables d'env (ne pas committer)
├── .env.example
├── setup-redis.sh
├── requirements.txt              ← Dépendances Python (instagrapi)
├── src/
│   ├── index.js                  ← Entry point principal
│   ├── config.js                 ← Configuration centralisée
│   ├── queues/
│   │   └── socialQueueManager.js ← BullMQ orchestration
│   ├── scanners/
│   │   ├── youtubeScanner.js     ← Node.js, googleapis
│   │   ├── instagramScanner.py   ← Python, instagrapi
│   │   ├── instagramBridge.js    ← Node.js bridge vers le script Python
│   │   ├── facebookScanner.js    ← Node.js, Playwright
│   │   └── telegramScanner.js    ← Node.js, GramJS (telegram npm)
│   ├── utils/
│   │   ├── proxyManager.js       ← Rotation résidentiel/datacenter
│   │   ├── accountPoolManager.js ← Gestion comptes IG/FB/TG
│   │   ├── crossPlatformDeduplicator.js ← 5-stage cascade
│   │   ├── leadScorer.js         ← Scoring composite 0-100
│   │   ├── frenchPhoneNormalizer.js ← E.164 normalization
│   │   └── frenchBusinessNormalizer.js ← Strip SARL/SAS, accents, articles
│   └── api/
│       └── webhookServer.js      ← Express server pour recevoir les triggers Firebase
```

### 1.3 — package.json du Social Scanner

Créer `vps/social-scanner/package.json` :

```json
{
  "name": "fmf-social-scanner",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "worker:youtube": "node src/scanners/youtubeScanner.js",
    "worker:instagram": "node src/scanners/instagramBridge.js",
    "worker:facebook": "node src/scanners/facebookScanner.js",
    "worker:telegram": "node src/scanners/telegramScanner.js"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "googleapis": "^130.0.0",
    "telegram": "^2.22.0",
    "playwright": "^1.40.0",
    "express": "^4.18.0",
    "bottleneck": "^2.19.5",
    "opossum": "^8.1.0",
    "libphonenumber-js": "^1.10.0",
    "string-similarity": "^4.0.4",
    "crypto-js": "^4.2.0",
    "dotenv": "^16.3.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0"
  }
}
```

### 1.4 — requirements.txt pour Python (Instagram)

Créer `vps/social-scanner/requirements.txt` :

```
instagrapi==2.3.0
Pillow>=9.0.0
```

### 1.5 — Configuration centralisée

Créer `vps/social-scanner/src/config.js` :

```javascript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  redis: {
    host: '127.0.0.1',
    port: 6380,
    password: process.env.REDIS_PASSWORD || '',
    maxRetriesPerRequest: null, // Required by BullMQ
  },

  vps: {
    port: parseInt(process.env.SCANNER_PORT || '8090'),
    webhookSecret: process.env.VPS_WEBHOOK_SECRET,
  },

  firebase: {
    webhookUrl: process.env.FIREBASE_WEBHOOK_URL, // https://europe-west1-face-media-factory.cloudfunctions.net/receiveSocialLeads
  },

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    quotaPerDay: 10000,
    cacheTTLSeconds: 86400, // 24h
    searchCacheTTLSeconds: 21600, // 6h
  },

  instagram: {
    accounts: JSON.parse(process.env.INSTAGRAM_ACCOUNTS || '[]'),
    // Format: [{"username":"x","password":"y","proxy":"http://..."}]
    maxProfilesPerHour: 40,
    maxProfilesPerDay: 300,
    delayMinMs: 1000,
    delayMaxMs: 3000,
    profileViewDelayMinMs: 3000,
    profileViewDelayMaxMs: 7000,
  },

  facebook: {
    accounts: JSON.parse(process.env.FACEBOOK_ACCOUNTS || '[]'),
    // Format: [{"email":"x","password":"y","cookies":"..."}]
    maxGroupVisitsPerDay: 150,
    delayBetweenGroupsMs: 180000, // 3 min
    scrollsPerGroup: 4,
    browserConcurrency: 3,
  },

  telegram: {
    sessions: JSON.parse(process.env.TELEGRAM_SESSIONS || '[]'),
    // Format: [{"apiId":123,"apiHash":"x","stringSession":"encrypted_base64"}]
    encryptionKey: process.env.TELEGRAM_ENCRYPTION_KEY,
    maxGroupsPerAccount: 450, // safe limit below 500
  },

  proxy: {
    residentialUrl: process.env.PROXY_RESIDENTIAL_URL, // IPRoyal socks5://user:pass@gate.iproyal.com:12321
    datacenterUrl: process.env.PROXY_DATACENTER_URL,   // Webshare
    stickySessionMinutes: 15,
  },

  sirene: {
    baseUrl: 'https://recherche-entreprises.api.gouv.fr',
    maxRequestsPerSecond: 7,
  },

  tenantTiers: {
    free:  { scansPerDay: 4,  platforms: 2, priority: 15 },
    basic: { scansPerDay: 24, platforms: 4, priority: 5  },
    pro:   { scansPerDay: 96, platforms: 4, priority: 1  },
  },

  buyingSignalKeywords: [
    'cherche', 'je cherche', 'besoin de', 'besoin d\'un',
    'qui connaît', 'qui connait', 'recommandation', 'recommandez',
    'devis', 'quelqu\'un peut', 'conseil pour', 'quel logiciel',
    'quel outil', 'vous utilisez quoi', 'tarif', 'combien coûte',
    'on recrute', 'recherche prestataire', 'cherche fournisseur',
    'ouverture', 'nouveau restaurant', 'nouveau salon',
    'travaux', 'rénovation', 'refonte site',
  ],

  frenchHashtags: [
    'restaurant', 'restauration', 'chef', 'gastronomie',
    'artisan', 'artisanat', 'plombier', 'electricien',
    'coiffeur', 'coiffure', 'esthetique', 'beaute',
    'boulangerie', 'patisserie', 'boulanger',
    'commercelocal', 'petitcommerce', 'entreprendre',
    'autoentrepreneur', 'freelance', 'independant',
    'ouverture', 'nouveaurestaurant', 'nouveausalon',
    'onrecrute', 'recrutement', 'cherchefournisseur',
  ],
};
```

### 1.6 — Fichier .env template

Créer `vps/social-scanner/.env.example` :

```env
# Redis
REDIS_PASSWORD=FMF_REDIS_SECRET_CHANGE_ME

# Server
SCANNER_PORT=8090
VPS_WEBHOOK_SECRET=your_webhook_secret_here

# Firebase
FIREBASE_WEBHOOK_URL=https://europe-west1-face-media-factory.cloudfunctions.net/receiveSocialLeads

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# Instagram — JSON array of accounts
INSTAGRAM_ACCOUNTS=[{"username":"ig_account_1","password":"pass1","proxy":"socks5://user:pass@fr.iproyal.com:12321"}]

# Facebook — JSON array of accounts
FACEBOOK_ACCOUNTS=[{"email":"fb_account_1@example.com","password":"pass1","cookies":""}]

# Telegram — JSON array of encrypted sessions
TELEGRAM_SESSIONS=[{"apiId":12345,"apiHash":"abc123","stringSession":"encrypted_aes256_base64"}]
TELEGRAM_ENCRYPTION_KEY=your_32_char_encryption_key_here

# Proxies
PROXY_RESIDENTIAL_URL=socks5://user:pass@fr.iproyal.com:12321
PROXY_DATACENTER_URL=http://user:pass@proxy.webshare.io:80
```

---

## PHASE 2 — UTILITAIRES PARTAGÉS

### 2.1 — Proxy Manager

Créer `vps/social-scanner/src/utils/proxyManager.js` :

```javascript
import { config } from '../config.js';
import { createLogger } from 'winston';

const logger = createLogger({ level: 'info' });

// Sticky sessions par account ID pour maintenir l'IP pendant un scan complet
const stickySessions = new Map(); // accountId → { proxy, assignedAt }

export class ProxyManager {
  /**
   * Retourne le proxy adapté à la plateforme
   * YouTube = pas de proxy (API officielle)
   * Instagram/Facebook = résidentiel obligatoire
   * Telegram = datacenter OK ou direct
   */
  static getProxy(platform, accountId = null) {
    switch (platform) {
      case 'youtube':
        return null; // API officielle, pas de proxy

      case 'instagram':
      case 'facebook':
        return this._getResidentialProxy(accountId);

      case 'telegram':
        return config.proxy.datacenterUrl || null;

      default:
        return null;
    }
  }

  static _getResidentialProxy(accountId) {
    if (!config.proxy.residentialUrl) {
      logger.warn('No residential proxy configured — Instagram/Facebook will fail');
      return null;
    }

    if (accountId) {
      const existing = stickySessions.get(accountId);
      const stickyMs = config.proxy.stickySessionMinutes * 60 * 1000;

      if (existing && (Date.now() - existing.assignedAt) < stickyMs) {
        return existing.proxy;
      }

      // Nouvelle session sticky — ajouter un session ID aléatoire pour IPRoyal
      const sessionId = `fmf_${accountId}_${Date.now()}`;
      const proxyWithSession = config.proxy.residentialUrl.includes('?')
        ? `${config.proxy.residentialUrl}&session=${sessionId}`
        : `${config.proxy.residentialUrl}?session=${sessionId}&country=fr`;

      stickySessions.set(accountId, { proxy: proxyWithSession, assignedAt: Date.now() });
      return proxyWithSession;
    }

    return config.proxy.residentialUrl;
  }

  static cleanExpiredSessions() {
    const stickyMs = config.proxy.stickySessionMinutes * 60 * 1000;
    const now = Date.now();
    for (const [key, val] of stickySessions.entries()) {
      if (now - val.assignedAt > stickyMs) {
        stickySessions.delete(key);
      }
    }
  }
}

// Nettoyage toutes les 5 minutes
setInterval(() => ProxyManager.cleanExpiredSessions(), 5 * 60 * 1000);
```

### 2.2 — Account Pool Manager

Créer `vps/social-scanner/src/utils/accountPoolManager.js` :

```javascript
import { config } from '../config.js';
import Redis from 'ioredis';

const redis = new Redis({ ...config.redis });

/**
 * Gestion LRU des comptes de scraping pour Instagram, Facebook, Telegram.
 * Chaque compte a un statut : active | challenged | banned | cooling
 * Rotation LRU (least recently used) — PAS round-robin.
 */
export class AccountPoolManager {
  /**
   * Récupère le prochain compte disponible (LRU) pour une plateforme
   * @param {string} platform - 'instagram' | 'facebook' | 'telegram'
   * @returns {object|null} - Le compte ou null si aucun disponible
   */
  static async getNextAccount(platform) {
    const key = `account_pool:${platform}`;
    const accounts = await this._getAccounts(platform);

    if (accounts.length === 0) return null;

    // Trouver le compte utilisé le moins récemment qui est actif
    let bestAccount = null;
    let oldestUsedAt = Infinity;

    for (const account of accounts) {
      const statusKey = `account_status:${platform}:${account.id || account.username || account.email}`;
      const statusRaw = await redis.get(statusKey);
      const status = statusRaw ? JSON.parse(statusRaw) : { state: 'active', lastUsedAt: 0 };

      if (status.state !== 'active') continue;

      // Vérifier cooldown : pas plus de X requêtes dans la dernière heure
      const hourKey = `account_hourly:${platform}:${account.id || account.username || account.email}`;
      const hourCount = parseInt(await redis.get(hourKey) || '0');
      const maxPerHour = platform === 'instagram' ? config.instagram.maxProfilesPerHour : 100;

      if (hourCount >= maxPerHour) continue;

      if (status.lastUsedAt < oldestUsedAt) {
        oldestUsedAt = status.lastUsedAt;
        bestAccount = account;
      }
    }

    if (!bestAccount) return null;

    // Marquer comme utilisé
    const id = bestAccount.id || bestAccount.username || bestAccount.email;
    const statusKey = `account_status:${platform}:${id}`;
    await redis.set(statusKey, JSON.stringify({ state: 'active', lastUsedAt: Date.now() }));

    const hourKey = `account_hourly:${platform}:${id}`;
    await redis.incr(hourKey);
    await redis.expire(hourKey, 3600); // TTL 1h

    return bestAccount;
  }

  /**
   * Marquer un compte comme challengé/banni
   */
  static async markAccount(platform, accountId, state) {
    const statusKey = `account_status:${platform}:${accountId}`;
    const cooldownSeconds = state === 'challenged' ? 86400 : 0; // 24h cooling pour challenged

    await redis.set(statusKey, JSON.stringify({
      state,
      lastUsedAt: Date.now(),
      markedAt: Date.now(),
    }));

    if (state === 'cooling') {
      // Auto-réactiver après 1h de cooling
      await redis.set(`account_cooldown:${platform}:${accountId}`, '1', 'EX', 3600);
    }
  }

  /**
   * Récupère la liste des comptes depuis la config ou Redis
   */
  static async _getAccounts(platform) {
    switch (platform) {
      case 'instagram':
        return config.instagram.accounts.map((a, i) => ({ ...a, id: a.username || `ig_${i}` }));
      case 'facebook':
        return config.facebook.accounts.map((a, i) => ({ ...a, id: a.email || `fb_${i}` }));
      case 'telegram':
        return config.telegram.sessions.map((a, i) => ({ ...a, id: `tg_${i}` }));
      default:
        return [];
    }
  }

  /**
   * Statut global du pool pour monitoring
   */
  static async getPoolStatus(platform) {
    const accounts = await this._getAccounts(platform);
    const statuses = { active: 0, challenged: 0, banned: 0, cooling: 0 };

    for (const account of accounts) {
      const id = account.id || account.username || account.email;
      const statusKey = `account_status:${platform}:${id}`;
      const statusRaw = await redis.get(statusKey);
      const status = statusRaw ? JSON.parse(statusRaw) : { state: 'active' };
      statuses[status.state] = (statuses[status.state] || 0) + 1;
    }

    return { total: accounts.length, ...statuses };
  }
}
```

### 2.3 — French Phone Normalizer

Créer `vps/social-scanner/src/utils/frenchPhoneNormalizer.js` :

```javascript
import { parsePhoneNumber } from 'libphonenumber-js';

/**
 * Normalise tous les formats français vers E.164 (+33XXXXXXXXX)
 * Gère : 06 12 34 56 78, +33612345678, 0033 1 42 34 56 78, 06.12.34.56.78, 07-89-01-23-45
 */
export function normalizeFrenchPhone(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim()
    .replace(/[\s.\-\/()]/g, '')
    .replace(/^0033/, '+33')
    .replace(/^33(?!\+)/, '+33');

  if (/^0[1-9]/.test(cleaned)) {
    cleaned = '+33' + cleaned.substring(1);
  }

  try {
    const phone = parsePhoneNumber(cleaned, 'FR');
    if (phone && phone.isValid()) {
      return phone.format('E.164');
    }
  } catch (e) {
    // Numéro invalide
  }

  return null;
}
```

### 2.4 — French Business Name Normalizer

Créer `vps/social-scanner/src/utils/frenchBusinessNormalizer.js` :

```javascript
const LEGAL_FORMS = [
  'sarl', 'sas', 'sasu', 'eurl', 'sci', 'sa', 'snc',
  'sca', 'scs', 'eirl', 'ei', 'auto-entrepreneur',
  'micro-entreprise', 'association',
];

const ARTICLES = ['le', 'la', 'les', 'du', 'de', 'des', 'l\'', 'un', 'une', 'au', 'aux'];

const ACCENT_MAP = {
  'à': 'a', 'â': 'a', 'ä': 'a', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'î': 'i', 'ï': 'i', 'ô': 'o', 'ö': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ÿ': 'y', 'ç': 'c', 'œ': 'oe', 'æ': 'ae',
};

/**
 * Normalise un nom d'entreprise française pour le fuzzy matching
 * "Le Petit Boulanger SARL" → "petit boulanger"
 * "Café de la Gare SAS" → "cafe gare"
 */
export function normalizeBusinessName(name) {
  if (!name || typeof name !== 'string') return '';

  let normalized = name.toLowerCase().trim();

  // Supprimer les formes juridiques
  for (const form of LEGAL_FORMS) {
    const regex = new RegExp(`\\b${form}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Supprimer les articles
  for (const article of ARTICLES) {
    const regex = new RegExp(`\\b${article}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }

  // Supprimer les accents
  normalized = normalized.split('').map(c => ACCENT_MAP[c] || c).join('');

  // Supprimer la ponctuation et normaliser les espaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extrait le domaine d'une URL
 */
export function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}
```

### 2.5 — Cross-Platform Deduplicator

Créer `vps/social-scanner/src/utils/crossPlatformDeduplicator.js` :

```javascript
import { normalizeFrenchPhone } from './frenchPhoneNormalizer.js';
import { normalizeBusinessName, extractDomain } from './frenchBusinessNormalizer.js';
import { compareTwoStrings } from 'string-similarity';
import Bottleneck from 'bottleneck';

// Rate limiter pour l'API SIRENE : 7 req/sec max
const sireneLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 150 });

/**
 * Cascade de déduplication en 5 étapes, par confiance décroissante.
 * Retourne le lead existant matché ou null.
 */
export class CrossPlatformDeduplicator {
  constructor(existingLeads) {
    this.existingLeads = existingLeads; // Array de leads déjà connus

    // Index pour recherche rapide
    this.emailIndex = new Map();     // email normalisé → lead
    this.phoneIndex = new Map();     // phone E.164 → lead
    this.siretIndex = new Map();     // SIRET → lead
    this.domainIndex = new Map();    // domaine → lead
    this.nameCityIndex = new Map();  // "nom_normalisé|ville" → lead

    this._buildIndexes();
  }

  _buildIndexes() {
    for (const lead of this.existingLeads) {
      if (lead.emailNormalized) {
        this.emailIndex.set(lead.emailNormalized, lead);
      }
      if (lead.phoneE164) {
        this.phoneIndex.set(lead.phoneE164, lead);
      }
      if (lead.siret) {
        this.siretIndex.set(lead.siret, lead);
      }
      if (lead.domainNormalized) {
        this.domainIndex.set(lead.domainNormalized, lead);
      }
      if (lead.nameNormalized && lead.city) {
        this.nameCityIndex.set(`${lead.nameNormalized}|${lead.city.toLowerCase()}`, lead);
      }
    }
  }

  /**
   * Cherche un match pour un nouveau lead dans les leads existants
   * @returns {{ match: object|null, confidence: number, method: string }}
   */
  async findMatch(newLead) {
    // Étape 1 : Email exact (confiance 1.0)
    if (newLead.email) {
      const emailNorm = newLead.email.toLowerCase().trim();
      const match = this.emailIndex.get(emailNorm);
      if (match) return { match, confidence: 1.0, method: 'email_exact' };
    }

    // Étape 2 : Téléphone E.164 exact (confiance 0.95)
    if (newLead.phone) {
      const phoneNorm = normalizeFrenchPhone(newLead.phone);
      if (phoneNorm) {
        const match = this.phoneIndex.get(phoneNorm);
        if (match) return { match, confidence: 0.95, method: 'phone_exact' };
      }
    }

    // Étape 3 : SIRET via SIRENE (confiance 0.99)
    if (newLead.businessName && newLead.city) {
      const siret = await this._lookupSIRENE(newLead.businessName, newLead.city, newLead.postalCode);
      if (siret) {
        const match = this.siretIndex.get(siret);
        if (match) return { match, confidence: 0.99, method: 'siret_sirene' };
        // Pas de match existant mais on a trouvé le SIRET — l'attacher au nouveau lead
        newLead.siret = siret;
      }
    }

    // Étape 4 : Domaine web exact (confiance 0.90)
    if (newLead.website) {
      const domain = extractDomain(newLead.website);
      if (domain) {
        const match = this.domainIndex.get(domain);
        if (match) return { match, confidence: 0.90, method: 'domain_exact' };
      }
    }

    // Étape 5 : Nom fuzzy + ville (confiance variable, seuil 0.85)
    if (newLead.businessName && newLead.city) {
      const nameNorm = normalizeBusinessName(newLead.businessName);
      const cityNorm = newLead.city.toLowerCase().trim();

      for (const [key, existingLead] of this.nameCityIndex.entries()) {
        const [existingName, existingCity] = key.split('|');

        if (existingCity !== cityNorm) continue;

        // Score composite : 60% Dice coefficient + 40% inclusion check
        const diceScore = compareTwoStrings(nameNorm, existingName);
        const inclusionBonus = (nameNorm.includes(existingName) || existingName.includes(nameNorm)) ? 0.15 : 0;
        const compositeScore = diceScore * 0.85 + inclusionBonus;

        if (compositeScore >= 0.80) {
          return { match: existingLead, confidence: Math.min(0.95, 0.75 + compositeScore * 0.2), method: 'fuzzy_name_city' };
        }
      }
    }

    return { match: null, confidence: 0, method: 'none' };
  }

  /**
   * Lookup SIRENE API gratuite pour résoudre un nom + ville en SIRET
   */
  async _lookupSIRENE(businessName, city, postalCode) {
    try {
      const query = encodeURIComponent(businessName);
      const params = postalCode ? `code_postal=${postalCode}` : `commune=${encodeURIComponent(city)}`;
      const url = `https://recherche-entreprises.api.gouv.fr/search?q=${query}&${params}&per_page=3`;

      const result = await sireneLimiter.schedule(async () => {
        const res = await fetch(url);
        if (!res.ok) return null;
        return res.json();
      });

      if (result && result.results && result.results.length > 0) {
        const best = result.results[0];
        const nameScore = compareTwoStrings(
          normalizeBusinessName(businessName),
          normalizeBusinessName(best.nom_complet || '')
        );

        // Seulement si le nom matche assez bien
        if (nameScore >= 0.6 && best.siege && best.siege.siret) {
          return best.siege.siret;
        }
      }
    } catch (err) {
      // SIRENE API down — on continue sans SIRET
    }

    return null;
  }
}
```

### 2.6 — Lead Scorer

Créer `vps/social-scanner/src/utils/leadScorer.js` :

```javascript
/**
 * Scoring composite 0-100 d'un lead social
 * Grade A (80+) = contacter dans 4h
 * Grade B (60-79) = contacter dans 24h
 * Grade C (35-59) = nurture
 * Grade D (<35) = early stage
 */
export function calculateLeadScore(lead) {
  let score = 0;

  // Contact completeness (max 35)
  if (lead.email) score += 20;
  if (lead.phone) score += 15;

  // Cross-platform presence (max 25)
  const platformCount = Object.keys(lead.platforms || {}).length;
  if (platformCount >= 1) score += 5;
  if (platformCount >= 2) score += 10;
  if (platformCount >= 3) score += 10;
  if (lead.website) score += 5;

  // Buying signals (max 30)
  const signals = lead.buyingSignals || {};
  if (signals.requestedQuote || signals.requestedService) score += 30;
  else if (signals.askedRecommendation) score += 20;
  else if (signals.askedQuestion || signals.postedNeed) score += 15;
  else if (signals.newOpening || signals.hiring) score += 10;

  // Business verification (max 20)
  if (lead.siret) score += 15;
  if (lead.nafCode) score += 5;

  // Recency decay
  if (lead.lastActivityAt) {
    const daysSince = (Date.now() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 90) score *= 0.5;
    else if (daysSince > 30) score *= 0.75;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    grade: finalScore >= 80 ? 'A' : finalScore >= 60 ? 'B' : finalScore >= 35 ? 'C' : 'D',
  };
}
```

---

## PHASE 3 — BULLMQ QUEUE MANAGER

Créer `vps/social-scanner/src/queues/socialQueueManager.js` :

```javascript
import { Queue, Worker } from 'bullmq';
import CircuitBreaker from 'opossum';
import { config } from '../config.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// Note : QueueScheduler supprimé dans BullMQ v5+ (intégré dans Worker)
// Note : FlowProducer disponible si besoin de dépendances entre jobs (non utilisé actuellement)

// ━━━ 7 QUEUES ━━━
export const queues = {
  youtube:    new Queue('scan:youtube',   { connection: { ...config.redis } }),
  instagram:  new Queue('scan:instagram', { connection: { ...config.redis } }),
  facebook:   new Queue('scan:facebook',  { connection: { ...config.redis } }),
  telegram:   new Queue('scan:telegram',  { connection: { ...config.redis } }),
  enrich:     new Queue('enrich:all',     { connection: { ...config.redis } }),
  notify:     new Queue('notify:all',     { connection: { ...config.redis } }),
  deadLetter: new Queue('dead-letter:all', { connection: { ...config.redis } }),
};

// ━━━ CIRCUIT BREAKERS PAR PLATEFORME ━━━
const circuitOptions = {
  timeout: 60000,              // 60s timeout par opération
  errorThresholdPercentage: 50, // Ouvre à 50% d'erreurs
  resetTimeout: 300000,        // Réessaie après 5 min
  volumeThreshold: 5,          // Minimum 5 requêtes avant d'évaluer
};

export const circuitBreakers = {
  youtube:   new CircuitBreaker(async (fn) => fn(), { ...circuitOptions, name: 'youtube' }),
  instagram: new CircuitBreaker(async (fn) => fn(), { ...circuitOptions, name: 'instagram' }),
  facebook:  new CircuitBreaker(async (fn) => fn(), { ...circuitOptions, name: 'facebook' }),
  telegram:  new CircuitBreaker(async (fn) => fn(), { ...circuitOptions, name: 'telegram' }),
};

// Log circuit state changes
for (const [name, breaker] of Object.entries(circuitBreakers)) {
  breaker.on('open', () => logger.warn(`Circuit OPEN: ${name} — pausing jobs`));
  breaker.on('halfOpen', () => logger.info(`Circuit HALF-OPEN: ${name} — testing`));
  breaker.on('close', () => logger.info(`Circuit CLOSED: ${name} — resumed`));
}

/**
 * Dispatcher un scan social pour un tenant
 * @param {string} tenantId
 * @param {string} platform - 'youtube' | 'instagram' | 'facebook' | 'telegram'
 * @param {object} scanConfig - { keywords, hashtags, locations, niches }
 * @param {number} priority - 1 (urgent) à 15 (low)
 */
export async function dispatchScan(tenantId, platform, scanConfig, priority = 5) {
  const queue = queues[platform];
  if (!queue) throw new Error(`Unknown platform: ${platform}`);

  // Vérifier que le circuit n'est pas ouvert
  const breaker = circuitBreakers[platform];
  if (breaker.opened) {
    logger.warn(`Circuit open for ${platform}, delaying scan for tenant ${tenantId}`);
    // Ajouter avec un délai de 5 minutes
    await queue.add(`scan-${tenantId}`, {
      tenantId,
      platform,
      scanConfig,
      scheduledAt: Date.now(),
    }, {
      priority,
      delay: 300000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: { age: 86400 },    // Garder 24h
      removeOnFail: { age: 604800 },       // Garder 7 jours pour debug
    });
    return;
  }

  await queue.add(`scan-${tenantId}`, {
    tenantId,
    platform,
    scanConfig,
    scheduledAt: Date.now(),
  }, {
    priority,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  });

  logger.info(`Dispatched ${platform} scan for tenant ${tenantId} with priority ${priority}`);
}

/**
 * Envoyer un lead enrichi vers la queue d'enrichissement
 */
export async function dispatchEnrichment(lead) {
  await queues.enrich.add('enrich-lead', lead, {
    priority: 10,
    attempts: 2,
    backoff: { type: 'fixed', delay: 30000 },
    removeOnComplete: { age: 43200 },
  });
}

/**
 * Envoyer une notification (nouveau lead trouvé)
 */
export async function dispatchNotification(tenantId, lead) {
  await queues.notify.add('new-lead', { tenantId, lead }, {
    priority: 1,
    attempts: 3,
    removeOnComplete: { age: 3600 },
  });
}

/**
 * Move un job failed vers la dead letter queue
 */
export async function moveToDeadLetter(job, error) {
  await queues.deadLetter.add('failed-job', {
    originalQueue: job.queueName,
    jobData: job.data,
    error: error.message,
    failedAt: Date.now(),
    attemptsMade: job.attemptsMade,
  }, {
    removeOnComplete: false, // Garder indéfiniment pour review
  });
}

/**
 * Statistiques des queues pour le monitoring
 */
export async function getQueueStats() {
  const stats = {};

  for (const [name, queue] of Object.entries(queues)) {
    const counts = await queue.getJobCounts('active', 'completed', 'delayed', 'failed', 'waiting');
    const breaker = circuitBreakers[name];

    stats[name] = {
      ...counts,
      circuitState: breaker ? (breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed') : 'n/a',
    };
  }

  return stats;
}
```

---

## PHASE 4 — YOUTUBE SCANNER

Créer `vps/social-scanner/src/scanners/youtubeScanner.js` :

```javascript
import { google } from 'googleapis';
import Redis from 'ioredis';
import Bottleneck from 'bottleneck';
import { config } from '../config.js';
import { dispatchEnrichment } from '../queues/socialQueueManager.js';
import { circuitBreakers } from '../queues/socialQueueManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const redis = new Redis({ ...config.redis });
const youtube = google.youtube({ version: 'v3', auth: config.youtube.apiKey });

// Rate limiter : 5 req/sec pour rester sous le radar
const limiter = new Bottleneck({ maxConcurrent: 3, minTime: 200 });

// Tracker de quota quotidien
let dailyQuotaUsed = 0;
const QUOTA_LIMIT = config.youtube.quotaPerDay;

// Reset à minuit Pacific Time (UTC-8)
function resetQuotaAtMidnightPT() {
  const now = new Date();
  const ptOffset = -8 * 60;
  const ptNow = new Date(now.getTime() + (now.getTimezoneOffset() + ptOffset) * 60000);
  const nextMidnight = new Date(ptNow);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  const msUntilReset = nextMidnight.getTime() - ptNow.getTime();

  setTimeout(() => {
    dailyQuotaUsed = 0;
    logger.info('YouTube quota reset at midnight PT');
    resetQuotaAtMidnightPT(); // Programmer le prochain reset
  }, msUntilReset);
}
resetQuotaAtMidnightPT();

function checkQuota(cost) {
  if (dailyQuotaUsed + cost > QUOTA_LIMIT) {
    throw new Error(`YouTube quota exhausted: ${dailyQuotaUsed}/${QUOTA_LIMIT} used`);
  }
  dailyQuotaUsed += cost;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+33|0033|0)\s*[1-9](?:[\s.\-]?\d{2}){4}/g;
const WEBSITE_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9\-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/g;

/**
 * Scanner YouTube pour un tenant
 * Stratégie : chercher des chaînes françaises par niche+ville, extraire emails/phones, détecter buying signals dans les commentaires
 */
export async function scanYouTube(jobData) {
  const { tenantId, scanConfig } = jobData;
  const { keywords = [], locations = [], niches = [] } = scanConfig;
  const leads = [];

  // Construire les queries de recherche : niche × ville
  const searchQueries = [];
  for (const niche of niches.slice(0, 10)) { // Max 10 niches
    for (const location of locations.slice(0, 5)) { // Max 5 villes
      searchQueries.push(`${niche} ${location}`);
    }
  }
  // Ajouter les keywords custom
  for (const kw of keywords.slice(0, 10)) {
    searchQueries.push(kw);
  }

  // Phase A : Recherche de chaînes (100 unités par appel)
  const channelIds = new Set();

  for (const query of searchQueries.slice(0, 20)) { // Max 20 recherches = 2000 unités
    const cacheKey = `yt_search:${Buffer.from(query).toString('base64')}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const cachedIds = JSON.parse(cached);
      cachedIds.forEach(id => channelIds.add(id));
      continue;
    }

    try {
      checkQuota(100);
      const result = await limiter.schedule(() =>
        circuitBreakers.youtube.fire(async () =>
          youtube.search.list({
            part: ['snippet'],
            q: query,
            type: ['channel'],
            regionCode: 'FR',
            relevanceLanguage: 'fr',
            maxResults: 50,
          })
        )
      );

      const ids = (result.data.items || []).map(item => item.snippet.channelId).filter(Boolean);
      ids.forEach(id => channelIds.add(id));

      // Cache 6h
      await redis.set(cacheKey, JSON.stringify(ids), 'EX', config.youtube.searchCacheTTLSeconds);
    } catch (err) {
      if (err.message.includes('quota')) {
        logger.warn(`YouTube quota exhausted during search for tenant ${tenantId}`);
        break;
      }
      logger.error(`YouTube search error for "${query}": ${err.message}`);
    }
  }

  // Phase B : Détails des chaînes par batch de 50 (1 unité par batch)
  const channelIdArray = [...channelIds];
  const channelDetails = [];

  for (let i = 0; i < channelIdArray.length; i += 50) {
    const batch = channelIdArray.slice(i, i + 50);
    const cacheKey = `yt_channels:${batch.sort().join(',').substring(0, 100)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      channelDetails.push(...JSON.parse(cached));
      continue;
    }

    try {
      checkQuota(1);
      const result = await limiter.schedule(() =>
        circuitBreakers.youtube.fire(async () =>
          youtube.channels.list({
            part: ['snippet', 'brandingSettings', 'statistics'],
            id: batch.join(','),
          })
        )
      );

      const items = result.data.items || [];
      channelDetails.push(...items);
      await redis.set(cacheKey, JSON.stringify(items), 'EX', config.youtube.cacheTTLSeconds);
    } catch (err) {
      if (err.message.includes('quota')) break;
      logger.error(`YouTube channels.list error: ${err.message}`);
    }
  }

  // Phase C : Extraire les leads des descriptions
  for (const channel of channelDetails) {
    const description = channel.snippet?.description || '';
    const brandDescription = channel.brandingSettings?.channel?.description || '';
    const fullText = `${description} ${brandDescription}`;

    const emails = fullText.match(EMAIL_REGEX) || [];
    const phones = fullText.match(PHONE_REGEX) || [];
    const websites = fullText.match(WEBSITE_REGEX) || [];

    // Filtrer les emails non-business (gmail, yahoo, etc.)
    const businessEmails = emails.filter(e =>
      !e.match(/@(gmail|yahoo|hotmail|outlook|live|aol|icloud|orange|free|sfr|wanadoo|laposte)\./i)
    );

    if (businessEmails.length > 0 || phones.length > 0 || websites.length > 0) {
      const lead = {
        source: 'youtube',
        platform: 'youtube',
        platformId: channel.id,
        businessName: channel.snippet?.title || '',
        description: description.substring(0, 500),
        email: businessEmails[0] || emails[0] || null,
        phone: phones[0] || null,
        website: websites[0] || null,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        channelUrl: `https://youtube.com/channel/${channel.id}`,
        detectedAt: new Date().toISOString(),
        tenantId,
      };

      leads.push(lead);
    }
  }

  // Phase D : Envoyer les leads vers la queue d'enrichissement
  for (const lead of leads) {
    await dispatchEnrichment(lead);
  }

  logger.info(`YouTube scan complete for tenant ${tenantId}: ${leads.length} leads found, ${dailyQuotaUsed}/${QUOTA_LIMIT} quota used`);

  return { leadsFound: leads.length, quotaUsed: dailyQuotaUsed };
}
```

---

## PHASE 5 — INSTAGRAM SCANNER (PYTHON + NODE BRIDGE)

### 5.1 — Script Python Instagram

Créer `vps/social-scanner/src/scanners/instagramScanner.py` :

```python
#!/usr/bin/env python3
"""
Instagram Scanner pour FMF — instagrapi v2.3.0
Reçoit des commandes JSON sur stdin, retourne des résultats JSON sur stdout.
Protocol : une ligne JSON par commande, une ligne JSON par réponse.
"""
import sys
import json
import time
import random
import os
from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired, ChallengeRequired, FeedbackRequired,
    PleaseWaitFewMinutes, ClientError
)

class InstagramScanner:
    def __init__(self):
        self.clients = {}  # username → Client instance

    def login(self, username, password, proxy=None, session_path=None):
        """Login ou restauration de session"""
        cl = Client()
        cl.delay_range = [1, 3]

        if proxy:
            cl.set_proxy(proxy)

        # Essayer de charger la session existante
        if session_path and os.path.exists(session_path):
            try:
                cl.load_settings(session_path)
                cl.login(username, password)
                cl.get_timeline_feed()  # Valider la session
                self.clients[username] = cl
                return {"status": "ok", "method": "session_restore"}
            except Exception:
                pass  # Session expirée, login classique

        try:
            cl.login(username, password)
            if session_path:
                cl.dump_settings(session_path)
            self.clients[username] = cl
            return {"status": "ok", "method": "fresh_login"}
        except ChallengeRequired:
            return {"status": "challenge_required", "username": username}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def search_hashtag(self, username, hashtag, max_results=30):
        """Recherche de posts récents par hashtag"""
        cl = self.clients.get(username)
        if not cl:
            return {"status": "error", "error": "Not logged in"}

        try:
            medias = cl.hashtag_medias_recent(hashtag, amount=max_results)
            results = []
            for media in medias:
                user = media.user
                results.append({
                    "user_id": str(user.pk),
                    "username": user.username,
                    "full_name": user.full_name or "",
                    "media_id": str(media.pk),
                    "caption": (media.caption_text or "")[:500],
                    "taken_at": media.taken_at.isoformat() if media.taken_at else None,
                    "location": {
                        "name": media.location.name if media.location else None,
                        "lat": media.location.lat if media.location else None,
                        "lng": media.location.lng if media.location else None,
                    } if media.location else None,
                })
            time.sleep(random.uniform(2, 5))
            return {"status": "ok", "results": results}
        except PleaseWaitFewMinutes:
            return {"status": "rate_limited", "username": username}
        except ChallengeRequired:
            return {"status": "challenge_required", "username": username}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def get_business_profile(self, username, target_username):
        """Extraire les infos business d'un profil Instagram"""
        cl = self.clients.get(username)
        if not cl:
            return {"status": "error", "error": "Not logged in"}

        try:
            # Délai humain avant chaque vue de profil
            time.sleep(random.uniform(3, 7))

            # 5% de chance d'une pause longue (30-120s) pour simuler la lecture
            if random.random() < 0.05:
                time.sleep(random.uniform(30, 120))

            user_info = cl.user_info_by_username(target_username)

            profile = {
                "user_id": str(user_info.pk),
                "username": user_info.username,
                "full_name": user_info.full_name or "",
                "biography": user_info.biography or "",
                "email": user_info.public_email or None,
                "phone": user_info.public_phone_number or None,
                "phone_country_code": user_info.public_phone_country_code or None,
                "business_category": user_info.business_category_name or None,
                "category": user_info.category_name or None,
                "is_business": user_info.is_business or False,
                "address_street": user_info.address_street or None,
                "city": user_info.city_name or None,
                "zip": user_info.zip or None,
                "latitude": user_info.latitude or None,
                "longitude": user_info.longitude or None,
                "external_url": user_info.external_url or None,
                "follower_count": user_info.follower_count or 0,
                "following_count": user_info.following_count or 0,
                "media_count": user_info.media_count or 0,
            }

            # Extraire email/phone du bio si pas dans les champs structurés
            if not profile["email"]:
                import re
                emails = re.findall(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', profile["biography"])
                if emails:
                    profile["email"] = emails[0]

            if not profile["phone"]:
                import re
                phones = re.findall(r'(?:\+33|0033|0)\s*[1-9](?:[\s.\-]?\d{2}){4}', profile["biography"])
                if phones:
                    profile["phone"] = phones[0]

            return {"status": "ok", "profile": profile}
        except PleaseWaitFewMinutes:
            return {"status": "rate_limited", "username": username}
        except ChallengeRequired:
            return {"status": "challenge_required", "username": username}
        except ClientError as e:
            if "User not found" in str(e):
                return {"status": "not_found", "target": target_username}
            return {"status": "error", "error": str(e)}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def search_location(self, username, lat, lng, max_results=20):
        """Recherche de médias par localisation GPS"""
        cl = self.clients.get(username)
        if not cl:
            return {"status": "error", "error": "Not logged in"}

        try:
            locations = cl.location_search(lat, lng)
            results = []
            for loc in locations[:max_results]:
                results.append({
                    "location_id": str(loc.pk),
                    "name": loc.name,
                    "lat": loc.lat,
                    "lng": loc.lng,
                    "address": loc.address or "",
                    "city": loc.city or "",
                })
            time.sleep(random.uniform(2, 4))
            return {"status": "ok", "results": results}
        except Exception as e:
            return {"status": "error", "error": str(e)}


def main():
    scanner = InstagramScanner()

    for line in sys.stdin:
        try:
            cmd = json.loads(line.strip())
            action = cmd.get("action")

            if action == "login":
                result = scanner.login(
                    cmd["username"], cmd["password"],
                    cmd.get("proxy"), cmd.get("session_path")
                )
            elif action == "search_hashtag":
                result = scanner.search_hashtag(
                    cmd["username"], cmd["hashtag"], cmd.get("max_results", 30)
                )
            elif action == "get_business_profile":
                result = scanner.get_business_profile(
                    cmd["username"], cmd["target_username"]
                )
            elif action == "search_location":
                result = scanner.search_location(
                    cmd["username"], cmd["lat"], cmd["lng"], cmd.get("max_results", 20)
                )
            elif action == "ping":
                result = {"status": "ok", "pong": True}
            elif action == "quit":
                break
            else:
                result = {"status": "error", "error": f"Unknown action: {action}"}

            print(json.dumps(result), flush=True)
        except json.JSONDecodeError:
            print(json.dumps({"status": "error", "error": "Invalid JSON"}), flush=True)
        except Exception as e:
            print(json.dumps({"status": "error", "error": str(e)}), flush=True)


if __name__ == "__main__":
    main()
```

### 5.2 — Node.js Bridge vers Python

Créer `vps/social-scanner/src/scanners/instagramBridge.js` :

```javascript
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { config } from '../config.js';
import { AccountPoolManager } from '../utils/accountPoolManager.js';
import { ProxyManager } from '../utils/proxyManager.js';
import { dispatchEnrichment } from '../queues/socialQueueManager.js';
import { circuitBreakers } from '../queues/socialQueueManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

let pythonProcess = null;
let readline = null;
let pendingCallbacks = [];

function ensurePythonProcess() {
  if (pythonProcess && !pythonProcess.killed) return;

  pythonProcess = spawn('python3', [
    new URL('./instagramScanner.py', import.meta.url).pathname,
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  readline = createInterface({ input: pythonProcess.stdout });

  readline.on('line', (line) => {
    try {
      const result = JSON.parse(line);
      const cb = pendingCallbacks.shift();
      if (cb) cb(null, result);
    } catch (err) {
      const cb = pendingCallbacks.shift();
      if (cb) cb(err, null);
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    logger.error(`Instagram Python stderr: ${data.toString()}`);
  });

  pythonProcess.on('exit', (code) => {
    logger.warn(`Instagram Python process exited with code ${code}`);
    pythonProcess = null;
    // Rejeter tous les callbacks en attente
    while (pendingCallbacks.length > 0) {
      const cb = pendingCallbacks.shift();
      cb(new Error('Python process exited'), null);
    }
  });
}

function sendCommand(cmd) {
  return new Promise((resolve, reject) => {
    ensurePythonProcess();
    pendingCallbacks.push((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    pythonProcess.stdin.write(JSON.stringify(cmd) + '\n');
  });
}

/**
 * Scanner Instagram pour un tenant
 */
export async function scanInstagram(jobData) {
  const { tenantId, scanConfig } = jobData;
  const { hashtags = [], locations = [], targetUsernames = [] } = scanConfig;
  const leads = [];

  // Obtenir un compte disponible
  const account = await AccountPoolManager.getNextAccount('instagram');
  if (!account) {
    logger.warn(`No Instagram account available for tenant ${tenantId}`);
    return { leadsFound: 0, error: 'no_account_available' };
  }

  const proxy = ProxyManager.getProxy('instagram', account.username);

  // Login
  const loginResult = await circuitBreakers.instagram.fire(async () =>
    sendCommand({
      action: 'login',
      username: account.username,
      password: account.password,
      proxy: proxy,
      session_path: `/tmp/ig_session_${account.username}.json`,
    })
  );

  if (loginResult.status === 'challenge_required') {
    await AccountPoolManager.markAccount('instagram', account.username, 'challenged');
    logger.warn(`Instagram account ${account.username} challenged — marking as challenged`);
    return { leadsFound: 0, error: 'account_challenged' };
  }

  if (loginResult.status !== 'ok') {
    logger.error(`Instagram login failed for ${account.username}: ${loginResult.error}`);
    return { leadsFound: 0, error: loginResult.error };
  }

  // Phase A : Scanner les hashtags
  const frenchHashtags = [...new Set([
    ...hashtags,
    ...config.frenchHashtags.slice(0, 10),
  ])].slice(0, 15); // Max 15 hashtags par scan

  const discoveredUsernames = new Set();

  for (const hashtag of frenchHashtags) {
    try {
      const result = await circuitBreakers.instagram.fire(async () =>
        sendCommand({
          action: 'search_hashtag',
          username: account.username,
          hashtag: hashtag,
          max_results: 20,
        })
      );

      if (result.status === 'rate_limited') {
        await AccountPoolManager.markAccount('instagram', account.username, 'cooling');
        logger.warn(`Instagram rate limited on ${account.username} — cooling`);
        break;
      }

      if (result.status === 'ok' && result.results) {
        for (const item of result.results) {
          discoveredUsernames.add(item.username);
        }
      }
    } catch (err) {
      logger.error(`Instagram hashtag scan error for #${hashtag}: ${err.message}`);
    }
  }

  // Ajouter les usernames ciblés
  for (const u of targetUsernames) {
    discoveredUsernames.add(u);
  }

  // Phase B : Extraire les profils business
  const maxProfiles = Math.min(discoveredUsernames.size, 30); // Max 30 profils par scan
  let profilesScanned = 0;

  for (const targetUsername of discoveredUsernames) {
    if (profilesScanned >= maxProfiles) break;

    try {
      const result = await circuitBreakers.instagram.fire(async () =>
        sendCommand({
          action: 'get_business_profile',
          username: account.username,
          target_username: targetUsername,
        })
      );

      if (result.status === 'rate_limited') {
        await AccountPoolManager.markAccount('instagram', account.username, 'cooling');
        break;
      }

      if (result.status === 'challenge_required') {
        await AccountPoolManager.markAccount('instagram', account.username, 'challenged');
        break;
      }

      if (result.status === 'ok' && result.profile) {
        const p = result.profile;

        // Filtrer : garder uniquement les profils business ou avec contact info
        if (p.is_business || p.email || p.phone || p.business_category) {
          leads.push({
            source: 'instagram',
            platform: 'instagram',
            platformId: p.user_id,
            businessName: p.full_name || p.username,
            description: (p.biography || '').substring(0, 500),
            email: p.email || null,
            phone: p.phone || null,
            website: p.external_url || null,
            businessCategory: p.business_category || p.category || null,
            address: p.address_street || null,
            city: p.city || null,
            postalCode: p.zip || null,
            latitude: p.latitude || null,
            longitude: p.longitude || null,
            followerCount: p.follower_count,
            profileUrl: `https://instagram.com/${p.username}`,
            detectedAt: new Date().toISOString(),
            tenantId,
          });
        }
      }

      profilesScanned++;
    } catch (err) {
      logger.error(`Instagram profile scan error for @${targetUsername}: ${err.message}`);
    }
  }

  // Envoyer les leads vers enrichissement
  for (const lead of leads) {
    await dispatchEnrichment(lead);
  }

  logger.info(`Instagram scan complete for tenant ${tenantId}: ${leads.length} leads from ${profilesScanned} profiles scanned`);

  return { leadsFound: leads.length, profilesScanned };
}
```

---

## PHASE 6 — TELEGRAM SCANNER

Créer `vps/social-scanner/src/scanners/telegramScanner.js` :

```javascript
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import CryptoJS from 'crypto-js';
import Bottleneck from 'bottleneck';
import { config } from '../config.js';
import { dispatchEnrichment } from '../queues/socialQueueManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 });

// Décryptage AES-256 des StringSessions
function decryptSession(encryptedBase64) {
  const bytes = CryptoJS.AES.decrypt(encryptedBase64, config.telegram.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

const BUYING_SIGNAL_REGEX = new RegExp(
  `(?:${config.buyingSignalKeywords.join('|')})`,
  'i'
);

// Clients Telegram actifs
const activeClients = new Map(); // sessionId → { client, monitoredGroups }

/**
 * Initialiser un client Telegram et commencer le monitoring temps réel
 */
export async function initTelegramMonitor(sessionConfig, groupIds) {
  const { apiId, apiHash, stringSession: encryptedSession } = sessionConfig;
  const sessionString = decryptSession(encryptedSession);
  const session = new StringSession(sessionString);

  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    retryDelay: 5000,
  });

  await client.start({
    phoneNumber: async () => { throw new Error('Session-based auth only'); },
    password: async () => { throw new Error('Session-based auth only'); },
    phoneCode: async () => { throw new Error('Session-based auth only'); },
    onError: (err) => logger.error(`Telegram client error: ${err.message}`),
  });

  logger.info(`Telegram client connected, monitoring ${groupIds.length} groups`);

  // Event handler pour les nouveaux messages avec buying signals
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.text) return;

    if (BUYING_SIGNAL_REGEX.test(message.text)) {
      try {
        const sender = await limiter.schedule(() => message.getSender());
        const chat = await limiter.schedule(() => message.getChat());

        const lead = {
          source: 'telegram',
          platform: 'telegram',
          platformId: sender ? String(sender.id) : null,
          businessName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : null,
          username: sender?.username || null,
          description: message.text.substring(0, 500),
          groupName: chat?.title || null,
          groupId: chat ? String(chat.id) : null,
          buyingSignals: {
            matchedKeywords: config.buyingSignalKeywords.filter(kw =>
              message.text.toLowerCase().includes(kw)
            ),
            postedNeed: true,
          },
          detectedAt: new Date().toISOString(),
          messageDate: message.date ? new Date(message.date * 1000).toISOString() : null,
        };

        await dispatchEnrichment(lead);
        logger.info(`Telegram buying signal detected in "${chat?.title}": "${message.text.substring(0, 80)}..."`);
      } catch (err) {
        logger.error(`Telegram message processing error: ${err.message}`);
      }
    }
  }, new NewMessage({ chats: groupIds }));

  return client;
}

/**
 * Scanner batch Telegram : chercher dans l'historique des groupes
 */
export async function scanTelegram(jobData) {
  const { tenantId, scanConfig } = jobData;
  const { groupIds = [], keywords = [] } = scanConfig;
  const leads = [];

  if (config.telegram.sessions.length === 0) {
    logger.warn('No Telegram sessions configured');
    return { leadsFound: 0, error: 'no_sessions' };
  }

  const sessionConfig = config.telegram.sessions[0];
  const sessionString = decryptSession(sessionConfig.stringSession);
  const session = new StringSession(sessionString);

  const client = new TelegramClient(session, sessionConfig.apiId, sessionConfig.apiHash, {
    connectionRetries: 3,
    retryDelay: 3000,
  });

  try {
    await client.start({
      phoneNumber: async () => { throw new Error('Session-based auth only'); },
      password: async () => { throw new Error('Session-based auth only'); },
      phoneCode: async () => { throw new Error('Session-based auth only'); },
      onError: (err) => logger.error(`Telegram error: ${err.message}`),
    });

    // Scanner les messages récents (dernières 24h) de chaque groupe
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

    for (const groupId of groupIds.slice(0, 50)) { // Max 50 groupes par scan
      try {
        const messages = await limiter.schedule(() =>
          client.getMessages(groupId, {
            limit: 100,
            offsetDate: oneDayAgo,
          })
        );

        for (const msg of messages) {
          if (!msg.text) continue;

          if (BUYING_SIGNAL_REGEX.test(msg.text)) {
            let sender = null;
            try {
              sender = await limiter.schedule(() => msg.getSender());
            } catch (e) {
              // Sender inaccessible — on continue sans
            }

            leads.push({
              source: 'telegram',
              platform: 'telegram',
              platformId: sender ? String(sender.id) : null,
              businessName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() : null,
              username: sender?.username || null,
              description: msg.text.substring(0, 500),
              groupId: String(groupId),
              buyingSignals: {
                matchedKeywords: config.buyingSignalKeywords.filter(kw =>
                  msg.text.toLowerCase().includes(kw)
                ),
                postedNeed: true,
              },
              detectedAt: new Date().toISOString(),
              messageDate: msg.date ? new Date(msg.date * 1000).toISOString() : null,
              tenantId,
            });
          }
        }

        // Délai entre les groupes pour éviter FloodWaitError
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        if (err.message && err.message.includes('FLOOD_WAIT')) {
          const waitSeconds = parseInt(err.message.match(/(\d+)/)?.[1] || '60');
          logger.warn(`Telegram FloodWait ${waitSeconds}s — pausing`);
          await new Promise(r => setTimeout(r, waitSeconds * 1000));
        } else {
          logger.error(`Telegram group ${groupId} scan error: ${err.message}`);
        }
      }
    }

    await client.disconnect();
  } catch (err) {
    logger.error(`Telegram scan failed for tenant ${tenantId}: ${err.message}`);
  }

  for (const lead of leads) {
    await dispatchEnrichment(lead);
  }

  logger.info(`Telegram scan complete for tenant ${tenantId}: ${leads.length} leads found`);

  return { leadsFound: leads.length };
}
```

---

## PHASE 7 — FACEBOOK GROUPS SCANNER

Créer `vps/social-scanner/src/scanners/facebookScanner.js` :

```javascript
import { chromium } from 'playwright';
import { config } from '../config.js';
import { AccountPoolManager } from '../utils/accountPoolManager.js';
import { ProxyManager } from '../utils/proxyManager.js';
import { dispatchEnrichment } from '../queues/socialQueueManager.js';
import { circuitBreakers } from '../queues/socialQueueManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const BUYING_SIGNAL_REGEX = new RegExp(
  `(?:${config.buyingSignalKeywords.join('|')})`,
  'i'
);

/**
 * Scanner Facebook Groups pour un tenant
 * ⚠️ PREMIUM TIER UNIQUEMENT — le tenant accepte la responsabilité compliance RGPD
 * API Groups morte depuis avril 2024 — browser automation obligatoire
 */
export async function scanFacebookGroups(jobData) {
  const { tenantId, scanConfig } = jobData;
  const { groupUrls = [] } = scanConfig;
  const leads = [];

  if (groupUrls.length === 0) {
    return { leadsFound: 0, error: 'no_groups_configured' };
  }

  const account = await AccountPoolManager.getNextAccount('facebook');
  if (!account) {
    logger.warn(`No Facebook account available for tenant ${tenantId}`);
    return { leadsFound: 0, error: 'no_account_available' };
  }

  const proxy = ProxyManager.getProxy('facebook', account.email);
  let browser = null;

  try {
    // Lancer Playwright avec proxy résidentiel
    const launchOptions = {
      headless: true, // Utiliser le nouveau headless Chrome
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    };

    if (proxy) {
      launchOptions.proxy = { server: proxy };
    }

    browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
    });

    // Bloquer les ressources lourdes pour économiser la bande passante
    await context.route('**/*.{png,jpg,jpeg,gif,svg,mp4,webm,woff,woff2}', route => route.abort());
    await context.route('**/tracking/**', route => route.abort());

    const page = await context.newPage();

    // Restaurer les cookies si disponibles
    if (account.cookies) {
      try {
        const cookies = JSON.parse(account.cookies);
        await context.addCookies(cookies);
      } catch (e) {
        logger.warn(`Failed to restore Facebook cookies for ${account.email}`);
      }
    }

    // Naviguer vers Facebook et vérifier le login
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle', timeout: 30000 });

    // Vérifier si connecté (chercher un élément typique de l'interface loguée)
    const isLoggedIn = await page.locator('[aria-label="Votre profil"], [aria-label="Your profile"]').count() > 0;

    if (!isLoggedIn) {
      // Tenter le login
      try {
        await page.fill('input[name="email"]', account.email);
        await page.fill('input[name="pass"]', account.password);
        await page.click('button[name="login"]');
        await page.waitForNavigation({ timeout: 15000 });

        // Sauvegarder les cookies pour les prochains logins
        const cookies = await context.cookies();
        // Note : sauvegarder ces cookies dans Redis pour réutilisation
      } catch (loginErr) {
        logger.error(`Facebook login failed for ${account.email}: ${loginErr.message}`);
        await AccountPoolManager.markAccount('facebook', account.email, 'challenged');
        return { leadsFound: 0, error: 'login_failed' };
      }
    }

    // Scanner chaque groupe
    const maxGroups = Math.min(groupUrls.length, 10); // Max 10 groupes par scan

    for (let i = 0; i < maxGroups; i++) {
      const groupUrl = groupUrls[i];

      try {
        // Délai humain entre les groupes (3-5 min)
        if (i > 0) {
          const delay = config.facebook.delayBetweenGroupsMs + Math.random() * 60000;
          await new Promise(r => setTimeout(r, delay));
        }

        await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        // Scroller pour charger les posts récents
        for (let s = 0; s < config.facebook.scrollsPerGroup; s++) {
          await page.evaluate(() => window.scrollBy(0, 1200));
          await page.waitForTimeout(2000 + Math.random() * 3000);
        }

        // Extraire les textes des posts visibles
        const posts = await page.evaluate(() => {
          const postElements = document.querySelectorAll('[data-ad-preview="message"], [dir="auto"]');
          const results = [];

          for (const el of postElements) {
            const text = el.textContent || '';
            if (text.length > 20 && text.length < 5000) {
              results.push({
                text: text.substring(0, 1000),
              });
            }
          }

          return results.slice(0, 50); // Max 50 posts par groupe
        });

        // Filtrer les posts avec buying signals
        for (const post of posts) {
          if (BUYING_SIGNAL_REGEX.test(post.text)) {
            const matchedKeywords = config.buyingSignalKeywords.filter(kw =>
              post.text.toLowerCase().includes(kw)
            );

            leads.push({
              source: 'facebook_groups',
              platform: 'facebook_groups',
              platformId: null, // Pas d'ID extractible côté serveur
              description: post.text.substring(0, 500),
              groupUrl,
              buyingSignals: {
                matchedKeywords,
                postedNeed: true,
              },
              detectedAt: new Date().toISOString(),
              tenantId,
            });
          }
        }

        logger.info(`Facebook group scanned: ${groupUrl} — ${posts.length} posts checked`);
      } catch (groupErr) {
        logger.error(`Facebook group scan error for ${groupUrl}: ${groupErr.message}`);
      }
    }

    await browser.close();
  } catch (err) {
    logger.error(`Facebook scan failed for tenant ${tenantId}: ${err.message}`);
    if (browser) await browser.close().catch(() => {});
    return { leadsFound: 0, error: err.message };
  }

  for (const lead of leads) {
    await dispatchEnrichment(lead);
  }

  logger.info(`Facebook Groups scan complete for tenant ${tenantId}: ${leads.length} leads found`);

  return { leadsFound: leads.length };
}
```

---

## PHASE 8 — ENTRY POINT + WEBHOOK SERVER + WORKERS

### 8.1 — Webhook Server (reçoit les triggers de Firebase)

Créer `vps/social-scanner/src/api/webhookServer.js` :

```javascript
import express from 'express';
import helmet from 'helmet';
import { config } from '../config.js';
import { dispatchScan, getQueueStats } from '../queues/socialQueueManager.js';
import { AccountPoolManager } from '../utils/accountPoolManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

const app = express();
app.use(helmet());
app.use(express.json());

// Middleware d'authentification par webhook secret
function authenticate(req, res, next) {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== config.vps.webhookSecret) {
    logger.warn(`Unauthorized webhook request from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /scan — Déclencher un scan social
app.post('/scan', authenticate, async (req, res) => {
  try {
    const { tenantId, platform, scanConfig, priority } = req.body;

    if (!tenantId || !platform) {
      return res.status(400).json({ error: 'Missing tenantId or platform' });
    }

    const validPlatforms = ['youtube', 'instagram', 'facebook', 'telegram'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: `Invalid platform. Valid: ${validPlatforms.join(', ')}` });
    }

    await dispatchScan(tenantId, platform, scanConfig || {}, priority || 5);

    res.json({ status: 'dispatched', tenantId, platform });
  } catch (err) {
    logger.error(`Scan dispatch error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /status — Santé des queues et des pools de comptes
app.get('/status', authenticate, async (req, res) => {
  try {
    const queueStats = await getQueueStats();
    const igPool = await AccountPoolManager.getPoolStatus('instagram');
    const fbPool = await AccountPoolManager.getPoolStatus('facebook');
    const tgPool = await AccountPoolManager.getPoolStatus('telegram');

    res.json({
      queues: queueStats,
      accountPools: {
        instagram: igPool,
        facebook: fbPool,
        telegram: tgPool,
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health — Health check simple
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export function startWebhookServer() {
  app.listen(config.vps.port, '0.0.0.0', () => {
    logger.info(`Social Scanner webhook server running on port ${config.vps.port}`);
  });
}
```

### 8.2 — Entry Point principal

Créer `vps/social-scanner/src/index.js` :

```javascript
import { Worker } from 'bullmq';
import { config } from './config.js';
import { startWebhookServer } from './api/webhookServer.js';
import { scanYouTube } from './scanners/youtubeScanner.js';
import { scanInstagram } from './scanners/instagramBridge.js';
import { scanFacebookGroups } from './scanners/facebookScanner.js';
import { scanTelegram } from './scanners/telegramScanner.js';
import { CrossPlatformDeduplicator } from './utils/crossPlatformDeduplicator.js';
import { calculateLeadScore } from './utils/leadScorer.js';
import { normalizeFrenchPhone } from './utils/frenchPhoneNormalizer.js';
import { normalizeBusinessName, extractDomain } from './utils/frenchBusinessNormalizer.js';
import { moveToDeadLetter } from './queues/socialQueueManager.js';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
});

// ━━━ WORKERS PAR PLATEFORME ━━━

const youtubeWorker = new Worker('scan:youtube', async (job) => {
  logger.info(`Processing YouTube scan for ${job.data.tenantId}`);
  return await scanYouTube(job.data);
}, {
  connection: { ...config.redis },
  concurrency: 5,
  limiter: { max: 3, duration: 60000 }, // Max 3 scans/min (quota YouTube)
});

const instagramWorker = new Worker('scan:instagram', async (job) => {
  logger.info(`Processing Instagram scan for ${job.data.tenantId}`);
  return await scanInstagram(job.data);
}, {
  connection: { ...config.redis },
  concurrency: 2,
  limiter: { max: 2, duration: 60000 }, // Max 2 scans/min (rate limits IG)
});

const facebookWorker = new Worker('scan:facebook', async (job) => {
  logger.info(`Processing Facebook Groups scan for ${job.data.tenantId}`);
  return await scanFacebookGroups(job.data);
}, {
  connection: { ...config.redis },
  concurrency: 1, // Un seul browser à la fois (CPU-intensive)
  limiter: { max: 1, duration: 300000 }, // Max 1 scan par 5 min
});

const telegramWorker = new Worker('scan:telegram', async (job) => {
  logger.info(`Processing Telegram scan for ${job.data.tenantId}`);
  return await scanTelegram(job.data);
}, {
  connection: { ...config.redis },
  concurrency: 3,
  limiter: { max: 5, duration: 60000 },
});

// ━━━ WORKER D'ENRICHISSEMENT ━━━
const enrichWorker = new Worker('enrich:all', async (job) => {
  const lead = job.data;

  // Normaliser les données
  if (lead.phone) lead.phoneE164 = normalizeFrenchPhone(lead.phone);
  if (lead.email) lead.emailNormalized = lead.email.toLowerCase().trim();
  if (lead.businessName) lead.nameNormalized = normalizeBusinessName(lead.businessName);
  if (lead.website) lead.domainNormalized = extractDomain(lead.website);

  // Scorer le lead
  const { score, grade } = calculateLeadScore(lead);
  lead.score = score;
  lead.grade = grade;

  // Envoyer vers Firebase
  try {
    const res = await fetch(config.firebase.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.vps.webhookSecret,
      },
      body: JSON.stringify({
        type: 'new_lead',
        lead,
      }),
    });

    if (!res.ok) {
      throw new Error(`Firebase webhook responded with ${res.status}`);
    }

    logger.info(`Lead sent to Firebase: ${lead.businessName || lead.username || 'unknown'} (score: ${score}, grade: ${grade})`);
  } catch (err) {
    logger.error(`Failed to send lead to Firebase: ${err.message}`);
    throw err; // BullMQ will retry
  }
}, {
  connection: { ...config.redis },
  concurrency: 10,
  limiter: { max: 20, duration: 1000 }, // 20 leads/sec max vers Firebase
});

// ━━━ WORKER DE NOTIFICATION ━━━
const notifyWorker = new Worker('notify:all', async (job) => {
  const { tenantId, lead } = job.data;
  // Pour l'instant, les notifications passent par Firebase → Alex WhatsApp
  // Ce worker est un placeholder pour les alertes admin (Slack, Discord, etc.)
  logger.info(`Notification: new ${lead.grade}-grade lead for tenant ${tenantId}`);
}, {
  connection: { ...config.redis },
  concurrency: 5,
});

// ━━━ ERROR HANDLERS ━━━
for (const worker of [youtubeWorker, instagramWorker, facebookWorker, telegramWorker, enrichWorker, notifyWorker]) {
  worker.on('failed', async (job, err) => {
    logger.error(`Job ${job?.id} in ${job?.queueName} failed: ${err.message}`);
    if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
      await moveToDeadLetter(job, err);
    }
  });

  worker.on('error', (err) => {
    logger.error(`Worker error: ${err.message}`);
  });
}

// ━━━ DÉMARRAGE ━━━
logger.info('🚀 FMF Social Scanner starting...');
logger.info(`Workers: YouTube(5) Instagram(2) Facebook(1) Telegram(3) Enrich(10) Notify(5)`);
logger.info(`Redis: ${config.redis.host}:${config.redis.port}`);

startWebhookServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — shutting down workers...');
  await Promise.all([
    youtubeWorker.close(),
    instagramWorker.close(),
    facebookWorker.close(),
    telegramWorker.close(),
    enrichWorker.close(),
    notifyWorker.close(),
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received — shutting down workers...');
  await Promise.all([
    youtubeWorker.close(),
    instagramWorker.close(),
    facebookWorker.close(),
    telegramWorker.close(),
    enrichWorker.close(),
    notifyWorker.close(),
  ]);
  process.exit(0);
});
```

---

## PHASE 9 — FIREBASE CLOUD FUNCTIONS

### 9.1 — triggerSocialScan (onCall)

Ajouter dans `functions/src/social/triggerSocialScan.js` :

```javascript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

const VPS_SCANNER_URL = process.env.VPS_SCANNER_URL || 'http://94.130.184.44:8090';
const VPS_WEBHOOK_SECRET = process.env.VPS_WEBHOOK_SECRET;

/**
 * Déclencher un scan social depuis le frontend
 * Le frontend appelle cette CF → la CF dispatche un job vers le VPS
 */
export const triggerSocialScan = onCall({
  region: 'europe-west1',
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const uid = request.auth.uid;
  const { platform, scanConfig } = request.data;

  if (!platform) {
    throw new HttpsError('invalid-argument', 'platform is required');
  }

  const validPlatforms = ['youtube', 'instagram', 'facebook', 'telegram'];
  if (!validPlatforms.includes(platform)) {
    throw new HttpsError('invalid-argument', `Invalid platform. Valid: ${validPlatforms.join(', ')}`);
  }

  // Trouver l'orgId du user
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }
  const orgId = userDoc.data().orgId || userDoc.data().organizationId;
  if (!orgId) {
    throw new HttpsError('failed-precondition', 'User has no organization');
  }

  // Vérifier le quota du tenant
  const quotaDoc = await db.collection('tenantQuotas').doc(orgId).get();
  const quota = quotaDoc.exists ? quotaDoc.data() : { tier: 'free', scansToday: 0, lastResetDate: '' };

  const today = new Date().toISOString().split('T')[0];
  const scansToday = quota.lastResetDate === today ? (quota.scansToday || 0) : 0;
  const tierConfig = {
    free:  { maxScans: 4,  priority: 15 },
    basic: { maxScans: 24, priority: 5  },
    pro:   { maxScans: 96, priority: 1  },
  };

  const tier = tierConfig[quota.tier || 'free'];
  if (scansToday >= tier.maxScans) {
    throw new HttpsError('resource-exhausted', `Daily scan limit reached (${tier.maxScans}/${tier.maxScans})`);
  }

  // Dispatcher le scan vers le VPS
  try {
    const response = await fetch(`${VPS_SCANNER_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': VPS_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        tenantId: orgId,
        platform,
        scanConfig: scanConfig || {},
        priority: tier.priority,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`VPS responded with ${response.status}: ${errText}`);
    }

    // Incrémenter le compteur de scans
    await db.collection('tenantQuotas').doc(orgId).set({
      tier: quota.tier || 'free',
      scansToday: scansToday + 1,
      lastResetDate: today,
      lastScanAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { status: 'dispatched', platform, scansRemaining: tier.maxScans - scansToday - 1 };
  } catch (err) {
    throw new HttpsError('internal', `Failed to dispatch scan: ${err.message}`);
  }
});
```

### 9.2 — receiveSocialLeads (HTTPS webhook)

Ajouter dans `functions/src/social/receiveSocialLeads.js` :

```javascript
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

const VPS_WEBHOOK_SECRET = process.env.VPS_WEBHOOK_SECRET;
const ALLOWED_VPS_IPS = ['94.130.184.44']; // Le VPS Hetzner

/**
 * Webhook qui reçoit les leads du VPS Social Scanner
 * Le VPS envoie un POST ici après chaque lead enrichi
 */
export const receiveSocialLeads = onRequest({
  region: 'europe-west1',
  cors: false, // Pas de CORS — c'est un webhook server-to-server
}, async (req, res) => {
  // Vérifier la méthode
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Vérifier le secret
  const secret = req.headers['x-webhook-secret'];
  if (secret !== VPS_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Optionnel : vérifier l'IP source
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  if (ALLOWED_VPS_IPS.length > 0 && !ALLOWED_VPS_IPS.includes(clientIp)) {
    // Warning mais pas blocage (les IPs Cloud Functions peuvent varier)
    console.warn(`receiveSocialLeads called from unexpected IP: ${clientIp}`);
  }

  try {
    const { type, lead } = req.body;

    if (type !== 'new_lead' || !lead) {
      res.status(400).json({ error: 'Invalid payload: expected { type: "new_lead", lead: {...} }' });
      return;
    }

    const tenantId = lead.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Missing tenantId in lead' });
      return;
    }

    // Vérifier si le lead existe déjà (dédup par email ou platformId)
    let existingLeadRef = null;

    if (lead.emailNormalized) {
      const emailQuery = await db.collection(`organizations/${tenantId}/socialLeads`)
        .where('emailNormalized', '==', lead.emailNormalized)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        existingLeadRef = emailQuery.docs[0].ref;
      }
    }

    if (!existingLeadRef && lead.platformId) {
      // Requête sur champ plat platformIds (pas sur le nested map platforms.X.platformId)
      const platformQuery = await db.collection(`organizations/${tenantId}/socialLeads`)
        .where(`platformIds.${lead.platform}`, '==', lead.platformId)
        .limit(1)
        .get();

      if (!platformQuery.empty) {
        existingLeadRef = platformQuery.docs[0].ref;
      }
    }

    if (existingLeadRef) {
      // Merge avec le lead existant (ajouter la nouvelle plateforme)
      const updateData = {
        [`platformIds.${lead.platform}`]: lead.platformId,
        [`platforms.${lead.platform}`]: {
          platformId: lead.platformId,
          profileUrl: lead.profileUrl || lead.channelUrl || null,
          detectedAt: lead.detectedAt,
          description: lead.description,
          buyingSignals: lead.buyingSignals || null,
        },
        updatedAt: FieldValue.serverTimestamp(),
        score: lead.score,
        grade: lead.grade,
      };

      // Mettre à jour l'email/phone si le nouveau lead en a
      if (lead.email) {
        updateData.email = lead.email;
        updateData.emailNormalized = lead.emailNormalized || lead.email.toLowerCase().trim();
      }
      if (lead.phoneE164) updateData.phoneE164 = lead.phoneE164;
      if (lead.siret) updateData.siret = lead.siret;

      await existingLeadRef.update(updateData);

      res.json({ status: 'merged', leadId: existingLeadRef.id });
    } else {
      // Créer un nouveau lead
      const newLead = {
        businessName: lead.businessName || null,
        email: lead.email || null,
        emailNormalized: lead.emailNormalized || null,
        phone: lead.phone || null,
        phoneE164: lead.phoneE164 || null,
        website: lead.website || null,
        domainNormalized: lead.domainNormalized || null,
        nameNormalized: lead.nameNormalized || null,
        businessCategory: lead.businessCategory || null,
        address: lead.address || null,
        city: lead.city || null,
        postalCode: lead.postalCode || null,
        siret: lead.siret || null,
        nafCode: lead.nafCode || null,
        score: lead.score || 0,
        grade: lead.grade || 'D',
        // Champ plat pour les queries Firestore (pas besoin d'index composite dynamique)
        platformIds: {
          [lead.platform]: lead.platformId,
        },
        platforms: {
          [lead.platform]: {
            platformId: lead.platformId,
            profileUrl: lead.profileUrl || lead.channelUrl || null,
            detectedAt: lead.detectedAt,
            description: lead.description,
            buyingSignals: lead.buyingSignals || null,
          },
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: 'new', // new → contacted → qualified → converted
      };

      const docRef = await db.collection(`organizations/${tenantId}/socialLeads`).add(newLead);

      res.json({ status: 'created', leadId: docRef.id });
    }
  } catch (err) {
    console.error('receiveSocialLeads error:', err);
    res.status(500).json({ error: err.message });
  }
});
```

### 9.3 — Exporter les nouvelles Cloud Functions

Ajouter les exports dans `functions/index.js` (ou le fichier d'export principal) :

```javascript
// ━━━ SOCIAL SCANNER ━━━
export { triggerSocialScan } from './src/social/triggerSocialScan.js';
export { receiveSocialLeads } from './src/social/receiveSocialLeads.js';
```

### 9.4 — Variables d'env Firebase

Ajouter dans `functions/.env` :

```
VPS_SCANNER_URL=http://94.130.184.44:8090
VPS_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## PHASE 10 — VÉRIFICATION

### 10.1 — Vérification de la structure des fichiers

```bash
# Vérifier que TOUS les fichiers ont été créés
echo "=== VPS FILES ==="
ls -la vps/social-scanner/package.json
ls -la vps/social-scanner/.env.example
ls -la vps/social-scanner/requirements.txt
ls -la vps/social-scanner/setup-redis.sh
ls -la vps/social-scanner/src/index.js
ls -la vps/social-scanner/src/config.js
ls -la vps/social-scanner/src/queues/socialQueueManager.js
ls -la vps/social-scanner/src/scanners/youtubeScanner.js
ls -la vps/social-scanner/src/scanners/instagramScanner.py
ls -la vps/social-scanner/src/scanners/instagramBridge.js
ls -la vps/social-scanner/src/scanners/facebookScanner.js
ls -la vps/social-scanner/src/scanners/telegramScanner.js
ls -la vps/social-scanner/src/utils/proxyManager.js
ls -la vps/social-scanner/src/utils/accountPoolManager.js
ls -la vps/social-scanner/src/utils/crossPlatformDeduplicator.js
ls -la vps/social-scanner/src/utils/leadScorer.js
ls -la vps/social-scanner/src/utils/frenchPhoneNormalizer.js
ls -la vps/social-scanner/src/utils/frenchBusinessNormalizer.js
ls -la vps/social-scanner/src/api/webhookServer.js

echo "=== FIREBASE FILES ==="
ls -la functions/src/social/triggerSocialScan.js
ls -la functions/src/social/receiveSocialLeads.js

echo "=== ALL FILES PRESENT ==="
```

### 10.2 — Vérification des imports

```bash
# Vérifier que chaque fichier n'importe que des modules qui existent
grep -rn "from '\.\." vps/social-scanner/src/ | head -30
grep -rn "from '\.\." functions/src/social/ | head -10

# Vérifier qu'il n'y a aucun TODO ou placeholder
grep -rn "TODO\|FIXME\|PLACEHOLDER\|your_.*_here\|\.\.\." vps/social-scanner/src/ | grep -v node_modules | grep -v ".env"
grep -rn "TODO\|FIXME\|PLACEHOLDER" functions/src/social/
```

### 10.3 — Vérification des variables d'env

```bash
# Lister toutes les variables d'env référencées
grep -rn "process\.env\." vps/social-scanner/src/ | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort | uniq
grep -rn "process\.env\." functions/src/social/ | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort | uniq
```

Variables attendues dans `vps/social-scanner/.env` :
- REDIS_PASSWORD
- SCANNER_PORT
- VPS_WEBHOOK_SECRET
- FIREBASE_WEBHOOK_URL
- YOUTUBE_API_KEY
- INSTAGRAM_ACCOUNTS
- FACEBOOK_ACCOUNTS
- TELEGRAM_SESSIONS
- TELEGRAM_ENCRYPTION_KEY
- PROXY_RESIDENTIAL_URL
- PROXY_DATACENTER_URL

Variables attendues dans `functions/.env` :
- VPS_SCANNER_URL
- VPS_WEBHOOK_SECRET

### 10.4 — Vérification Firestore collections

Collections créées/utilisées par ce prompt :
- `organizations/{orgId}/socialLeads/{leadId}` — leads unifiés multi-plateforme
- `tenantQuotas/{orgId}` — compteur de scans quotidiens (⚠️ cette collection existe peut-être déjà via Prompt ② — vérifier et merger si besoin)
- `users/{uid}` — lecture seule pour récupérer orgId

### 10.5 — Vérification Cloud Functions exports

```bash
# Vérifier que les exports sont présents dans functions/index.js
grep -n "triggerSocialScan\|receiveSocialLeads" functions/index.js
# Doit retourner 2 lignes (1 import/export par fonction)
```

### 10.6 — Vérification de build Firebase

```bash
cd functions && npm run build
# Doit compiler sans erreur
```

### 10.7 — Test de santé VPS

```bash
# Après déploiement sur le VPS :
curl http://94.130.184.44:8090/health
# Réponse attendue : {"status":"ok","timestamp":...}

# Test avec authentification :
curl -X POST http://94.130.184.44:8090/scan \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_webhook_secret_here" \
  -d '{"tenantId":"test","platform":"youtube","scanConfig":{"niches":["restaurant"],"locations":["Lyon"]}}'
# Réponse attendue : {"status":"dispatched","tenantId":"test","platform":"youtube"}
```

---

## CORRECTIONS ET POINTS D'ATTENTION

### CORRECTION 1 — Ne PAS créer `tenantQuotas` si elle existe déjà
Le Prompt ② a peut-être déjà créé une collection de quotas. AVANT de créer `triggerSocialScan.js`, vérifier :
```bash
grep -rn "tenantQuotas" functions/src/
```
Si la collection existe déjà avec un schéma différent, **adapter le code de triggerSocialScan pour utiliser le schéma existant** plutôt que d'en créer un nouveau.

### CORRECTION 2 — Vérifier le fichier d'exports principal
Le projet peut utiliser `functions/index.js` ou `functions/src/index.js` comme entry point. AVANT d'ajouter les exports, vérifier :
```bash
head -20 functions/index.js
cat functions/package.json | grep -A2 "main"
```
Et adapter le chemin d'import en conséquence.

### CORRECTION 3 — Port 8090 vs ports existants
Le VPS utilise déjà :
- Port 8080 : Evolution API (WhatsApp)
- Ports utilisés par le microservice Python Intent Hunter (vérifier avec `ss -tlnp`)

Le Social Scanner utilise le port **8090**. Vérifier qu'il est libre avant démarrage :
```bash
ss -tlnp | grep 8090
```

### CORRECTION 4 — Ne PAS toucher aux fichiers existants du VPS
Ce prompt crée tout dans `vps/social-scanner/` — un dossier séparé. Il ne modifie AUCUN fichier existant de l'Evolution API ou du microservice Python Intent Hunter.

### CORRECTION 5 — Docker Compose NON INCLUS intentionnellement
Le Docker Compose n'est pas inclus dans ce prompt pour éviter de casser le setup Docker existant (Evolution API). Le Social Scanner démarre directement avec `node src/index.js` ou via PM2. Pour la conteneurisation, un Dockerfile séparé pourra être ajouté plus tard.

### CORRECTION 6 — CORS sur triggerSocialScan
La règle 6 dit d'utiliser `ALLOWED_ORIGINS` déjà configuré dans le projet. AVANT de créer `triggerSocialScan.js`, vérifier :
```bash
grep -rn "ALLOWED_ORIGINS" functions/src/
```
Si `ALLOWED_ORIGINS` est un array importable, remplacer `cors: true` par `cors: ALLOWED_ORIGINS` dans triggerSocialScan. Si c'est un middleware Express, adapter le code en conséquence. `receiveSocialLeads` a `cors: false` (correct — c'est server-to-server).

---

## RÉSUMÉ DES FICHIERS CRÉÉS

### VPS (19 fichiers) :
1. `vps/social-scanner/package.json`
2. `vps/social-scanner/.env.example`
3. `vps/social-scanner/requirements.txt`
4. `vps/social-scanner/setup-redis.sh`
5. `vps/social-scanner/src/index.js`
6. `vps/social-scanner/src/config.js`
7. `vps/social-scanner/src/queues/socialQueueManager.js`
8. `vps/social-scanner/src/scanners/youtubeScanner.js`
9. `vps/social-scanner/src/scanners/instagramScanner.py`
10. `vps/social-scanner/src/scanners/instagramBridge.js`
11. `vps/social-scanner/src/scanners/facebookScanner.js`
12. `vps/social-scanner/src/scanners/telegramScanner.js`
13. `vps/social-scanner/src/utils/proxyManager.js`
14. `vps/social-scanner/src/utils/accountPoolManager.js`
15. `vps/social-scanner/src/utils/crossPlatformDeduplicator.js`
16. `vps/social-scanner/src/utils/leadScorer.js`
17. `vps/social-scanner/src/utils/frenchPhoneNormalizer.js`
18. `vps/social-scanner/src/utils/frenchBusinessNormalizer.js`
19. `vps/social-scanner/src/api/webhookServer.js`

### Firebase (2 Cloud Functions + exports) :
20. `functions/src/social/triggerSocialScan.js`
21. `functions/src/social/receiveSocialLeads.js`
22. Modification : `functions/index.js` (ajouter 2 exports)

### ⚠️ React Dashboard NON INCLUS
Le composant React `SocialScanDashboard.jsx` n'est PAS inclus dans ce prompt. Raison : il dépend des composants UI existants (layout, sidebar, design system) qu'on ne peut pas connaître sans voir le code actuel. Il sera ajouté dans un prompt séparé après vérification du frontend existant.

---

## ORDRE D'EXÉCUTION

1. Créer tous les fichiers VPS (Phase 1 à 8.2)
2. Créer les Cloud Functions Firebase (Phase 9)
3. `cd functions && npm run build` — vérifier 0 erreur
4. Exécuter les vérifications Phase 10 (10.1 à 10.5)
5. NE PAS `firebase deploy` — attendre instruction explicite
6. NE PAS déployer sur le VPS — attendre instruction explicite
