# API Documentation - AI Multi-Providers System

## Cloud Functions

Toutes les Cloud Functions sont deployees dans la region `europe-west1`.

---

## 1. AI Personalization

### `personalizeMessage`

Genere des angles de personnalisation pour un prospect en utilisant le load balancer AI.

**Type :** `onCall`

**Input :**
```typescript
{
  prospectName: string,      // Requis
  prospectBio: string,       // Requis
  prospectCategory?: string, // Optionnel (default: 'Unknown')
  prospectFollowers?: string,// Optionnel (default: '0')
  businessType?: string,     // Optionnel (default: 'Generic')
  targetService?: string,    // Optionnel (default: 'Services de creation de contenu video')
  strategy?: 'speed' | 'balanced' // Optionnel (default: 'speed')
}
```

**Output :**
```typescript
{
  success: true,
  data: {
    angles: string[],    // 3 angles de personnalisation
    provider: string,    // 'groq' | 'openrouter' | 'gemini'
    model: string,       // Modele utilise
    tokensUsed: number,  // Tokens consommes
    latency: number,     // Temps en ms
    fromCache: boolean   // Si resultat en cache
  }
}
```

**Exemple :**
```javascript
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

const personalizeMessage = httpsCallable(functions, 'personalizeMessage')
const result = await personalizeMessage({
  prospectName: 'Sophie Martin',
  prospectBio: 'Coach en developpement personnel | Auteure | TEDx',
  prospectCategory: 'Coach',
  prospectFollowers: '45000',
  businessType: 'Coaching',
  targetService: 'Creation de contenu video',
  strategy: 'speed'
})

console.log(result.data.data.angles)
// ["Angle 1...", "Angle 2...", "Angle 3..."]
```

---

### `getAIStatus`

Retourne le statut de tous les providers AI et les statistiques globales.

**Type :** `onCall`

**Input :** Aucun

**Output :**
```typescript
{
  success: true,
  providers: {
    groq: {
      name: 'groq',
      available: boolean,
      usage: number,
      limit: number,
      resetTime: Date,
      priority: 1
    },
    openrouter: {
      name: 'openrouter',
      available: boolean,
      usage: number,
      limit: number,
      resetTime: Date,
      priority: 2,
      currentModel: string
    },
    gemini: {
      name: 'gemini',
      available: boolean,
      usage: number,
      limit: number,
      resetTime: Date,
      priority: 3
    }
  },
  stats: {
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    successRate: number,      // Pourcentage
    providerUsage: {
      groq: number,
      openrouter: number,
      gemini: number
    },
    averageLatency: {
      groq: number,           // ms
      openrouter: number,
      gemini: number
    }
  }
}
```

---

## 2. Email Enrichment

### `enrichEmail`

Enrichit une adresse email avec les donnees du prospect.

**Type :** `onCall`

**Input :**
```typescript
{
  email: string  // Requis, format email valide
}
```

**Output :**
```typescript
{
  success: true,
  data: {
    email: string,
    firstName: string | null,
    lastName: string | null,
    fullName: string | null,
    company: string | null,
    title: string | null,
    linkedinUrl: string | null,
    phone: string | null,
    location: string | null,
    confidence: number  // 0-100
  },
  provider: string,  // 'derrick' | 'apollo' | 'hunter'
  latency: number
}
```

---

### `enrichEmailsBatch`

Enrichit plusieurs emails en batch.

**Type :** `onCall`

**Input :**
```typescript
{
  emails: string[],           // Requis, max 50
  concurrency?: number,       // Optionnel (default: 3, max: 5)
  continueOnError?: boolean   // Optionnel (default: true)
}
```

**Output :**
```typescript
{
  success: true,
  results: Array<{
    email: string,
    firstName: string | null,
    // ... same as enrichEmail
  }>,
  errors: Array<{
    email: string,
    error: string
  }>,
  stats: {
    total: number,
    enriched: number,
    failed: number
  }
}
```

---

### `getEnrichmentStatus`

Retourne le statut de tous les providers d'enrichissement.

**Type :** `onCall`

**Input :** Aucun

**Output :**
```typescript
{
  success: true,
  providers: {
    derrick: {
      name: 'derrick',
      available: boolean,
      usage: number,
      limit: 200,
      resetTime: Date,
      priority: 1
    },
    apollo: {
      name: 'apollo',
      available: boolean,
      usage: number,
      limit: 60,
      resetTime: Date,
      priority: 2
    },
    hunter: {
      name: 'hunter',
      available: boolean,
      usage: number,
      limit: 50,
      resetTime: Date,
      priority: 3
    }
  },
  stats: {
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    successRate: number,
    remainingCapacity: number  // Total des capacites restantes
  }
}
```

---

## 3. Multi-Platform Posting

### `createMultiPlatformPost`

Cree un post sur plusieurs plateformes sociales.

**Type :** `onCall`

**Input :**
```typescript
{
  content: string,            // Requis, contenu du post
  platforms: string[],        // Requis, max 10
  mediaUrls?: string[],       // Optionnel, URLs des medias
  scheduledAt?: string        // Optionnel, ISO date pour planification
}
```

**Plateformes supportees :**
- `twitter`
- `linkedin`
- `facebook`
- `instagram`
- `tiktok`
- `youtube`
- `pinterest`
- `reddit`
- `threads`
- `bluesky`
- `mastodon`
- `dribbble`
- `discord`

**Output :**
```typescript
{
  success: true,
  provider: string,      // 'postiz' | 'late'
  postId: string,
  platforms: string[],
  status: 'published' | 'scheduled',
  scheduledAt?: Date,
  latency: number
}
```

---

### `getPostStatus`

Recupere le statut d'un post.

**Type :** `onCall`

**Input :**
```typescript
{
  postId: string,       // Requis
  provider?: string     // Optionnel, specifie le provider
}
```

---

### `cancelPost`

Annule un post programme.

**Type :** `onCall`

**Input :**
```typescript
{
  postId: string,       // Requis
  provider?: string     // Optionnel
}
```

---

### `getPostingStatus`

Retourne le statut de tous les providers de posting.

**Type :** `onCall`

**Input :** Aucun

**Output :**
```typescript
{
  success: true,
  providers: {
    postiz: {
      name: 'postiz',
      available: boolean,
      priority: 1,
      supportedPlatforms: string[],
      stats: {...}
    },
    late: {
      name: 'late',
      available: boolean,
      usage: number,
      limit: 20,
      resetTime: Date,
      priority: 2,
      supportedPlatforms: string[]
    }
  },
  stats: {
    totalPosts: number,
    successfulPosts: number,
    failedPosts: number,
    successRate: number,
    postsByPlatform: {
      [platform: string]: number
    },
    supportedPlatforms: string[]
  }
}
```

---

## 4. Codes d'erreur

| Code | Description |
|------|-------------|
| `invalid-argument` | Parametre manquant ou invalide |
| `internal` | Erreur serveur interne |
| `resource-exhausted` | Limites atteintes |
| `unavailable` | Service temporairement indisponible |

---

## 5. Rate Limits

### AI Providers

| Provider | Limite | Reset |
|----------|--------|-------|
| Groq | 14,400/jour | Minuit UTC |
| OpenRouter | 1,000/jour | Minuit UTC |
| Gemini | 1,000/jour | Minuit UTC |

### Email Enrichment

| Provider | Limite | Reset |
|----------|--------|-------|
| Derrick | 200/mois | 1er du mois |
| Apollo | 60/mois | 1er du mois |
| Hunter | 50/mois | 1er du mois |

### Posting

| Provider | Limite | Reset |
|----------|--------|-------|
| Postiz | Illimite | - |
| Late | 20/mois | 1er du mois |

---

## 6. Frontend Integration

### Puter.js (Client-Side AI)

Pour une utilisation illimitee cote client :

```html
<!-- Ajouter dans index.html -->
<script src="https://js.puter.com/v2/"></script>
```

```javascript
// Utilisation
const response = await window.puter.ai.chat('Votre prompt ici')
```

L'utilisateur se connecte a son propre compte Puter et paie ses propres tokens.

---

## 7. Webhooks (Future)

Les webhooks pour les evenements (post publie, email enrichi, etc.) seront disponibles dans une future version.
