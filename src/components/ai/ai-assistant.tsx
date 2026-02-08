"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiAssistantProps {
  agentType: "sales" | "scan" | "b2b" | "manager" | "delivery";
  title?: string;
  placeholder?: string;
  className?: string;
  floating?: boolean;
  defaultOpen?: boolean;
}

const AGENT_CONFIG = {
  sales: {
    title: "Agent Commercial",
    placeholder: "Décrivez le restaurant pour des recommandations...",
    color: "bg-orange-500",
  },
  scan: {
    title: "Agent Scan Menu+",
    placeholder: "Posez une question sur le menu analysé...",
    color: "bg-purple-500",
  },
  b2b: {
    title: "Assistant B2B",
    placeholder: "Que recherchez-vous ?",
    color: "bg-blue-500",
  },
  manager: {
    title: "Agent Manager",
    placeholder: "Posez une question sur les performances...",
    color: "bg-green-500",
  },
  delivery: {
    title: "Copilote Livreur",
    placeholder: "Quelle info vous faut-il ?",
    color: "bg-red-500",
  },
};

export function AiAssistant({
  agentType,
  title,
  placeholder,
  className,
  floating = false,
  defaultOpen = false,
}: AiAssistantProps) {
  const config = AGENT_CONFIG[agentType];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentType,
          message: userMessage.content,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) throw new Error("Erreur de communication avec l'agent");

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Je n'ai pas pu traiter votre demande.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur agent IA:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating button mode
  if (floating && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all hover:scale-110",
          config.color,
          "text-white"
        )}
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  // Main assistant UI
  const AssistantContent = (
    <div
      className={cn(
        "flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-xl border",
        floating ? "fixed bottom-6 right-6 z-50 w-96" : "w-full",
        isMinimized ? "h-14" : floating ? "h-[500px]" : "h-full",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-t-lg",
          config.color,
          "text-white"
        )}
      >
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-medium">{title || config.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {floating && (
            <>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded"
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Je suis votre assistant IA DISTRAM.
                  <br />
                  Comment puis-je vous aider ?
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        config.color
                      )}
                    >
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      msg.role === "user"
                        ? "bg-gray-100 dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-700 border"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {msg.timestamp.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    config.color
                  )}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 border rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder || config.placeholder}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className={config.color}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return AssistantContent;
}
