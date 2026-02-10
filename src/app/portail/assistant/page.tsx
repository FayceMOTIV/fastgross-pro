'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Send,
  Loader2,
  User,
  Bot,
  ShoppingCart,
  Truck,
  Tag,
  HelpCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Shield,
  Sparkles,
  Package,
} from 'lucide-react';
import {
  getPromotions,
  getBestsellers,
  getProductsByCategory,
  searchProducts,
  DISTRAM_CATALOG,
} from '@/data/distram-catalog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

// Formater le prix
const fmt = (n: number) => n.toFixed(2).replace('.', ',') + ' €';

// Construire les réponses dynamiquement depuis le catalogue
function buildDemoResponses(): Record<string, { content: string; suggestions: string[] }> {
  const promos = getPromotions();
  const promoLines = promos
    .slice(0, 5)
    .map(
      (p) =>
        `• **${p.name}** : ~~${fmt(p.prixClient)}~~ → **${fmt(p.promo!.prixPromo)}** (-${p.promo!.pourcentage}%)`
    )
    .join('\n');

  const broches = searchProducts('broche');
  const brocheLines = broches
    .map(
      (p) =>
        `• **${p.name}** (${p.ref}) : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐ Bestseller' : ''} — Stock : ${p.stock} unités`
    )
    .join('\n');

  const sauces = getProductsByCategory('sauces');
  const sauceLines = sauces
    .slice(0, 8)
    .map(
      (p) =>
        `• **${p.name}** : ${p.promo ? `~~${fmt(p.prixClient)}~~ **${fmt(p.promo.prixPromo)}** (-${p.promo.pourcentage}%)` : `**${fmt(p.prixClient)}**`}${p.bestseller ? ' ⭐' : ''}`
    )
    .join('\n');

  const pains = getProductsByCategory('pains');
  const painLines = pains
    .slice(0, 8)
    .map(
      (p) =>
        `• **${p.name}** : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐ Bestseller' : ''}`
    )
    .join('\n');

  const viandes = getProductsByCategory('viandes');
  const viandeLines = viandes
    .slice(0, 8)
    .map(
      (p) =>
        `• **${p.name}** : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐' : ''}${p.promo ? ` (promo -${p.promo.pourcentage}%)` : ''}`
    )
    .join('\n');

  const fromages = getProductsByCategory('fromages');
  const fromageLines = fromages
    .slice(0, 6)
    .map(
      (p) =>
        `• **${p.name}** : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐' : ''}`
    )
    .join('\n');

  const frites = getProductsByCategory('frites');
  const friteLines = frites
    .slice(0, 6)
    .map(
      (p) =>
        `• **${p.name}** : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐' : ''}`
    )
    .join('\n');

  return {
    'promo': {
      content: `Voici les **promotions en cours** chez DISTRAM :\n\n${promoLines}\n\n🕐 Ces offres sont valables encore 2 semaines. Profitez-en !`,
      suggestions: ['Ajouter au panier', 'Voir tout le catalogue', 'Mes commandes récentes'],
    },
    'promotion': {
      content: `Voici les **promotions en cours** chez DISTRAM :\n\n${promoLines}\n\n🕐 Ces offres sont valables encore 2 semaines. Profitez-en !`,
      suggestions: ['Ajouter au panier', 'Voir tout le catalogue', 'Mes commandes récentes'],
    },
    'offre': {
      content: `Voici les **promotions en cours** chez DISTRAM :\n\n${promoLines}\n\n🕐 Ces offres sont valables encore 2 semaines. Profitez-en !`,
      suggestions: ['Ajouter au panier', 'Voir tout le catalogue', 'Mes commandes récentes'],
    },
    'broche': {
      content: `Voici nos **broches kebab** disponibles :\n\n${brocheLines}\n\n✅ Toutes nos viandes sont **100% halal certifiées**.\n🚚 Livraison gratuite dès 200 € de commande.`,
      suggestions: ['Commander des broches', 'Quels pains pour kebab ?', 'Certifications halal ?'],
    },
    'kebab': {
      content: `Voici nos **broches kebab** disponibles :\n\n${brocheLines}\n\n✅ Toutes nos viandes sont **100% halal certifiées**.\n🚚 Livraison gratuite dès 200 € de commande.`,
      suggestions: ['Commander des broches', 'Quels pains pour kebab ?', 'Voir les sauces'],
    },
    'commande': {
      content: `Voici le suivi de vos **dernières commandes** :\n\n• **CMD-2024-1089** — En livraison 🚚\n  Ahmed B. arrive cet après-midi entre 14h-18h\n  Montant : 847,50 €\n\n• **CMD-2024-1082** — Livrée ✅\n  Livrée le 08/02 à 10h30 par Lucas M.\n  Montant : 1 234,00 €\n\n• **CMD-2024-1075** — Livrée ✅\n  Livrée le 05/02 à 09h15 par Ahmed B.\n  Montant : 562,80 €\n\nVous pouvez suivre vos livraisons en temps réel depuis la page Commandes.`,
      suggestions: ['Détails de la commande', 'Passer une nouvelle commande', 'Contacter mon livreur'],
    },
    'livraison': {
      content: `📦 **Votre livraison en cours :**\n\n• **CMD-2024-1089** — En route !\n  Livreur : Ahmed B.\n  Créneau : 14h-18h aujourd'hui\n  Statut : En cours de livraison\n\n📍 Vous recevrez une notification quand le livreur sera à proximité.\n\nLes prochaines livraisons sont prévues les mardi et jeudi (vos jours habituels).`,
      suggestions: ['Modifier mon créneau', 'Voir toutes mes commandes', 'Passer une commande'],
    },
    'suivi': {
      content: `📦 **Votre livraison en cours :**\n\n• **CMD-2024-1089** — En route !\n  Livreur : Ahmed B.\n  Créneau : 14h-18h aujourd'hui\n\n📍 Notification automatique à l'approche du livreur.\n\nConsultez tous les détails sur la page Commandes.`,
      suggestions: ['Détails de la commande', 'Nouvelle commande', 'Historique complet'],
    },
    'sauce': {
      content: `Voici nos **sauces** disponibles :\n\n${sauceLines}\n\n🔥 Les sauces Fromagère et 3 Fromages sont nos bestsellers pour tacos !`,
      suggestions: ['Commander des sauces', 'Sauces pour burgers ?', 'Voir les promos'],
    },
    'tacos': {
      content: `Pour un **menu tacos complet**, voici ce que je vous recommande :\n\n**Sauces :**\n${sauceLines}\n\n**Wraps :**\n• Tortilla Tacos 30cm x72 : **21,60 €** ⭐\n• Tortilla Blé Nature x48 : **14,40 €**\n\nVous voulez que je prépare un panier tacos ?`,
      suggestions: ['Préparer un panier tacos', 'Ajouter des viandes', 'Voir les fromages'],
    },
    'halal': {
      content: `🕌 **Certifications halal DISTRAM :**\n\nTous nos **${DISTRAM_CATALOG.length} produits** sont **100% halal certifiés**.\n\n**Nos certifications :**\n• Grande Mosquée de Lyon\n• AVS (Association de sensibilisation)\n• HMC (Halal Monitoring Committee)\n\n**Traçabilité complète :**\n• Chaque lot est tracé de l'abattoir à votre restaurant\n• Certificats disponibles sur demande\n• Contrôles qualité réguliers\n\nVous pouvez commander en toute confiance.`,
      suggestions: ['Voir le catalogue', 'Nos broches kebab', 'Commander maintenant'],
    },
    'certification': {
      content: `🕌 **Certifications halal DISTRAM :**\n\nTous nos **${DISTRAM_CATALOG.length} produits** sont **100% halal certifiés**.\n\n• Grande Mosquée de Lyon\n• AVS\n• HMC\n\nTraçabilité complète lot par lot. Certificats disponibles sur demande.`,
      suggestions: ['Voir le catalogue', 'Nos broches kebab', 'Commander'],
    },
    'prix': {
      content: `💰 **Votre grille tarifaire :**\n\nEn tant que client **Gold**, vous bénéficiez de :\n\n• **-10%** sur l'ensemble du catalogue\n• Les prix affichés sont vos **prix nets** après remise\n• **Livraison gratuite** dès 200 € de commande\n• Paiement à 30 jours fin de mois\n\n📊 Votre panier moyen : **1 250 €**\nVous êtes éligible à une remise supplémentaire à partir de 2 000 €/commande.`,
      suggestions: ['Voir le catalogue', 'Promotions en cours', 'Passer commande'],
    },
    'tarif': {
      content: `💰 **Votre grille tarifaire :**\n\nClient **Gold** — remise de **-10%** sur tout le catalogue.\nLivraison gratuite dès 200 €.\nPaiement 30 jours.\n\nConsultez le catalogue pour voir vos prix personnalisés.`,
      suggestions: ['Voir le catalogue', 'Promotions', 'Commander'],
    },
    'pain': {
      content: `Voici nos **pains et wraps** :\n\n${painLines}\n\n🥇 Le Pain Pita 16cm et la Tortilla Tacos 30cm sont nos plus vendus !`,
      suggestions: ['Commander des pains', 'Pour kebab ou tacos ?', 'Voir les viandes'],
    },
    'pita': {
      content: `Voici nos **pains et wraps** :\n\n${painLines}\n\nPour un kebab classique, je recommande le Pain Pita 16cm (bestseller).`,
      suggestions: ['Commander des pains', 'Broches kebab', 'Voir les sauces'],
    },
    'tortilla': {
      content: `Voici nos **tortillas et wraps** :\n\n${painLines}\n\nPour des tacos, la Tortilla 30cm est parfaite. Pour des wraps, optez pour la 25cm.`,
      suggestions: ['Commander', 'Voir les sauces', 'Préparer un panier tacos'],
    },
    'viande': {
      content: `Voici notre sélection **viandes halal** :\n\n${viandeLines}\n\n✅ 100% halal certifié. Traçabilité complète.`,
      suggestions: ['Commander des viandes', 'Broches kebab', 'Voir les promotions'],
    },
    'poulet': {
      content: `Voici nos **produits poulet** :\n\n${viandes.filter(v => v.name.toLowerCase().includes('poulet')).map(p => `• **${p.name}** : **${fmt(p.prixClient)}**${p.bestseller ? ' ⭐' : ''}`).join('\n')}\n\n✅ Poulet 100% halal certifié.`,
      suggestions: ['Commander du poulet', 'Voir les broches', 'Nos nuggets'],
    },
    'fromage': {
      content: `Voici nos **fromages** :\n\n${fromageLines}\n\n🧀 Emmental râpé et Mozzarella sont nos bestsellers pour pizza et tacos !`,
      suggestions: ['Commander des fromages', 'Pour pizza ?', 'Pour tacos ?'],
    },
    'frite': {
      content: `Voici nos **frites et surgelés** :\n\n${friteLines}\n\n🍟 Frites 9mm et Potatoes sont nos plus vendues !`,
      suggestions: ['Commander des frites', 'Onion rings ?', 'Voir le catalogue complet'],
    },
    'commander': {
      content: `Pour passer commande, c'est très simple :\n\n**1.** Accédez au **catalogue** et ajoutez vos produits au panier\n**2.** Choisissez votre **créneau de livraison** (matin ou après-midi)\n**3.** **Validez** votre commande\n\nVotre livreur habituel vous livrera au prochain passage.\n\n💡 Astuce : utilisez "Recommander" sur une ancienne commande pour gagner du temps !`,
      suggestions: ['Aller au catalogue', 'Voir mes anciennes commandes', 'Promotions en cours'],
    },
    'aide': {
      content: `Je peux vous aider avec :\n\n📦 **Catalogue** — Rechercher des produits, comparer les prix\n🛒 **Commandes** — Passer commande, recommander, suivre les livraisons\n💰 **Tarifs** — Vos prix personnalisés, promotions en cours\n📄 **Factures** — Consulter et télécharger vos factures\n🕌 **Halal** — Certifications et traçabilité\n🚚 **Livraison** — Créneaux, suivi en temps réel\n\nPosez-moi votre question, je connais les **${DISTRAM_CATALOG.length} produits** du catalogue par cœur !`,
      suggestions: ['Voir les promos', 'Chercher un produit', 'Suivre ma commande'],
    },
    'bonjour': {
      content: `Bonjour ! 👋 Bienvenue sur l'assistant DISTRAM.\n\nComment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur nos produits, vos commandes, les promotions en cours...`,
      suggestions: ['Promotions en cours', 'Je cherche un produit', 'Suivi de ma commande'],
    },
    'merci': {
      content: `Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions.\n\nJe suis disponible **24h/24, 7j/7** pour vous aider.`,
      suggestions: ['Passer une commande', 'Voir le catalogue', 'Promotions en cours'],
    },
  };
}

export default function PortailAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Bonjour ! Je suis l'assistant DISTRAM 🤝\n\nJe connais l'ensemble de notre catalogue (${DISTRAM_CATALOG.length} références) et je peux vous aider avec :\n\n• 🔍 Rechercher des produits et consulter les prix\n• 🛒 Vous guider pour passer commande\n• 🚚 Suivre vos livraisons en cours\n• 🏷️ Vous informer des promotions\n• 🕌 Répondre à vos questions sur le halal\n\nComment puis-je vous aider ?`,
      timestamp: new Date(),
      suggestions: [
        'Quelles sont les promos en cours ?',
        'Je cherche des broches kebab',
        'Où en est ma commande ?',
        'Vos sauces pour tacos ?',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const demoResponses = useRef(buildDemoResponses());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    // Find matching response by keyword
    const inputLower = query.toLowerCase();
    let response = {
      content: `Je comprends votre question. Laissez-moi chercher dans notre catalogue...\n\nPour une réponse plus précise, essayez de me demander :\n• Un **type de produit** (broches, sauces, pains, viandes...)\n• Les **promotions** en cours\n• Le **suivi** de vos commandes\n• Des informations sur le **halal**\n\nJe connais les ${DISTRAM_CATALOG.length} produits du catalogue par cœur !`,
      suggestions: ['Voir les promos', 'Chercher un produit', 'Suivre ma commande'],
    };

    // Try to match a product search in the catalog
    const catalogResults = searchProducts(inputLower);

    for (const [key, value] of Object.entries(demoResponses.current)) {
      if (inputLower.includes(key)) {
        response = value;
        break;
      }
    }

    // If no keyword match but catalog has results, show them
    if (
      response.content.includes('Laissez-moi chercher') &&
      catalogResults.length > 0
    ) {
      const resultLines = catalogResults
        .slice(0, 6)
        .map(
          (p) =>
            `• **${p.name}** : **${fmt(p.prixClient)}**${p.promo ? ` (promo -${p.promo.pourcentage}%)` : ''}${p.bestseller ? ' ⭐' : ''}`
        )
        .join('\n');

      response = {
        content: `J'ai trouvé **${catalogResults.length} produit${catalogResults.length > 1 ? 's' : ''}** correspondant à votre recherche :\n\n${resultLines}${catalogResults.length > 6 ? `\n\n...et ${catalogResults.length - 6} autres résultats.` : ''}\n\nVoulez-vous les ajouter au panier ?`,
        suggestions: ['Ajouter au panier', 'Affiner ma recherche', 'Voir le catalogue complet'],
      };
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      suggestions: response.suggestions,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const quickActions = [
    { icon: ShoppingCart, label: 'Commander', query: 'Je veux passer commande' },
    { icon: Tag, label: 'Promos', query: 'Quelles sont les promos en cours ?' },
    { icon: Truck, label: 'Ma livraison', query: 'Où en est ma commande ?' },
    { icon: HelpCircle, label: 'Aide', query: 'Comment ça marche ?' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50/50 to-white dark:from-gray-950 dark:to-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Assistant DISTRAM</h1>
            <p className="text-orange-100 text-sm">
              Catalogue, commandes, livraisons — 24h/24
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium">En ligne</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pt-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(action.query);
              }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-700 hover:border-orange-400 hover:shadow-md transition-all active:scale-95"
            >
              <action.icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col border-orange-200/50 dark:border-gray-700">
          <CardHeader className="border-b border-orange-100 dark:border-gray-700 py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Conversation
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[450px] min-h-[300px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`p-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-orange-600 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content.split(/(\*\*.*?\*\*|~~.*?~~)/).map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>;
                          }
                          if (part.startsWith('~~') && part.endsWith('~~')) {
                            return <s key={i} className="opacity-60">{part.slice(2, -2)}</s>;
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      </div>
                    </div>
                    {message.suggestions && message.role === 'assistant' && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors border border-orange-200 dark:border-orange-800"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-orange-100 dark:border-gray-700 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="flex-1 border-orange-200 dark:border-gray-600 focus-visible:ring-orange-500"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center">Client Gold</span>
            <span className="text-[10px] text-gray-500">-10% sur tout</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <Truck className="w-5 h-5 text-orange-500" />
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center">Livraison gratuite</span>
            <span className="text-[10px] text-gray-500">dès 200 €</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-orange-100 dark:border-gray-700">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 text-center">100% Halal</span>
            <span className="text-[10px] text-gray-500">{DISTRAM_CATALOG.length} produits</span>
          </div>
        </div>

        {/* CTA */}
        <Link href="/portail/catalogue" className="block mt-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5" />
              <span className="font-medium text-sm">Parcourir le catalogue complet</span>
            </div>
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
