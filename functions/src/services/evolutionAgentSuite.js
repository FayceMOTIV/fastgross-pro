/**
 * Evolution API — Suite 3 modules (inspiré gokapso agent-skills)
 * evolutionIntegrate + evolutionAutomate + evolutionObserve
 */

const EVOLUTION_BASE = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// ─── INTEGRATE — Connexion & Setup ──────────────────────────────────────────

export const evolutionIntegrate = {
  async _req(method, path, body = null) {
    const res = await fetch(`${EVOLUTION_BASE}${path}`, {
      method,
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`);
    return res.json();
  },

  /**
   * Configure le webhook Evolution pour recevoir les statuts de messages
   */
  async setupWebhook(instanceName, webhookUrl) {
    return this._req('POST', `/webhook/set/${instanceName}`, {
      url: webhookUrl,
      webhook_by_events: true,
      events: [
        'APPLICATION_STARTUP',
        'MESSAGES_UPSERT',    // Nouveau message reçu (réponse prospect)
        'MESSAGES_UPDATE',    // Statut message (envoyé, reçu, lu)
        'SEND_MESSAGE',       // Confirmation d'envoi
        'CONNECTION_UPDATE',  // Connexion/déconnexion
        'QRCODE_UPDATED',     // Nouveau QR code
      ],
    });
  },

  /**
   * Vérifie si une instance est connectée
   */
  async validateInstance(instanceName) {
    try {
      const status = await this._req('GET', `/instance/connectionState/${instanceName}`);
      return {
        connected: status.instance?.state === 'open',
        state: status.instance?.state,
        instanceName,
      };
    } catch (e) {
      return { connected: false, state: 'error', error: e.message };
    }
  },

  /**
   * Récupère le QR code si l'instance est déconnectée
   */
  async getQRCode(instanceName) {
    return this._req('GET', `/instance/connect/${instanceName}`);
  },

  /**
   * Tentative de reconnexion automatique
   */
  async reconnect(instanceName) {
    try {
      await this._req('DELETE', `/instance/logout/${instanceName}`);
      await new Promise(r => setTimeout(r, 2000));
      return this._req('GET', `/instance/connect/${instanceName}`);
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /**
   * Crée une nouvelle instance Evolution API pour un client
   */
  async createInstance(instanceName, webhookUrl) {
    const instance = await this._req('POST', '/instance/create', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
    if (webhookUrl) await this.setupWebhook(instanceName, webhookUrl);
    return instance;
  },
};


// ─── AUTOMATE — Envoi Intelligent ───────────────────────────────────────────

export const evolutionAutomate = {
  /**
   * Envoi avec retry et backoff exponentiel
   */
  async sendWithRetry(instanceName, to, message, maxRetries = 3) {
    const phone = to.replace(/\D/g, '') + (to.includes('@') ? '' : '@s.whatsapp.net');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await evolutionIntegrate._req('POST', `/message/sendText/${instanceName}`, {
          number: phone,
          text: message,
          delay: Math.floor(Math.random() * 2000) + 1000, // 1-3s délai "typing"
        });
        return { success: true, messageId: result.key?.id, attempt };
      } catch (e) {
        if (attempt === maxRetries) return { success: false, error: e.message, attempt };
        const backoff = [60000, 300000, 1800000][attempt - 1]; // 1min, 5min, 30min
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  },

  /**
   * Envoie un lot de messages avec délai humain entre chaque
   * @param {object[]} messages - [{ instanceName, to, message }]
   * @param {number} minDelay - délai min en ms (défaut 3000)
   * @param {number} maxDelay - délai max en ms (défaut 7000)
   */
  async sendBatch(messages, minDelay = 3000, maxDelay = 7000) {
    const results = [];
    for (const msg of messages) {
      const result = await this.sendWithRetry(msg.instanceName, msg.to, msg.message);
      results.push(result);

      // Délai humain aléatoire entre chaque message
      const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      await new Promise(r => setTimeout(r, delay));

      // Pause longue toutes les 20 messages (anti-ban)
      if (results.length % 20 === 0) {
        await new Promise(r => setTimeout(r, 2 * 60 * 60 * 1000)); // 2h pause
      }
    }
    return results;
  },

  /**
   * Vérifie si le quota journalier est atteint
   * @returns {boolean} true si on peut encore envoyer
   */
  async checkDailyLimit(db, orgId, instanceName, dailyMax = 60) {
    const today = new Date().toISOString().split('T')[0];
    const countDoc = await db
      .doc(`organizations/${orgId}/whatsappStats/${today}-${instanceName}`)
      .get();

    const count = countDoc.exists ? countDoc.data().sent || 0 : 0;
    return { canSend: count < dailyMax, current: count, max: dailyMax };
  },

  /**
   * Incrémente le compteur journalier après un envoi
   */
  async incrementDailyCount(db, orgId, instanceName) {
    const today = new Date().toISOString().split('T')[0];
    const ref = db.doc(`organizations/${orgId}/whatsappStats/${today}-${instanceName}`);
    const doc = await ref.get();

    if (!doc.exists) {
      await ref.set({ sent: 1, date: today, instanceName, orgId });
    } else {
      await ref.update({ sent: (doc.data().sent || 0) + 1 });
    }
  },

  /**
   * Génère des variantes légères d'un message pour éviter la détection spam
   * Remplace quelques mots et change légèrement la ponctuation
   */
  buildHumanizedMessage(template, prospect) {
    let msg = template
      .replace('{name}', prospect.directorFirstName || prospect.name?.split(' ')[0] || '')
      .replace('{company}', prospect.name || '')
      .replace('{intentLabel}', prospect.intentLabel || '');

    // Variantes légères au hasard
    const variants = [
      [' :', ' :'],
      ['Bonjour', 'Bonsoir'],
      ['!', '.'],
      [' je ', ' j\''],
    ];

    if (Math.random() > 0.5) {
      const v = variants[Math.floor(Math.random() * variants.length)];
      msg = msg.replace(v[0], v[1]);
    }

    return msg;
  },
};


// ─── OBSERVE — Monitoring & Alertes ─────────────────────────────────────────

export const evolutionObserve = {
  /**
   * Vérifie la santé d'une instance
   */
  async checkInstanceHealth(instanceName) {
    const status = await evolutionIntegrate.validateInstance(instanceName);
    return {
      instanceName,
      connected: status.connected,
      state: status.state,
      healthy: status.connected,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Calcule le risque de ban basé sur les stats d'envoi
   * Retourne un score 0-100 (100 = ban imminent)
   */
  async getBanRisk(db, orgId, instanceName, days = 7) {
    const stats = await this.getDeliveryStats(db, orgId, instanceName, days);

    let risk = 0;

    // Ratio messages non lus (> 70% = suspect)
    const readRate = stats.totalRead / Math.max(stats.totalSent, 1);
    if (readRate < 0.3) risk += 30;
    else if (readRate < 0.5) risk += 15;

    // Ratio réponses (< 5% = suspect pour cold)
    const replyRate = stats.totalReplied / Math.max(stats.totalSent, 1);
    if (replyRate < 0.03) risk += 20;

    // Volume quotidien moyen (> 50/jour = risqué)
    const avgDaily = stats.totalSent / days;
    if (avgDaily > 60) risk += 30;
    else if (avgDaily > 45) risk += 15;

    // Si instance déconnectée = score max
    const health = await this.checkInstanceHealth(instanceName);
    if (!health.connected) risk = 100;

    return {
      instanceName,
      riskScore: Math.min(100, risk),
      riskLevel: risk > 80 ? 'critical' : risk > 60 ? 'high' : risk > 40 ? 'medium' : 'low',
      stats,
    };
  },

  /**
   * Envoie une alerte si le risque de ban dépasse un seuil
   */
  async alertIfUnhealthy(db, orgId, instanceName, threshold = 80) {
    const risk = await this.getBanRisk(db, orgId, instanceName);

    if (risk.riskScore >= threshold) {
      // Sauvegarder l'alerte dans Firestore
      await db.collection(`organizations/${orgId}/alerts`).add({
        type: 'whatsapp_ban_risk',
        instanceName,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        message: `Instance ${instanceName} — risque ban ${risk.riskScore}%. Réduire le volume.`,
        createdAt: new Date(),
        resolved: false,
      });

      return { alerted: true, risk };
    }
    return { alerted: false, risk };
  },

  /**
   * Récupère les statistiques de délivraison sur N jours
   */
  async getDeliveryStats(db, orgId, instanceName, days = 7) {
    const stats = { totalSent: 0, totalRead: 0, totalReplied: 0, totalFailed: 0 };

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const doc = await db
        .doc(`organizations/${orgId}/whatsappStats/${dateStr}-${instanceName}`)
        .get();

      if (doc.exists) {
        const d = doc.data();
        stats.totalSent += d.sent || 0;
        stats.totalRead += d.read || 0;
        stats.totalReplied += d.replied || 0;
        stats.totalFailed += d.failed || 0;
      }
    }

    return stats;
  },

  /**
   * Met à jour les stats quand un message est lu ou reçoit une réponse
   * À appeler depuis le webhook Evolution
   */
  async updateStatsFromWebhook(db, orgId, instanceName, event) {
    const today = new Date().toISOString().split('T')[0];
    const ref = db.doc(`organizations/${orgId}/whatsappStats/${today}-${instanceName}`);

    const updates = {};
    if (event === 'MESSAGE_READ') updates.read = (await ref.get()).data()?.read + 1 || 1;
    if (event === 'MESSAGE_REPLIED') updates.replied = (await ref.get()).data()?.replied + 1 || 1;

    if (Object.keys(updates).length > 0) await ref.update(updates);
  },
};
