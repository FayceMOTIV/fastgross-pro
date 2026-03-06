// ─────────────────────────────────────────────────────
// PIPELINE INTERNATIONAL — EN SOMMEIL
// Active uniquement sur demande explicite du client
// ("societe etrangere sur demande" dans l'interface)
//
// Providers prevus : Hunter.io, Apollo.io, LinkedIn
// Cles API requises : HUNTER_API_KEY, APOLLO_API_KEY
// ─────────────────────────────────────────────────────

export const INTERNATIONAL_ENABLED = process.env.INTERNATIONAL_SOURCING_ENABLED === 'true'

export async function runPipelineInternational(sector, city, country, limit, orgId) {
  if (!INTERNATIONAL_ENABLED) {
    throw new Error(
      'INTERNATIONAL_DISABLED: Ce pipeline est disponible sur demande. Contactez-nous pour activer la prospection internationale.'
    )
  }

  // TODO : Implementer quand HUNTER_API_KEY et APOLLO_API_KEY seront configures
  // strategy 1 : Hunter.io domain search
  // strategy 2 : Apollo.io people search
  // strategy 3 : LinkedIn scraping (Apify)

  throw new Error('NOT_IMPLEMENTED: Contactez support@face-media-factory.com')
}
