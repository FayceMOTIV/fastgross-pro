/**
 * Typefully Service — FMF Social Content Automation
 * Basé sur le skill officiel typefully/agent-skills
 * Objectif : Chauffer les prospects via contenu de marque AVANT le cold DM
 */

const TYPEFULLY_API_BASE = 'https://api.typefully.com/v1';

export class TypefullyService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.TYPEFULLY_API_KEY;
    if (!this.apiKey) throw new Error('TYPEFULLY_API_KEY requis');
  }

  async _request(method, path, body = null) {
    const res = await fetch(`${TYPEFULLY_API_BASE}${path}`, {
      method,
      headers: {
        'X-API-KEY': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Typefully API ${res.status}: ${err}`);
    }
    return res.json();
  }

  /**
   * Crée un brouillon sur Typefully
   * @param {string} content - Texte du post
   * @param {string[]} platforms - ['twitter-threads', 'linkedin', 'threads', 'bluesky']
   * @param {Date|null} scheduledAt - null = pas programmé, Date = heure publication
   * @param {string} accountId - ID du compte Typefully client
   */
  async createDraft(content, platforms = ['linkedin'], scheduledAt = null, accountId = null) {
    const payload = {
      content,
      platforms,
      threadify: false,
    };
    if (scheduledAt) {
      payload.schedule_date = scheduledAt.toISOString();
    }
    if (accountId) {
      payload.account_id = accountId;
    }
    return this._request('POST', '/drafts/', payload);
  }

  /**
   * Publie immédiatement un brouillon existant
   */
  async publishNow(draftId) {
    return this._request('POST', `/drafts/${draftId}/publish/`);
  }

  /**
   * Récupère les analytics d'un profil Typefully
   */
  async getAnalytics(accountId) {
    return this._request('GET', `/profiles/${accountId}/analytics/`);
  }

  /**
   * Récupère les derniers posts publiés (pour détecter les engagements)
   */
  async getRecentPosts(limit = 20) {
    return this._request('GET', `/drafts/?published=true&limit=${limit}`);
  }

  /**
   * Programme une semaine de contenu complet pour un client
   * Génère 5 posts via Groq + les programme sur Typefully
   * @param {string} orgId - ID Firestore de l'organisation
   * @param {string} industry - industrie du client (restaurant, immobilier, etc.)
   * @param {object[]} prospects - liste des prospects pour contextualiser le contenu
   * @param {object} groqService - instance GroqService
   * @param {object} db - instance Firestore
   */
  async scheduleWeekContent(orgId, industry, prospects, groqService, db) {
    const SCHEDULE = [
      { day: 1, hour: 8, platform: 'linkedin' },   // Lundi 8h
      { day: 2, hour: 12, platform: 'twitter-threads' }, // Mardi 12h
      { day: 3, hour: 8, platform: 'linkedin' },   // Mercredi 8h
      { day: 4, hour: 12, platform: 'twitter-threads' }, // Jeudi 12h
      { day: 5, hour: 10, platform: 'linkedin' },  // Vendredi 10h
    ];

    // Trouver le prochain lundi
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const createdPosts = [];

    for (const slot of SCHEDULE) {
      const scheduledAt = new Date(nextMonday);
      scheduledAt.setDate(nextMonday.getDate() + (slot.day - 1));
      scheduledAt.setHours(slot.hour, 0, 0, 0);

      // Générer contenu via Groq
      const content = await groqService.generateSocialContent({
        industry,
        platform: slot.platform,
        prospects: prospects.slice(0, 5), // Top 5 pour contexte
        tone: 'expert_helpful',
        goal: 'attract_b2b_prospects',
      });

      // Programmer sur Typefully
      const draft = await this.createDraft(
        content.text,
        [slot.platform],
        scheduledAt
      );

      // Sauvegarder dans Firestore
      const postRef = db.collection(`organizations/${orgId}/socialContent`).doc();
      await postRef.set({
        content: content.text,
        platform: slot.platform,
        scheduledAt: scheduledAt,
        typefullyDraftId: draft.id,
        status: 'scheduled',
        engagements: [],
        createdAt: new Date(),
        week: nextMonday.toISOString().split('T')[0],
      });

      createdPosts.push({ draftId: draft.id, platform: slot.platform, scheduledAt });
    }

    return {
      success: true,
      posts: createdPosts,
      week: nextMonday.toISOString().split('T')[0],
    };
  }
}

// ─── Warm Lead Detector ──────────────────────────────────────────────────────

/**
 * Traite les webhooks Typefully pour détecter les prospects chauds
 * À utiliser dans une Cloud Function HTTP POST /webhooks/typefully
 */
export async function handleTypefullyWebhook(webhookPayload, db, bullQueues) {
  const { event, draft_id, engagement } = webhookPayload;

  if (!['like', 'comment', 'repost', 'reply'].includes(event)) return;

  // Chercher le post dans Firestore
  const postsSnap = await db.collectionGroup('socialContent')
    .where('typefullyDraftId', '==', draft_id)
    .limit(1)
    .get();

  if (postsSnap.empty) return;

  const postDoc = postsSnap.docs[0];
  const orgId = postDoc.ref.path.split('/')[1];

  // Chercher le prospect par username social
  const { actor_username, actor_name, platform } = engagement;

  const prospectsSnap = await db.collection(`organizations/${orgId}/prospects`)
    .where('instagram', '==', actor_username)
    .limit(1)
    .get();

  let prospectRef;

  if (!prospectsSnap.empty) {
    prospectRef = prospectsSnap.docs[0].ref;

    // Augmenter le score du prospect
    const prospectData = prospectsSnap.docs[0].data();
    const intentBonus = { like: 15, comment: 30, repost: 25, reply: 35 }[event] || 10;

    await prospectRef.update({
      score: Math.min(100, (prospectData.score || 50) + intentBonus),
      'engagement.socialInteractions': [...(prospectData.engagement?.socialInteractions || []), {
        type: event,
        platform,
        postId: draft_id,
        at: new Date().toISOString(),
      }],
      intentLabel: `A ${event === 'like' ? 'aime' : 'commente'} votre post ${platform}`,
    });

    // Push dans la queue d'orchestration avec priorité haute
    if (bullQueues?.orchestrator) {
      await bullQueues.orchestrator.add('warm-followup', {
        orgId,
        prospectId: prospectsSnap.docs[0].id,
        trigger: 'social_engagement',
        event,
        platform,
      }, {
        priority: 10, // Haute priorité — prospect chaud
        jobId: `warm-${orgId}-${prospectsSnap.docs[0].id}-${Date.now()}`,
      });
    }
  } else {
    // Nouveau prospect découvert via engagement social !
    const newProspectRef = db.collection(`organizations/${orgId}/prospects`).doc();
    await newProspectRef.set({
      name: actor_name,
      socialUsername: actor_username,
      platform,
      score: 65, // Score de base élevé car déjà engagé
      status: 'warm_inbound',
      source: 'social_engagement',
      engagement: {
        socialInteractions: [{ type: event, platform, postId: draft_id, at: new Date().toISOString() }],
      },
      intentLabel: `Engage spontanement sur votre contenu ${platform}`,
      createdAt: new Date(),
    });
  }

  // Update le post avec cet engagement
  await postDoc.ref.update({
    engagements: [...(postDoc.data().engagements || []), {
      type: event,
      actor: actor_username,
      at: new Date().toISOString(),
    }],
  });

  return { processed: true, prospectFound: !prospectsSnap.empty };
}
