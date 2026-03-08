/**
 * alexVoiceTools.js — Vapi custom tools for Alex Voice
 *
 * Defines 4 tools that Vapi can call during a conversation:
 *   1. scheduleCallback  — Planifier un rappel
 *   2. markAsInterested  — Marquer le lead comme interesse
 *   3. markAsDisqualified — Disqualifier le lead
 *   4. transferToHuman   — Transferer vers un humain
 *
 * Vapi calls the webhook URL with tool-calls messages.
 * The vapiWebhookHandler processes these and returns results.
 */

/**
 * Build Vapi tool definitions for Alex Voice.
 *
 * @param {string} webhookBaseUrl - Base URL du webhook (ex: https://europe-west1-face-media-factory.cloudfunctions.net/alexVoiceWebhook)
 * @returns {Array<Object>} Vapi tool definitions
 */
export function buildVapiTools(webhookBaseUrl) {
  return [
    {
      type: 'function',
      function: {
        name: 'scheduleCallback',
        description: 'Planifie un rappel quand le prospect propose un autre creneau ou dit "rappelez-moi". Utilise cette fonction IMMEDIATEMENT quand le prospect mentionne un autre moment.',
        parameters: {
          type: 'object',
          properties: {
            callbackDate: {
              type: 'string',
              description: 'Date et heure du rappel souhaitee (ISO 8601, ex: 2026-03-15T10:00:00)',
            },
            reason: {
              type: 'string',
              description: 'Raison du rappel (ex: "prospect en reunion, libre apres 15h")',
            },
          },
          required: ['reason'],
        },
      },
      server: {
        url: webhookBaseUrl,
      },
      messages: [
        {
          type: 'request-start',
          content: 'Je note ca...',
        },
        {
          type: 'request-complete',
          content: 'C\'est note, on se rappelle au moment convenu.',
        },
        {
          type: 'request-failed',
          content: 'Pas de souci, je vous recontacte bientot.',
        },
      ],
    },
    {
      type: 'function',
      function: {
        name: 'markAsInterested',
        description: 'Marque le prospect comme interesse quand il pose des questions sur l\'offre, demande un devis, veut en savoir plus, ou accepte un rendez-vous.',
        parameters: {
          type: 'object',
          properties: {
            interestLevel: {
              type: 'string',
              enum: ['hot', 'warm'],
              description: 'hot = veut un RDV/devis, warm = curieux mais pas encore decide',
            },
            notes: {
              type: 'string',
              description: 'Details de l\'interet exprime',
            },
          },
          required: ['interestLevel'],
        },
      },
      server: {
        url: webhookBaseUrl,
      },
      messages: [
        {
          type: 'request-start',
          content: '',
        },
        {
          type: 'request-complete',
          content: '',
        },
      ],
    },
    {
      type: 'function',
      function: {
        name: 'markAsDisqualified',
        description: 'Disqualifie le prospect s\'il demande explicitement de ne plus etre contacte, s\'il n\'est pas le bon interlocuteur, ou si l\'entreprise a ferme.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              enum: ['not_interested', 'wrong_person', 'business_closed', 'do_not_call'],
              description: 'Raison de la disqualification',
            },
            details: {
              type: 'string',
              description: 'Details supplementaires',
            },
          },
          required: ['reason'],
        },
      },
      server: {
        url: webhookBaseUrl,
      },
      messages: [
        {
          type: 'request-start',
          content: '',
        },
        {
          type: 'request-complete',
          content: 'Je comprends parfaitement. Je vous souhaite une excellente journee.',
        },
      ],
    },
    {
      type: 'function',
      function: {
        name: 'transferToHuman',
        description: 'Transfere l\'appel a un humain quand le prospect veut parler a une vraie personne, quand une negociation complexe est necessaire, ou quand le prospect est tres interesse (signal d\'achat chaud).',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Raison du transfert',
            },
            urgency: {
              type: 'string',
              enum: ['immediate', 'normal'],
              description: 'immediate = prospect tres chaud, normal = demande standard',
            },
          },
          required: ['reason'],
        },
      },
      server: {
        url: webhookBaseUrl,
      },
      messages: [
        {
          type: 'request-start',
          content: 'Bien sur, je transfere a mon collegue tout de suite.',
        },
        {
          type: 'request-complete',
          content: 'Le transfert est en cours, restez en ligne.',
        },
        {
          type: 'request-failed',
          content: 'Mon collegue n\'est pas disponible immediatement, il vous rappelle dans les 15 minutes.',
        },
      ],
    },
  ]
}
