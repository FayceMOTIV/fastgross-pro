import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'

const db = getFirestore()

/**
 * Cloud Function: generateSequence
 * Génère une séquence d'emails personnalisés via Claude AI
 */
export const generateSequence = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Vous devez être connecté')
    }

    const { clientId, scanId, tone = 'expert', emailCount = 4 } = request.data
    if (!clientId) {
      throw new HttpsError('invalid-argument', 'clientId requis')
    }

    try {
      // Get client data
      const clientDoc = await db.collection('clients').doc(clientId).get()
      if (!clientDoc.exists) {
        throw new HttpsError('not-found', 'Client non trouvé')
      }
      const clientData = clientDoc.data()

      // Get latest scan data if available
      let scanData = null
      if (scanId) {
        const scanDoc = await db
          .collection('clients')
          .doc(clientId)
          .collection('scans')
          .doc(scanId)
          .get()
        if (scanDoc.exists) {
          scanData = scanDoc.data()
        }
      } else if (clientData.lastScanId) {
        const scanDoc = await db
          .collection('clients')
          .doc(clientId)
          .collection('scans')
          .doc(clientData.lastScanId)
          .get()
        if (scanDoc.exists) {
          scanData = scanDoc.data()
        }
      }

      // Generate sequence with Claude
      const emails = await generateWithClaude(clientData, scanData, tone, emailCount)

      return { emails, clientId, tone, emailCount }
    } catch (error) {
      console.error('Generate sequence error:', error)
      throw new HttpsError('internal', `Erreur: ${error.message}`)
    }
  }
)

/**
 * Génère les emails avec Claude AI
 */
async function generateWithClaude(clientData, scanData, tone, emailCount) {
  const client = new Anthropic()

  const toneInstructions = {
    expert: `Ton EXPERT : Tu es un spécialiste reconnu. Chaque email doit positionner l'expéditeur comme une autorité. 
    Utilise des données, des insights marché, et des observations précises sur l'entreprise du prospect.
    Pas de vente directe — juste de l'expertise qui donne envie d'en savoir plus.`,

    friendly: `Ton AMICAL : Approche décontractée et humaine. Comme si tu écrivais à un futur collègue.
    Utilise l'humour subtil, sois direct et transparent. Évite le jargon commercial.
    L'objectif est de créer une connexion personnelle avant de parler business.`,

    challenger: `Ton CHALLENGER : Remise en question constructive. Chaque email doit provoquer une réflexion.
    Commence par une observation surprenante sur leur secteur ou leur stratégie.
    L'objectif est que le prospect se dise "il/elle a raison, je devrais creuser ça".`,

    storyteller: `Ton STORYTELLER : Chaque email raconte une mini-histoire. Un cas client, une anecdote, une métaphore.
    L'objectif est d'engager émotionnellement avant de convaincre rationnellement.
    Utilise des cliffhangers entre les emails pour donner envie de lire le suivant.`,
  }

  const scanContext = scanData
    ? `
ANALYSE DU SITE CLIENT:
- Positionnement: ${scanData.positioning}
- Persona idéal: ${scanData.idealPersona}
- Arguments clés: ${scanData.keyArguments?.join(', ')}
- USP: ${scanData.uniqueSellingPoints?.join(', ')}
- Phrases d'accroche suggérées: ${scanData.suggestedIcebreakers?.join(' | ')}
- Insight marché: ${scanData.marketInsight}
`
    : ''

  const prompt = `Tu es un copywriter expert en cold emailing B2B avec 15 ans d'expérience.
Tu dois créer une séquence de ${emailCount} emails pour prospecter des clients pour cette entreprise:

NOM DU CLIENT: ${clientData.name}
SITE WEB: ${clientData.url || 'Non renseigné'}
${scanContext}

INSTRUCTIONS DE TON:
${toneInstructions[tone] || toneInstructions.expert}

RÈGLES ABSOLUES:
1. Les variables personnalisées utilisent cette syntaxe: {prénom}, {entreprise}, {signature}
2. Chaque email fait entre 80 et 150 mots MAX. Court = lu.
3. L'objet de chaque email fait max 8 mots. Pas de majuscules. Pas de ponctuation abusive.
4. Le premier email ne vend RIEN. Il apporte de la valeur.
5. Le dernier email est un "breakup email" — dernier message, pas de pression.
6. Espace les envois: Jour 1, Jour 3, Jour 6, Jour 10 (ou similaire).
7. Chaque email a un seul CTA (call-to-action) clair.
8. AUCUN email ne commence par "J'espère que vous allez bien" ou "Je me permets de".

Réponds UNIQUEMENT en JSON avec cette structure:
{
  "emails": [
    {
      "subject": "objet de l'email",
      "body": "corps de l'email avec les variables {prénom}, {entreprise}, {signature}",
      "delay": "Jour X",
      "cta": "Description du CTA",
      "psychologyNote": "Principe psychologique utilisé (ex: curiosité, preuve sociale, urgence)"
    }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].text
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Could not parse AI response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  return parsed.emails
}
