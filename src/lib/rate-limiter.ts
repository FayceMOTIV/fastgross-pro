/**
 * Rate Limiter pour les APIs
 * Protège les routes sensibles (OpenAI, email, etc.)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en mémoire (en prod, utiliser Redis)
const rateLimits = new Map<string, RateLimitEntry>();

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (now > value.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 60000); // Toutes les minutes

/**
 * Vérifie si un utilisateur peut effectuer une action
 * @param identifier - ID unique (userId, IP, etc.)
 * @param limit - Nombre max de requêtes
 * @param windowMs - Fenêtre de temps en ms
 * @returns true si autorisé, false si limite atteinte
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimits.get(identifier);

  // Nouvelle entrée ou fenêtre expirée
  if (!entry || now > entry.resetTime) {
    rateLimits.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Limite atteinte
  if (entry.count >= limit) {
    return false;
  }

  // Incrémenter le compteur
  entry.count++;
  return true;
}

/**
 * Obtient les infos de rate limit pour un utilisateur
 */
export function getRateLimitInfo(identifier: string): {
  remaining: number;
  resetIn: number;
  limit: number;
} {
  const entry = rateLimits.get(identifier);
  const defaultLimit = 10;

  if (!entry) {
    return { remaining: defaultLimit, resetIn: 0, limit: defaultLimit };
  }

  const remaining = Math.max(0, defaultLimit - entry.count);
  const resetIn = Math.max(0, entry.resetTime - Date.now());

  return { remaining, resetIn, limit: defaultLimit };
}

/**
 * Réinitialise le rate limit pour un utilisateur
 */
export function resetRateLimit(identifier: string): void {
  rateLimits.delete(identifier);
}

// ============================================
// LIMITES PAR TYPE D'API
// ============================================

export const RATE_LIMITS = {
  // OpenAI APIs (coûteuses)
  SCAN_MENU: { limit: 5, windowMs: 60000 },      // 5/min
  CHAT_AI: { limit: 20, windowMs: 60000 },       // 20/min
  PROSPECTION: { limit: 10, windowMs: 60000 },   // 10/min

  // Email APIs
  EMAIL_SEND: { limit: 10, windowMs: 300000 },   // 10/5min

  // Auth APIs
  LOGIN: { limit: 5, windowMs: 300000 },         // 5/5min
  REGISTER: { limit: 3, windowMs: 3600000 },     // 3/heure

  // General APIs
  DEFAULT: { limit: 100, windowMs: 60000 },      // 100/min
};

/**
 * Helper pour vérifier avec les limites prédéfinies
 */
export function checkApiRateLimit(
  identifier: string,
  apiType: keyof typeof RATE_LIMITS
): boolean {
  const config = RATE_LIMITS[apiType] || RATE_LIMITS.DEFAULT;
  return checkRateLimit(identifier, config.limit, config.windowMs);
}

/**
 * Middleware helper pour NextJS API routes
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  apiType: keyof typeof RATE_LIMITS = 'DEFAULT'
) {
  return async (req: Request): Promise<Response> => {
    // Extraire l'identifiant (user ID ou IP)
    const userId = req.headers.get('x-user-id');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || 'unknown';
    const identifier = userId || ip;

    if (!checkApiRateLimit(identifier, apiType)) {
      const info = getRateLimitInfo(identifier);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Trop de requêtes. Veuillez réessayer.',
          retryAfter: Math.ceil(info.resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(info.remaining),
            'X-RateLimit-Reset': String(Math.ceil(info.resetIn / 1000)),
            'Retry-After': String(Math.ceil(info.resetIn / 1000)),
          },
        }
      );
    }

    return handler(req);
  };
}
