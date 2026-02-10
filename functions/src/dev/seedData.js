import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const getDb = () => getFirestore()

/**
 * Cloud Function: seedData
 * Peuple Firestore avec des données de démo
 * ATTENTION: À utiliser uniquement en dev
 */
export const seedData = onRequest(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
  },
  async (req, res) => {
    const db = getDb()
    // Only allow in development/emulator environment
    if (process.env.FUNCTIONS_EMULATOR !== 'true' && process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Cette fonction est désactivée en production' })
      return
    }

    try {
      const orgId = 'demo-org-001'
      const userId = 'demo-user-001'
      const now = new Date()

      // 1. Create demo organization
      await db.collection('organizations').doc(orgId).set({
        name: 'Agence Demo',
        ownerId: userId,
        plan: 'pro',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        settings: {
          emailsPerMonth: 1000,
          maxClients: 3,
          features: ['scanner', 'forgeur', 'radar', 'proof'],
        },
        senderName: 'Jean de Agence Demo',
        senderEmail: 'contact@agence-demo.fr',
        emailSignature: 'Cordialement,\nJean Dupont\nAgence Demo\n01 23 45 67 89',
      })

      // Add owner as member
      await db.collection('organizations').doc(orgId).collection('members').doc(userId).set({
        uid: userId,
        email: 'demo@facemedia.fr',
        displayName: 'Jean Dupont',
        role: 'owner',
        joinedAt: FieldValue.serverTimestamp(),
      })

      // 2. Create demo user profile
      await db.collection('users').doc(userId).set({
        uid: userId,
        email: 'demo@facemedia.fr',
        displayName: 'Jean Dupont',
        photoURL: '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        onboardingComplete: true,
        goal: 'agency',
      })

      // 3. Create 3 demo clients
      const clients = [
        {
          id: 'client-001',
          name: 'TechStart Agency',
          url: 'https://techstart.io',
          status: 'scanned',
          positioning: 'Agence de développement web spécialisée dans les startups tech. Expertise en React, Node.js et applications mobiles.',
          idealPersona: 'Fondateurs de startups tech en phase de scale, CTOs de PME digitales, Directeurs produit cherchant un partenaire technique.',
        },
        {
          id: 'client-002',
          name: 'GrowthLab',
          url: 'https://growthlab.fr',
          status: 'scanned',
          positioning: 'Cabinet de conseil en growth marketing. Spécialiste acquisition B2B via LinkedIn et cold email.',
          idealPersona: 'Directeurs marketing de SaaS B2B, Fondateurs cherchant à accélérer leur acquisition, CMOs de scale-ups.',
        },
        {
          id: 'client-003',
          name: 'DataPulse',
          url: 'https://datapulse.ai',
          status: 'new',
          positioning: '',
          idealPersona: '',
        },
      ]

      for (const client of clients) {
        await db.collection('clients').doc(client.id).set({
          ...client,
          orgId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastScanAt: client.status === 'scanned' ? FieldValue.serverTimestamp() : null,
        })
      }

      // 4. Create 20 demo leads with varied scores
      const firstNames = ['Marie', 'Thomas', 'Julie', 'Pierre', 'Sophie', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Nathan', 'Camille', 'Louis', 'Chloé', 'Gabriel', 'Manon', 'Raphaël', 'Inès', 'Arthur', 'Jade', 'Mathis']
      const lastNames = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier']
      const companies = ['StartupX', 'TechCorp', 'DataFlow', 'CloudNine', 'InnoVision', 'ScaleUp', 'GrowthHub', 'DigitalFirst', 'NextGen', 'FutureLab']
      const jobTitles = ['CEO', 'CTO', 'CMO', 'Head of Growth', 'Directeur Commercial', 'Fondateur', 'Product Manager', 'VP Marketing', 'Sales Director', 'COO']
      const statuses = ['new', 'contacted', 'opened', 'replied', 'converted']

      for (let i = 0; i < 20; i++) {
        const firstName = firstNames[i]
        const lastName = lastNames[i]
        const score = Math.floor(Math.random() * 11)
        const status = score >= 8 ? statuses[3] : score >= 5 ? statuses[2] : score >= 2 ? statuses[1] : statuses[0]

        await db.collection('leads').doc(`lead-${String(i + 1).padStart(3, '0')}`).set({
          orgId,
          clientId: i < 10 ? 'client-001' : i < 15 ? 'client-002' : 'client-003',
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companies[i % companies.length].toLowerCase()}.com`,
          company: companies[i % companies.length],
          jobTitle: jobTitles[i % jobTitles.length],
          score,
          status,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastContactedAt: status !== 'new' ? FieldValue.serverTimestamp() : null,
          emailsSent: status !== 'new' ? Math.floor(Math.random() * 4) + 1 : 0,
          notes: score >= 7 ? 'Lead très engagé, à contacter rapidement' : '',
        })
      }

      // 5. Create 2 demo campaigns
      const campaigns = [
        {
          id: 'campaign-001',
          name: 'Séquence Expert - TechStart',
          clientId: 'client-001',
          tone: 'expert',
          status: 'active',
          emailCount: 4,
          emails: [
            {
              subject: 'Question rapide sur votre stratégie tech',
              body: `Bonjour {prénom},\n\nJ'ai analysé {entreprise} et votre approche technique. Impressionnant !\n\nJ'ai identifié 3 opportunités d'optimisation qui pourraient réduire vos coûts d'infrastructure de 30%.\n\nSeriez-vous ouvert à un échange de 15 min ?\n\n{signature}`,
              delay: 'Jour 1',
            },
            {
              subject: 'Re: Les 3 optimisations identifiées',
              body: `{prénom},\n\nJe reviens vers vous avec l'analyse promise pour {entreprise}.\n\nEn bref :\n→ Votre architecture actuelle génère 40% de coûts évitables\n→ La migration vers une stack serverless diviserait vos frais par 2\n→ Il y a un quick win sur le caching qui prendrait 2 jours\n\nJe peux vous présenter ça en détail ?\n\n{signature}`,
              delay: 'Jour 3',
            },
            {
              subject: 'Dossier technique prêt',
              body: `Bonjour {prénom},\n\nJ'ai finalisé le mini-audit technique de {entreprise}. 4 pages, concret, actionnable.\n\nPréférez-vous que je vous l'envoie par email ou qu'on en discute en visio ?\n\n{signature}`,
              delay: 'Jour 6',
            },
            {
              subject: 'Dernière relance - je ne vais pas insister',
              body: `{prénom},\n\nPas de nouvelles, je comprends que vous êtes occupé. C'est mon dernier message.\n\nSi un échange technique sur l'optimisation de {entreprise} vous intéresse plus tard, ma porte reste ouverte.\n\nRépondez "plus tard" et je vous recontacterai au moment qui vous convient.\n\n{signature}`,
              delay: 'Jour 10',
            },
          ],
        },
        {
          id: 'campaign-002',
          name: 'Séquence Amicale - GrowthLab',
          clientId: 'client-002',
          tone: 'friendly',
          status: 'draft',
          emailCount: 4,
          emails: [
            {
              subject: 'Hey, une idée pour votre growth',
              body: `Salut {prénom} !\n\nJe suis tombé sur {entreprise} en faisant ma veille et j'ai eu une idée qui pourrait vous faire gagner du temps sur votre acquisition.\n\nRien de commercial, juste un échange entre pros du growth. Ça vous dit ?\n\n{signature}`,
              delay: 'Jour 1',
            },
            {
              subject: 'L\'idée dont je vous parlais',
              body: `{prénom},\n\nVoici mon idée en version courte : j'ai remarqué que vos séquences LinkedIn génèrent beaucoup d'engagement mais peu de conversion.\n\nEn combinant avec du cold email ciblé, on peut facilement doubler le taux de réponse.\n\nJ'ai testé ça avec 3 clients récemment, résultats impressionnants.\n\nOn en parle ?\n\n{signature}`,
              delay: 'Jour 4',
            },
          ],
        },
      ]

      for (const campaign of campaigns) {
        await db.collection('campaigns').doc(campaign.id).set({
          ...campaign,
          orgId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      }

      // 6. Create 50 demo email events
      const eventTypes = ['sent', 'sent', 'sent', 'opened', 'opened', 'clicked', 'replied']
      for (let i = 0; i < 50; i++) {
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
        const leadIndex = Math.floor(Math.random() * 15) + 1

        await db.collection('emailEvents').add({
          type: eventType,
          leadId: `lead-${String(leadIndex).padStart(3, '0')}`,
          campaignId: 'campaign-001',
          orgId,
          emailIndex: Math.floor(Math.random() * 4),
          timestamp: FieldValue.serverTimestamp(),
        })
      }

      // 7. Create 3 demo reports
      const reports = [
        {
          clientId: 'client-001',
          clientName: 'TechStart Agency',
          period: 'month',
          periodLabel: 'Janvier 2026',
          stats: {
            totalLeads: 10,
            emailsSent: 42,
            opened: 28,
            clicked: 12,
            replied: 6,
            bounced: 2,
            openRate: 66.7,
            clickRate: 28.6,
            replyRate: 14.3,
            bounceRate: 4.8,
          },
          hotLeads: [
            { name: 'Marie Martin', company: 'StartupX', score: 9, status: 'replied' },
            { name: 'Thomas Bernard', company: 'TechCorp', score: 8, status: 'replied' },
          ],
          insights: [
            'Taux d\'ouverture de 66.7%, supérieur de 24% à la moyenne du secteur',
            '6 réponses obtenues dont 3 demandes de rendez-vous',
            'Le mardi 9h30 est le meilleur créneau d\'envoi pour cette cible',
            'L\'objet "Question rapide sur votre stratégie tech" performe à 78% d\'ouverture',
          ],
          estimatedValue: 7200,
        },
        {
          clientId: 'client-002',
          clientName: 'GrowthLab',
          period: 'month',
          periodLabel: 'Décembre 2025',
          stats: {
            totalLeads: 5,
            emailsSent: 18,
            opened: 10,
            clicked: 4,
            replied: 2,
            bounced: 1,
            openRate: 55.6,
            clickRate: 22.2,
            replyRate: 11.1,
            bounceRate: 5.6,
          },
          hotLeads: [
            { name: 'Pierre Thomas', company: 'CloudNine', score: 7, status: 'opened' },
          ],
          insights: [
            '5 leads générés ce mois, en phase de nurturing',
            '2 réponses positives, 1 rendez-vous pris',
            'La séquence "Amicale" performe mieux sur cette cible',
          ],
          estimatedValue: 2400,
        },
        {
          clientId: 'client-001',
          clientName: 'TechStart Agency',
          period: 'month',
          periodLabel: 'Décembre 2025',
          stats: {
            totalLeads: 8,
            emailsSent: 32,
            opened: 20,
            clicked: 8,
            replied: 4,
            bounced: 1,
            openRate: 62.5,
            clickRate: 25.0,
            replyRate: 12.5,
            bounceRate: 3.1,
          },
          hotLeads: [],
          insights: [
            'Mois de lancement, 32 emails envoyés',
            '4 réponses obtenues, pipeline en construction',
          ],
          estimatedValue: 4800,
        },
      ]

      for (const report of reports) {
        await db.collection('reports').add({
          ...report,
          orgId,
          generatedAt: FieldValue.serverTimestamp(),
        })
      }

      res.json({
        success: true,
        message: 'Données de démo créées avec succès',
        data: {
          organization: orgId,
          user: userId,
          clients: clients.length,
          leads: 20,
          campaigns: campaigns.length,
          emailEvents: 50,
          reports: reports.length,
        },
      })
    } catch (error) {
      console.error('Seed error:', error)
      res.status(500).json({ error: error.message })
    }
  }
)
