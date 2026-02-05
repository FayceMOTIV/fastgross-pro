export const demoSequences = {
  expert: {
    name: "Séquence Expert",
    description: "Approche d'autorité et d'expertise",
    icon: "Target",
    color: "brand",
    emails: [
      {
        subject: "Question rapide sur votre stratégie digitale",
        body: `Bonjour {prénom},

J'ai analysé {entreprise} et votre positionnement sur le marché. Ce qui m'a frappé, c'est la qualité de votre offre — mais je pense que votre visibilité en ligne ne lui rend pas justice.

J'ai identifié 3 leviers concrets qui pourraient doubler votre flux de prospects qualifiés en 60 jours. Pas de la théorie, des actions précises adaptées à votre secteur.

Seriez-vous ouvert à un échange de 15 min cette semaine ?

{signature}`,
        delay: "Jour 1",
        psychology: "Curiosité + Valeur immédiate"
      },
      {
        subject: "Les 3 leviers que j'ai identifiés pour {entreprise}",
        body: `{prénom},

Je me permets de revenir vers vous — j'ai finalisé l'analyse que j'avais commencée sur {entreprise}.

Concrètement, voici ce que j'ai trouvé :
→ Votre page d'accueil perd ~60% des visiteurs en moins de 3 secondes
→ Vos concurrents investissent massivement sur un canal que vous n'exploitez pas
→ Il y a une opportunité SEO inexploitée sur 12 mots-clés stratégiques

J'ai préparé un mini-audit gratuit de 2 pages. Voulez-vous que je vous l'envoie ?

{signature}`,
        delay: "Jour 3",
        psychology: "Preuve sociale + Réciprocité"
      },
      {
        subject: "L'audit de {entreprise} est prêt",
        body: `Bonjour {prénom},

Comme promis, j'ai finalisé le mini-audit pour {entreprise}. Il contient des recommandations actionnables que vous pouvez implémenter dès cette semaine.

Je préfère vous le présenter en 15 min plutôt que de l'envoyer par mail — les chiffres ont plus d'impact quand on peut en discuter.

Quel créneau vous conviendrait ?
• Mardi entre 10h et 12h
• Mercredi après 14h
• Ou proposez-moi le vôtre

{signature}`,
        delay: "Jour 6",
        psychology: "Engagement + Options limitées"
      },
      {
        subject: "Dernière relance — je ne vais pas insister",
        body: `{prénom},

Je comprends que votre agenda est chargé. C'est mon dernier message sur ce sujet.

Si un échange de 15 min sur la croissance de {entreprise} ne vous intéresse pas, aucun souci — je ne vous relancerai plus.

Mais si vous voulez en discuter dans les prochaines semaines/mois, ma porte reste ouverte. Répondez simplement "plus tard" et je vous recontacterai au moment qui vous convient.

Belle continuation,
{signature}`,
        delay: "Jour 10",
        psychology: "Rareté + Porte ouverte"
      }
    ]
  },

  friendly: {
    name: "Séquence Amicale",
    description: "Ton conversationnel et accessible",
    icon: "Heart",
    color: "pink",
    emails: [
      {
        subject: "Hello depuis Paris 👋",
        body: `Hey {prénom},

Je suis tombé sur {entreprise} en faisant ma veille et j'ai été impressionné. Franchement, vous faites les choses bien.

Je bosse avec des boîtes comme la vôtre pour les aider à générer plus de prospects — sans les méthodes pushy qui énervent tout le monde.

Ça vous dirait qu'on en discute autour d'un café virtuel de 15 min ?

À bientôt peut-être,
{signature}`,
        delay: "Jour 1",
        psychology: "Sympathie + Authenticité"
      },
      {
        subject: "Re: Petit truc qui pourrait vous intéresser",
        body: `{prénom},

Je repensais à {entreprise} ce matin (oui, j'ai une vie passionnante 😄).

J'ai noté 2-3 idées qui pourraient vous aider à générer plus de leads sans exploser votre budget marketing. Rien de révolutionnaire, juste du bon sens bien appliqué.

Si ça vous intéresse, je vous les partage volontiers. Sinon, pas de souci !

{signature}`,
        delay: "Jour 4",
        psychology: "Humour + Désengagement"
      },
      {
        subject: "Question rapide",
        body: `{prénom},

Juste pour savoir — est-ce que la croissance de {entreprise} est un sujet pour vous en ce moment ?

Si oui, je pense qu'on devrait discuter.
Si non, promis je vous laisse tranquille 🙂

{signature}`,
        delay: "Jour 7",
        psychology: "Simplicité + Respect"
      },
      {
        subject: "Ok, j'ai compris 😅",
        body: `{prénom},

Pas de réponse = message reçu 5/5.

Je ne vais pas vous spammer avec 47 relances. Mais si un jour vous cherchez quelqu'un pour booster votre acquisition, gardez mon email sous le coude.

Bonne continuation avec {entreprise} !

{signature}`,
        delay: "Jour 12",
        psychology: "Humour + Sortie élégante"
      }
    ]
  },

  challenger: {
    name: "Séquence Challenger",
    description: "Remise en question constructive",
    icon: "Zap",
    color: "amber",
    emails: [
      {
        subject: "Ce que vos concurrents font (et pas vous)",
        body: `{prénom},

J'ai passé 30 minutes à analyser {entreprise} et vos 3 principaux concurrents.

Résultat : ils investissent tous massivement sur un canal d'acquisition que vous ignorez complètement. Et ça leur rapporte gros.

Je ne dis pas que vous avez tort. Mais je me demande si c'est un choix stratégique ou un angle mort ?

Je peux vous montrer exactement ce qu'ils font en 15 min. Intéressé ?

{signature}`,
        delay: "Jour 1",
        psychology: "FOMO + Challenge"
      },
      {
        subject: "Question provocante",
        body: `{prénom},

Combien de prospects qualifiés {entreprise} génère par mois ?

Si la réponse est "pas assez" ou "je ne sais pas", on a un problème — et une opportunité.

Les entreprises que j'accompagne passent de "quelques leads par mois" à "plusieurs par semaine". La différence ? Une stratégie d'acquisition systématique.

On en parle ?

{signature}`,
        delay: "Jour 4",
        psychology: "Question directe + Promesse"
      },
      {
        subject: "Pourquoi vous perdez des clients",
        body: `{prénom},

Ce n'est pas votre offre le problème. C'est votre visibilité.

Chaque jour, des prospects qui auraient pu devenir clients de {entreprise} vont chez vos concurrents. Pas parce qu'ils sont meilleurs — mais parce qu'ils sont plus visibles.

Je peux vous montrer exactement où ça coince et comment corriger le tir.

15 min de votre temps. Zéro engagement. Juste des faits.

{signature}`,
        delay: "Jour 7",
        psychology: "Douleur + Solution"
      },
      {
        subject: "Dernière chance",
        body: `{prénom},

Je vais être direct : je pense que {entreprise} passe à côté d'une opportunité de croissance significative.

Soit j'ai tort, et tant mieux pour vous.
Soit j'ai raison, et vous perdez de l'argent chaque jour qui passe.

Un appel de 15 min pour en avoir le cœur net ?

{signature}`,
        delay: "Jour 11",
        psychology: "Urgence + Alternative"
      }
    ]
  },

  storyteller: {
    name: "Séquence Storyteller",
    description: "Approche narrative et engageante",
    icon: "BookOpen",
    color: "purple",
    emails: [
      {
        subject: "L'histoire de Marc (qui ressemble à la vôtre)",
        body: `{prénom},

Il y a 6 mois, Marc dirigeait une agence comme {entreprise}.

Il passait ses lundis à prospecter. Ses mardis à relancer. Ses mercredis à se demander pourquoi personne ne répondait.

Puis il a changé une seule chose dans son approche. Aujourd'hui, il a plus de prospects qu'il ne peut en traiter.

Vous voulez savoir ce qu'il a changé ?

{signature}`,
        delay: "Jour 1",
        psychology: "Identification + Curiosité"
      },
      {
        subject: "La suite de l'histoire de Marc",
        body: `{prénom},

Ce que Marc a changé, c'est simple : il a arrêté de prospecter comme tout le monde.

Au lieu d'envoyer des emails génériques à 500 personnes, il en envoie 50 — mais chacun est personnalisé comme s'il avait passé 2h dessus.

Résultat : son taux de réponse est passé de 2% à 23%.

Le secret ? Une méthode que je serais ravi de vous montrer.

{signature}`,
        delay: "Jour 4",
        psychology: "Révélation + Preuve"
      },
      {
        subject: "Ce que Marc m'a dit hier",
        body: `{prénom},

J'ai eu Marc au téléphone hier. Il m'a dit un truc qui m'a marqué :

"Le pire, c'est que j'aurais pu faire ça depuis des années. J'ai juste perdu du temps à faire comme tout le monde."

Je ne veux pas que vous fassiez la même erreur.

Un appel de 15 min pour voir si la méthode de Marc peut marcher pour {entreprise} ?

{signature}`,
        delay: "Jour 7",
        psychology: "Témoignage + Regret anticipé"
      },
      {
        subject: "Épilogue",
        body: `{prénom},

L'histoire de Marc s'est bien terminée. Il a 3 nouveaux clients par mois sans passer ses journées à prospecter.

J'aurais aimé vous raconter une histoire similaire pour {entreprise}. Peut-être une prochaine fois.

Si vous changez d'avis, mon email n'a pas expiré.

Bonne continuation,
{signature}`,
        delay: "Jour 12",
        psychology: "Clôture narrative + Ouverture"
      }
    ]
  }
};

export const toneDescriptions = {
  expert: {
    label: '🎯 Expert',
    description: "Approche d'autorité et d'expertise. Idéal pour les secteurs B2B techniques.",
    bestFor: ['Consultants', 'Agences tech', 'SaaS']
  },
  friendly: {
    label: '🤝 Amical',
    description: "Ton conversationnel et accessible. Parfait pour créer une relation humaine.",
    bestFor: ['Services', 'Formation', 'Coaching']
  },
  challenger: {
    label: '⚡ Challenger',
    description: "Remise en question constructive. Efficace pour les décideurs pressés.",
    bestFor: ['Grands comptes', 'Direction', 'Scale-ups']
  },
  storyteller: {
    label: '📖 Storyteller',
    description: "Approche narrative et engageante. Idéal pour se démarquer.",
    bestFor: ['Marketing', 'Creative', 'Startups']
  }
};

export default demoSequences;
