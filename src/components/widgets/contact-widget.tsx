"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Phone, Mail, ShoppingCart,
  BookOpen, Send, Loader2, ChevronRight, Clock,
  CheckCircle2, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
export interface ContactWidgetConfig {
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  welcomeMessage: string;
  companyName: string;
  features: {
    chat: boolean;
    callback: boolean;
    catalog: boolean;
    order: boolean;
  };
  businessHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}

// Default configuration
const defaultConfig: ContactWidgetConfig = {
  position: "bottom-right",
  primaryColor: "#16a34a",
  welcomeMessage: "Bonjour ! Comment pouvons-nous vous aider ?",
  companyName: "FastGross Pro",
  features: {
    chat: true,
    callback: true,
    catalog: true,
    order: true,
  },
  businessHours: {
    start: "08:00",
    end: "18:00",
    timezone: "Europe/Paris",
  },
};

// Check if business is open
function isBusinessOpen(hours?: ContactWidgetConfig["businessHours"]): boolean {
  if (!hours) return true;

  const now = new Date();
  const [startH, startM] = hours.start.split(":").map(Number);
  const [endH, endM] = hours.end.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;

  return isWeekday && currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Contact Form Component
function ContactForm({
  config,
  onBack,
  onSubmit,
}: {
  config: ContactWidgetConfig;
  onBack: () => void;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
    onSubmit(formData);
  };

  if (isSuccess) {
    return (
      <div className="p-6 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: `${config.primaryColor}20` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: config.primaryColor }} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Message envoyé !</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Nous vous répondrons dans les plus brefs délais.
        </p>
        <Button variant="outline" onClick={onBack} className="w-full">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <h3 className="font-semibold">Contactez-nous</h3>

      <Input
        placeholder="Votre nom"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        type="email"
        placeholder="Votre email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <Input
        type="tel"
        placeholder="Votre téléphone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />
      <textarea
        placeholder="Votre message..."
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg resize-none h-24 text-sm"
        required
      />

      <Button
        type="submit"
        className="w-full text-white"
        style={{ backgroundColor: config.primaryColor }}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Envoyer
          </>
        )}
      </Button>
    </form>
  );
}

// Callback Request Form
function CallbackForm({
  config,
  onBack,
  onSubmit,
}: {
  config: ContactWidgetConfig;
  onBack: () => void;
  onSubmit: (data: Record<string, string>) => void;
}) {
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("asap");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
    onSubmit({ phone, preferredTime });
  };

  if (isSuccess) {
    return (
      <div className="p-6 text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: `${config.primaryColor}20` }}
        >
          <Phone className="h-8 w-8" style={{ color: config.primaryColor }} />
        </div>
        <h3 className="text-lg font-semibold mb-2">Demande enregistrée !</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Un conseiller vous rappellera très bientôt.
        </p>
        <Button variant="outline" onClick={onBack} className="w-full">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <div>
        <h3 className="font-semibold mb-1">Être rappelé</h3>
        <p className="text-sm text-muted-foreground">
          Laissez votre numéro, nous vous rappelons
        </p>
      </div>

      <Input
        type="tel"
        placeholder="06 12 34 56 78"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="text-lg"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Quand souhaitez-vous être rappelé ?</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "asap", label: "Dès que possible" },
            { value: "morning", label: "Ce matin" },
            { value: "afternoon", label: "Cet après-midi" },
            { value: "tomorrow", label: "Demain" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreferredTime(option.value)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm transition-colors",
                preferredTime === option.value
                  ? "border-2"
                  : "border-border hover:border-gray-300"
              )}
              style={{
                borderColor: preferredTime === option.value ? config.primaryColor : undefined,
                backgroundColor: preferredTime === option.value ? `${config.primaryColor}10` : undefined,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full text-white"
        style={{ backgroundColor: config.primaryColor }}
        disabled={isSubmitting || !phone}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Phone className="h-4 w-4 mr-2" />
            Demander un rappel
          </>
        )}
      </Button>
    </form>
  );
}

// Mini Catalog Component
function MiniCatalog({
  config,
  onBack,
}: {
  config: ContactWidgetConfig;
  onBack: () => void;
}) {
  const categories = [
    { name: "Viandes", count: 45, emoji: "🥩" },
    { name: "Pains", count: 23, emoji: "🥖" },
    { name: "Sauces", count: 38, emoji: "🍅" },
    { name: "Légumes", count: 52, emoji: "🥬" },
    { name: "Surgelés", count: 67, emoji: "🧊" },
    { name: "Boissons", count: 34, emoji: "🥤" },
  ];

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      <h3 className="font-semibold mb-3">Notre catalogue</h3>

      <div className="space-y-2">
        {categories.map((cat) => (
          <a
            key={cat.name}
            href={`/catalogues?category=${cat.name.toLowerCase()}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.emoji}</span>
              <div>
                <p className="font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">{cat.count} produits</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        ))}
      </div>

      <a
        href="/catalogues"
        className="block mt-4 text-center text-sm font-medium hover:underline"
        style={{ color: config.primaryColor }}
      >
        Voir tout le catalogue →
      </a>
    </div>
  );
}

// Main Widget Component
export function ContactWidget({ config = defaultConfig }: { config?: ContactWidgetConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"menu" | "contact" | "callback" | "catalog">("menu");
  const [hasNotification, setHasNotification] = useState(true);

  const isOpen24h = isBusinessOpen(config.businessHours);

  const actions: QuickAction[] = [
    ...(config.features.chat ? [{
      id: "contact",
      icon: Mail,
      label: "Nous contacter",
      description: "Envoyez-nous un message",
      onClick: () => setCurrentView("contact"),
    }] : []),
    ...(config.features.callback ? [{
      id: "callback",
      icon: Phone,
      label: "Être rappelé",
      description: isOpen24h ? "Rappel dans les 5 min" : "Demain matin",
      onClick: () => setCurrentView("callback"),
    }] : []),
    ...(config.features.catalog ? [{
      id: "catalog",
      icon: BookOpen,
      label: "Voir le catalogue",
      description: "+2000 produits",
      onClick: () => setCurrentView("catalog"),
    }] : []),
    ...(config.features.order ? [{
      id: "order",
      icon: ShoppingCart,
      label: "Commander",
      description: "Livraison en 24h",
      onClick: () => window.location.href = "/orders?new=true",
    }] : []),
  ];

  const handleOpen = () => {
    setIsOpen(true);
    setHasNotification(false);
  };

  const handleBack = () => {
    setCurrentView("menu");
  };

  const handleFormSubmit = (data: Record<string, string>) => {
    console.log("Form submitted:", data);
    // In production, send to backend/CRM
  };

  return (
    <>
      {/* Widget Button */}
      <motion.button
        onClick={handleOpen}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105",
          config.position === "bottom-right" ? "bottom-4 right-4" : "bottom-4 left-4"
        )}
        style={{ backgroundColor: config.primaryColor }}
        whileTap={{ scale: 0.95 }}
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="h-6 w-6 text-white" />

        {/* Notification Badge */}
        {hasNotification && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </motion.button>

      {/* Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed z-50 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl overflow-hidden border",
              config.position === "bottom-right" ? "bottom-20 right-4" : "bottom-20 left-4"
            )}
          >
            {/* Header */}
            <div
              className="p-4 text-white"
              style={{ backgroundColor: config.primaryColor }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{config.companyName}</h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setCurrentView("menu");
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm opacity-90">{config.welcomeMessage}</p>

              {/* Business Hours */}
              <div className="flex items-center gap-2 mt-3 text-xs opacity-80">
                <Clock className="h-3 w-3" />
                <span>
                  {isOpen24h ? "Disponible maintenant" : `Horaires: ${config.businessHours?.start} - ${config.businessHours?.end}`}
                </span>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isOpen24h ? "bg-green-400" : "bg-yellow-400"
                  )}
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-auto">
              {currentView === "menu" && (
                <div className="p-4 space-y-2">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={action.onClick}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-gray-300 transition-colors text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${config.primaryColor}15` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: config.primaryColor }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{action.label}</p>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}

              {currentView === "contact" && (
                <ContactForm
                  config={config}
                  onBack={handleBack}
                  onSubmit={handleFormSubmit}
                />
              )}

              {currentView === "callback" && (
                <CallbackForm
                  config={config}
                  onBack={handleBack}
                  onSubmit={handleFormSubmit}
                />
              )}

              {currentView === "catalog" && (
                <MiniCatalog config={config} onBack={handleBack} />
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">
                Propulsé par <span className="font-medium">{config.companyName}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Script to embed on external sites
export const WIDGET_EMBED_SCRIPT = `
<script>
(function() {
  var script = document.createElement('script');
  script.src = 'https://fastgross.pro/widget.js';
  script.async = true;
  script.dataset.primaryColor = '#16a34a';
  script.dataset.position = 'bottom-right';
  script.dataset.companyName = 'FastGross Pro';
  document.head.appendChild(script);
})();
</script>
`;

export default ContactWidget;
