'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageCircle,
  Send,
  Sparkles,
  Loader2,
  User,
  Bot,
  Lightbulb,
  TrendingUp,
  ShoppingCart,
  Users,
  HelpCircle
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant commercial IA. Je peux vous aider avec :\n\n• Conseils de vente personnalisés\n• Réponses aux objections clients\n• Argumentaires produits\n• Stratégies de négociation\n• Analyse de votre portefeuille\n\nQue puis-je faire pour vous ?',
      timestamp: new Date(),
      suggestions: [
        'Comment convaincre un nouveau client ?',
        'Quels arguments pour les broches kebab ?',
        'Comment répondre à "c\'est trop cher" ?',
        'Analyse de mon portefeuille'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const demoResponses: Record<string, { content: string; suggestions: string[] }> = {
    'nouveau client': {
      content: `Pour convaincre un nouveau prospect kebab, voici ma stratégie recommandée :

**1. Accroche personnalisée**
"J'ai vu votre établissement et vos excellents avis Google (4.2★). Nous travaillons déjà avec 150 kebabs sur Lyon."

**2. Différenciateurs clés**
• Livraison gratuite dès 200€
• 2 passages/semaine garantis avant 11h
• 100% halal certifié
• Prix imbattables sur les broches (75€/10kg)

**3. Offre d'essai**
Proposez une première commande à -10% pour tester la qualité.

**4. Closing**
"Quel jour vous conviendrait pour une première livraison ?"`,
      suggestions: [
        'Et si le client a déjà un fournisseur ?',
        'Comment négocier le prix ?',
        'Quels produits proposer en premier ?'
      ]
    },
    'trop cher': {
      content: `Voici comment répondre efficacement à l'objection "C'est trop cher" :

**1. Valider et questionner**
"Je comprends que le prix soit important pour vous. Puis-je vous demander par rapport à quoi vous trouvez ça cher ?"

**2. Reframer sur la valeur**
• "Nos broches sont à 75€/10kg, mais attention : c'est du 100% halal certifié"
• "La livraison est incluse dès 200€ - calculez ce que vous payez actuellement en déplacement"
• "Nos clients économisent en moyenne 15% vs les cash & carry grâce à nos prix de gros"

**3. Ancrage concurrentiel**
"Faisons un calcul ensemble sur votre commande type. Je suis sûr qu'on peut trouver des économies."

**4. Offre conditionnelle**
"Sur une commande de 500€/mois, je peux vous faire -5% fidélité."`,
      suggestions: [
        'Et s\'il veut un prix encore plus bas ?',
        'Comment justifier la qualité premium ?',
        'Arguments sur le rapport qualité-prix'
      ]
    },
    'broche': {
      content: `Voici les arguments clés pour vendre nos **broches de kebab** :

**Qualité & Traçabilité**
• 100% viande halal certifiée
• Traçabilité complète lot par lot
• Texture optimale : ni trop grasse, ni trop sèche
• Conservation : 12 mois au congélateur

**Avantages économiques**
• 75€/10kg soit 7.50€/kg (vs 9-10€ en cash & carry)
• Rendement excellent : 85% après cuisson
• 1 broche = ~80 kebabs (12.5 centimes/kebab en viande)

**Services inclus**
• Livraison gratuite dès 200€
• Commande WhatsApp le soir, livré le lendemain
• Remplacement immédiat si problème qualité

**Témoignage client**
"O'Tacos Lyon 7 est passé de 150 à 300 kebabs/jour grâce à notre qualité régulière."`,
      suggestions: [
        'Quels accompagnements proposer ?',
        'Comment gérer les retours qualité ?',
        'Stratégie de cross-selling'
      ]
    },
    'portefeuille': {
      content: `**Analyse de votre portefeuille client :**

📊 **Vue d'ensemble**
• 25 clients actifs
• CA moyen : 2 450€/mois par client
• CA total mensuel : ~61 000€

🎯 **Top 5 clients (60% du CA)**
1. O'Tacos Lyon 7 - 5 200€/mois
2. Tacos Avenue Part-Dieu - 4 800€/mois
3. Pizza Napoli - 3 900€/mois
4. Sultan Kebab - 3 600€/mois
5. Istanbul Grill - 3 400€/mois

⚠️ **Clients à risque (churn)**
• Antalya Grill - Score 75% - Baisse CA de 25%
• Snack du Marché - Score 68% - Inactif depuis 3 semaines

📈 **Opportunités de croissance**
• 5 clients commandent uniquement des broches → potentiel cross-sell sauces
• 3 nouveaux prospects qualifiés à 80+ en attente de contact`,
      suggestions: [
        'Comment réactiver les clients inactifs ?',
        'Stratégie pour le cross-selling',
        'Comment fidéliser les top clients ?'
      ]
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find matching response
    const inputLower = input.toLowerCase();
    let response = {
      content: "Je comprends votre question. Laissez-moi analyser cela...\n\nPour une réponse personnalisée, n'hésitez pas à me donner plus de contexte sur le client ou la situation.",
      suggestions: ['Comment convaincre un nouveau client ?', 'Arguments pour les broches', 'Répondre aux objections']
    };

    for (const [key, value] of Object.entries(demoResponses)) {
      if (inputLower.includes(key)) {
        response = value;
        break;
      }
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      suggestions: response.suggestions
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const quickActions = [
    { icon: TrendingUp, label: 'Analyse ventes', query: 'Analyse mon portefeuille' },
    { icon: Users, label: 'Nouveau client', query: 'Comment convaincre un nouveau client ?' },
    { icon: ShoppingCart, label: 'Cross-selling', query: 'Stratégie de cross-selling' },
    { icon: HelpCircle, label: 'Objections', query: 'Comment répondre à "c\'est trop cher" ?' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="IA Assistant Commercial"
        subtitle="Votre coach de vente personnel propulsé par l'IA"
      />

      <div className="flex-1 p-6 flex flex-col max-w-4xl mx-auto w-full">
        {/* Hero */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Assistant Commercial IA</h2>
                <p className="text-indigo-100">
                  Conseils de vente, argumentaires, réponses aux objections - en temps réel
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">+20% conversion</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2"
              onClick={() => setInput(action.query)}
            >
              <action.icon className="w-5 h-5 text-indigo-600" />
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Chat */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="w-5 h-5 text-indigo-600" />
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    </div>
                    {message.suggestions && message.role === 'assistant' && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4">
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
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="bg-indigo-600 hover:bg-indigo-700"
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

        {/* Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Conseils du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Meilleur moment d\'appel', tip: 'Les mardis et jeudis entre 10h-11h30 ont le meilleur taux de réponse' },
                { title: 'Produit star', tip: 'La broche 10kg à 75€ est votre meilleur argument prix' },
                { title: 'Objection fréquente', tip: '45% des prospects mentionnent le prix - préparez votre argumentaire valeur' },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-gray-900 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-600">{item.tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
