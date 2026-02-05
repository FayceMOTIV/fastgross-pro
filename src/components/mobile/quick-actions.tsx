"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, FileText, MapPin, Bot, BarChart3,
  Plus, X, Send, Loader2, MessageSquare,
  Mic, MicOff, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types
interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// OpenAI API call for AI chat
async function askAI(question: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    // Fallback responses for demo
    const responses: Record<string, string> = {
      "client": "Vos 3 clients prioritaires aujourd'hui sont: 1) Snack Gourmet (30 jours sans commande), 2) La Friterie (commande en attente), 3) Burger Express (relance planifiée).",
      "livr": "Le livreur Ahmed est le plus proche de votre position, à 2.3km. Il termine sa tournée dans environ 45 minutes.",
      "chiffre": "CA du jour: 4 520€ (+12% vs hier). 8 commandes validées, 2 en attente de confirmation.",
      "stock": "Alertes stock: Huile de friture (niveau bas, réappro suggérée), Viande kebab (stock OK pour 5 jours).",
      "default": "Je suis votre assistant IA DISTRAM. Je peux vous aider avec: les clients à relancer, la localisation des livreurs, les stats du jour, et bien plus. Que souhaitez-vous savoir?"
    };

    const key = Object.keys(responses).find(k => question.toLowerCase().includes(k));
    await new Promise(r => setTimeout(r, 800));
    return responses[key || "default"];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Tu es l'assistant IA de DISTRAM, une application de gestion pour grossistes alimentaires halal B2B.
            Tu réponds de manière concise et actionnable en français.
            Tu as accès aux données de l'entreprise: clients, commandes, livreurs, stocks, statistiques.
            Donne des réponses courtes et pratiques, adaptées à une utilisation mobile.`
          },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu traiter votre demande.";
  } catch {
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  }
}

// Mini Chat Component
function MiniChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Bonjour! Je suis votre assistant FastGross. Comment puis-je vous aider?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askAI(userMessage.content);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, une erreur s'est produite.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    setIsListening(!isListening);
    // In production, implement Web Speech API here
  };

  const quickQuestions = [
    "Clients à relancer?",
    "Stats du jour?",
    "Livreur le plus proche?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]"
    >
      <Card className="shadow-2xl border-2 border-primary-200">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-base">Assistant IA</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary-600 text-white rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 pt-0 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVoice}
              className={cn(
                "shrink-0",
                isListening && "bg-red-100 border-red-300 text-red-600"
              )}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Posez votre question..."
              className="text-sm"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Stats du jour popup
function DayStatsPopup({ onClose }: { onClose: () => void }) {
  const stats = {
    ca: 4520,
    caVariation: 12,
    orders: 8,
    pendingOrders: 2,
    newClients: 1,
    deliveries: 6,
    completedDeliveries: 4,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 right-4 z-50 w-72"
    >
      <Card className="shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              Stats du jour
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Chiffre d&apos;affaires</span>
            <div className="text-right">
              <span className="font-bold">{stats.ca.toLocaleString()}€</span>
              <Badge variant="secondary" className="ml-2 text-green-600 bg-green-100">
                +{stats.caVariation}%
              </Badge>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Commandes</span>
            <span className="font-semibold">
              {stats.orders} <span className="text-muted-foreground font-normal">({stats.pendingOrders} en attente)</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Livraisons</span>
            <span className="font-semibold">
              {stats.completedDeliveries}/{stats.deliveries}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Nouveaux clients</span>
            <span className="font-semibold">{stats.newClients}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Quick Actions Component
export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const actions: QuickAction[] = [
    {
      id: "call",
      icon: Phone,
      label: "Appeler client à relancer",
      shortLabel: "Appeler",
      color: "text-green-600",
      bgColor: "bg-green-100",
      onClick: () => {
        // In production, trigger call to next client
        alert("Appel du prochain client: Snack Gourmet - 06 12 34 56 78");
      },
    },
    {
      id: "order",
      icon: FileText,
      label: "Nouvelle commande rapide",
      shortLabel: "Commande",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      onClick: () => {
        window.location.href = "/orders?new=true";
      },
    },
    {
      id: "locate",
      icon: MapPin,
      label: "Livreur le plus proche",
      shortLabel: "Livreur",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      onClick: () => {
        window.location.href = "/tracking?nearest=true";
      },
    },
    {
      id: "ai",
      icon: Bot,
      label: "Demander à l'IA",
      shortLabel: "IA",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      onClick: () => {
        setIsOpen(false);
        setShowChat(true);
      },
    },
    {
      id: "stats",
      icon: BarChart3,
      label: "Stats du jour",
      shortLabel: "Stats",
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
      onClick: () => {
        setIsOpen(false);
        setShowStats(true);
      },
    },
  ];

  return (
    <>
      {/* FAB Menu */}
      <div className="fixed bottom-4 right-4 z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <span className="bg-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                      {action.shortLabel}
                    </span>
                    <button
                      onClick={action.onClick}
                      className={cn(
                        "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110",
                        action.bgColor
                      )}
                      aria-label={action.label}
                    >
                      <Icon className={cn("h-5 w-5", action.color)} />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors",
            isOpen
              ? "bg-red-500 hover:bg-red-600"
              : "bg-primary-600 hover:bg-primary-700"
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir les actions rapides"}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* AI Chat floating button (when not in menu) */}
      {!isOpen && !showChat && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-xl flex items-center justify-center"
          onClick={() => setShowChat(true)}
          whileTap={{ scale: 0.95 }}
          aria-label="Ouvrir le chat IA"
        >
          <MessageSquare className="h-5 w-5 text-white" />
        </motion.button>
      )}

      {/* Mini Chat */}
      <AnimatePresence>
        {showChat && <MiniChat onClose={() => setShowChat(false)} />}
      </AnimatePresence>

      {/* Day Stats Popup */}
      <AnimatePresence>
        {showStats && <DayStatsPopup onClose={() => setShowStats(false)} />}
      </AnimatePresence>

      {/* Backdrop when menu is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
