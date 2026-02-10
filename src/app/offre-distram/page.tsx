"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISTRAM_COLORS } from "@/lib/theme-distram";

const FAICAL_PHONE = "06 02 10 07 74";
const FAICAL_PHONE_LINK = "tel:+33602100774";

import {
  CheckCircle,
  ArrowRight,
  Phone,
  Users,
  Truck,
  BarChart3,
  Settings,
  ShoppingCart,
  Brain,
  Star,
  ChevronDown,
  Shield,
  Target,
  Camera,
  MessageSquare,
  Route,
  Clock,
  Zap,
  TrendingUp,
  MapPin,
  Package,
  Bot,
  Bell,
} from "lucide-react";
import { PhoneMockup } from "@/components/ui/PhoneMockup";

// ============================================
// COMPOSANTS
// ============================================

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
    >
      {children}
    </div>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal();

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString("fr-FR")}{suffix}
    </span>
  );
}

function ConversationMockup() {
  const messages = [
    { from: "client", text: "Salut, c'est quoi le prix du kebab ?" },
    { from: "ia", text: "Bonjour ! La Broche Kebab Boeuf/Veau 10kg est à 67,50€. Combien vous en faut-il ?" },
    { from: "client", text: "5 broches, tu livres quand ?" },
    { from: "ia", text: "Parfait ! 5 × 67,50€ = 337,50€ HT. Livraison demain matin avant 10h. Je valide ?" },
    { from: "client", text: "Go !" },
    { from: "ia", text: "✅ Commande validée ! SMS de notification 30min avant livraison. Bonne journée !" },
  ];

  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (visibleCount < messages.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), 1500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setVisibleCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, messages.length]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
        <div className="w-10 h-10 rounded-full bg-[#F5A623] flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-white">Agent IA DISTRAM</p>
          <p className="text-xs text-green-400">● En ligne 24/7</p>
        </div>
      </div>
      {messages.slice(0, visibleCount).map((msg, i) => (
        <div key={i} className={cn("flex", msg.from === "client" ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
              msg.from === "client" ? "bg-[#F5A623] text-black" : "bg-gray-700 text-white"
            )}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {visibleCount < messages.length && (
        <div className="flex justify-start">
          <div className="bg-gray-700 rounded-2xl px-4 py-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PHONE SCREEN MOCKUPS
// ============================================

function ScreenCommercial() {
  return (
    <div className="h-full bg-gray-50 text-[10px] leading-tight">
      {/* Header */}
      <div className="bg-blue-600 text-white px-3 pt-8 pb-3">
        <p className="text-[8px] opacity-70">Bonjour</p>
        <p className="text-[13px] font-bold">Sophie M.</p>
        <div className="flex gap-1 mt-1">
          <span className="bg-white/20 text-[7px] px-1.5 py-0.5 rounded-full">⭐ Rank #2</span>
          <span className="bg-white/20 text-[7px] px-1.5 py-0.5 rounded-full">Top Performer</span>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 px-2 -mt-3">
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">CA Jour</p>
          <p className="text-[13px] font-bold text-blue-600">12 580€</p>
          <p className="text-[7px] text-green-500">+15.2%</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">Commandes</p>
          <p className="text-[13px] font-bold text-blue-600">34</p>
          <p className="text-[7px] text-green-500">+8.5%</p>
        </div>
      </div>
      {/* Objectifs */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">Objectifs</p>
        <div className="bg-white rounded-lg p-2 shadow-sm space-y-2">
          <div>
            <div className="flex justify-between"><span className="text-[8px] text-gray-500">CA Mensuel</span><span className="text-[8px] font-bold">74%</span></div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-0.5"><div className="h-full bg-cyan-500 rounded-full" style={{ width: "74%" }} /></div>
          </div>
          <div>
            <div className="flex justify-between"><span className="text-[8px] text-gray-500">Nv. Clients</span><span className="text-[8px] font-bold">80%</span></div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-0.5"><div className="h-full bg-blue-500 rounded-full" style={{ width: "80%" }} /></div>
          </div>
          <div>
            <div className="flex justify-between"><span className="text-[8px] text-gray-500">Conversion</span><span className="text-[8px] font-bold">68%</span></div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-0.5"><div className="h-full bg-violet-500 rounded-full" style={{ width: "68%" }} /></div>
          </div>
        </div>
      </div>
      {/* Visites */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">Visites du jour</p>
        <div className="space-y-1">
          {[
            { time: "09:30", name: "Kebab Istanbul", status: "done", color: "bg-green-400" },
            { time: "11:00", name: "Pizza Bella", status: "en cours", color: "bg-blue-400" },
            { time: "14:30", name: "Tacos Avenue", status: "à venir", color: "bg-gray-300" },
          ].map((v, i) => (
            <div key={i} className="bg-white rounded-lg px-2 py-1.5 shadow-sm flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${v.color}`} />
              <span className="text-[8px] text-gray-400 w-8">{v.time}</span>
              <span className="text-[9px] font-medium text-gray-800 flex-1">{v.name}</span>
              <span className="text-[7px] text-gray-400">{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenLivreur() {
  return (
    <div className="h-full bg-gray-50 text-[10px] leading-tight">
      {/* Header */}
      <div className="bg-green-600 text-white px-3 pt-8 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold">Mes livraisons</p>
            <p className="text-[8px] opacity-70">8 restantes aujourd&apos;hui</p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
            <span className="text-[8px]">Disponible</span>
          </div>
        </div>
      </div>
      {/* Livraisons */}
      <div className="px-2 mt-2 space-y-1.5">
        {[
          { name: "Le Gourmet", addr: "14 Rue Garibaldi, Lyon 3", items: 12, amount: "458€", status: "En cours", statusColor: "bg-blue-100 text-blue-700", eta: "10:30" },
          { name: "Boulangerie Michel", addr: "8 Rue de la Barre, Lyon 2", items: 8, amount: "267€", status: "Suivant", statusColor: "bg-amber-100 text-amber-700", eta: "11:15" },
          { name: "Café de la Place", addr: "23 Place Bellecour, Lyon 2", items: 6, amount: "132€", status: "En attente", statusColor: "bg-gray-100 text-gray-600", eta: "12:00" },
          { name: "Pizzeria Napoli", addr: "5 Rue Mercière, Lyon 2", items: 15, amount: "567€", status: "En attente", statusColor: "bg-gray-100 text-gray-600", eta: "12:45" },
        ].map((d, i) => (
          <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-900">{d.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2 h-2 text-gray-400" />
                  <p className="text-[7px] text-gray-400">{d.addr}</p>
                </div>
              </div>
              <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${d.statusColor}`}>{d.status}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-gray-50">
              <div className="flex gap-2 text-[7px] text-gray-400">
                <span>{d.items} articles</span>
                <span className="font-bold text-gray-700">{d.amount}</span>
              </div>
              <span className="text-[8px] font-medium text-green-600">ETA {d.eta}</span>
            </div>
          </div>
        ))}
      </div>
      {/* Nav button */}
      <div className="px-2 mt-2">
        <div className="bg-green-600 text-white rounded-lg py-2 text-center">
          <p className="text-[10px] font-bold">▶ Démarrer navigation</p>
        </div>
      </div>
    </div>
  );
}

function ScreenManager() {
  return (
    <div className="h-full bg-gray-50 text-[10px] leading-tight">
      {/* Header */}
      <div className="bg-purple-600 text-white px-3 pt-8 pb-3">
        <p className="text-[8px] opacity-70">Supervision</p>
        <p className="text-[13px] font-bold">Vue globale</p>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-1.5 px-2 -mt-3">
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">CA Jour</p>
          <p className="text-[13px] font-bold text-purple-600">28 450€</p>
          <p className="text-[7px] text-green-500">+8.5%</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">Commandes</p>
          <p className="text-[13px] font-bold text-purple-600">47</p>
          <p className="text-[7px] text-green-500">+12.3%</p>
        </div>
      </div>
      {/* Dépôts */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">3 Dépôts</p>
        <div className="space-y-1">
          {[
            { name: "Lyon (Siège)", orders: 28, ca: "16 800€", color: "border-l-purple-500" },
            { name: "Montpellier", orders: 12, ca: "7 200€", color: "border-l-blue-500" },
            { name: "Bordeaux", orders: 7, ca: "4 450€", color: "border-l-green-500" },
          ].map((d, i) => (
            <div key={i} className={`bg-white rounded-lg p-2 shadow-sm border-l-2 ${d.color}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold text-gray-800">{d.name}</p>
                  <p className="text-[7px] text-gray-400">{d.orders} commandes</p>
                </div>
                <p className="text-[10px] font-bold text-gray-900">{d.ca}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Équipe */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">Équipe (8)</p>
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <div className="space-y-1.5">
            {[
              { name: "Hamza K.", perf: 83, ca: "7 250€" },
              { name: "Fatima Z.", perf: 72, ca: "5 400€" },
              { name: "Karim B.", perf: 65, ca: "4 100€" },
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[7px] font-bold text-purple-600">{m.name.charAt(0)}</div>
                <span className="text-[8px] font-medium text-gray-800 w-14">{m.name}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${m.perf}%` }} /></div>
                <span className="text-[8px] font-bold text-gray-700">{m.ca}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenAdmin() {
  return (
    <div className="h-full bg-gray-50 text-[10px] leading-tight">
      {/* Header */}
      <div className="bg-gray-700 text-white px-3 pt-8 pb-3">
        <p className="text-[8px] opacity-70">Administration</p>
        <p className="text-[13px] font-bold">Paramètres</p>
      </div>
      {/* Menu items */}
      <div className="px-2 mt-3 space-y-1.5">
        {[
          { icon: Users, label: "Utilisateurs & Droits", detail: "8 actifs", active: true },
          { icon: Package, label: "Catalogues & Tarifs", detail: "500 réf.", active: false },
          { icon: Bell, label: "Notifications", detail: "Activées", active: false },
          { icon: Shield, label: "Sécurité", detail: "2FA actif", active: false },
        ].map((item, i) => (
          <div key={i} className={`bg-white rounded-lg p-2.5 shadow-sm flex items-center gap-2.5 ${item.active ? "border border-gray-300" : ""}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.active ? "bg-gray-700 text-white" : "bg-gray-100"}`}>
              <item.icon className={`w-3.5 h-3.5 ${item.active ? "" : "text-gray-500"}`} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-bold text-gray-800">{item.label}</p>
              <p className="text-[7px] text-gray-400">{item.detail}</p>
            </div>
            <ArrowRight className="w-3 h-3 text-gray-300" />
          </div>
        ))}
      </div>
      {/* Users panel */}
      <div className="px-2 mt-2">
        <div className="bg-white rounded-lg p-2.5 shadow-sm">
          <p className="text-[9px] font-bold text-gray-700 mb-2">Utilisateurs actifs</p>
          <div className="space-y-1.5">
            {[
              { name: "Hamza K.", role: "Commercial Senior", status: "Actif" },
              { name: "Fatima Z.", role: "Commercial", status: "Actif" },
              { name: "Ahmed B.", role: "Directeur", status: "Actif" },
              { name: "Nadia A.", role: "Commercial Junior", status: "Absent" },
            ].map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[7px] font-bold text-gray-600">{u.name.charAt(0)}</div>
                <div className="flex-1">
                  <p className="text-[8px] font-medium text-gray-800">{u.name}</p>
                  <p className="text-[7px] text-gray-400">{u.role}</p>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${u.status === "Actif" ? "bg-green-400" : "bg-gray-300"}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Export */}
      <div className="px-2 mt-2">
        <div className="bg-white rounded-lg p-2 shadow-sm flex items-center gap-2">
          <Settings className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[8px] text-gray-600">Export comptable automatique</span>
          <div className="ml-auto w-6 h-3 bg-green-500 rounded-full relative">
            <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenPortail() {
  return (
    <div className="h-full bg-gray-50 text-[10px] leading-tight">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 pt-8 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[8px] opacity-80">Bienvenue</p>
            <p className="text-[13px] font-bold">Kebab Istanbul</p>
          </div>
          <span className="bg-white/20 text-[7px] px-1.5 py-0.5 rounded-full">Client Gold ⭐</span>
        </div>
        <p className="text-[8px] opacity-70 mt-0.5">Mehmet Y. • -10% remise</p>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 px-2 -mt-3">
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">Commandes</p>
          <p className="text-[13px] font-bold text-orange-600">8</p>
          <p className="text-[7px] text-gray-400">ce mois</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <p className="text-[8px] text-gray-400">Total</p>
          <p className="text-[13px] font-bold text-orange-600">12 450€</p>
          <p className="text-[7px] text-gray-400">ce mois</p>
        </div>
      </div>
      {/* Quick order */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">Commander vite</p>
        <div className="space-y-1">
          {[
            { name: "Broche Kebab B/V 10kg", price: "67,50€", icon: "🥩" },
            { name: "Pain Pita x100", price: "12,90€", icon: "🥖" },
            { name: "Sauce Blanche 5L", price: "8,50€", icon: "🧴" },
          ].map((p, i) => (
            <div key={i} className="bg-white rounded-lg px-2 py-1.5 shadow-sm flex items-center gap-2">
              <span className="text-[14px]">{p.icon}</span>
              <div className="flex-1">
                <p className="text-[8px] font-medium text-gray-800">{p.name}</p>
                <p className="text-[8px] font-bold text-orange-600">{p.price}</p>
              </div>
              <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center">
                <span className="text-white text-[10px]">+</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Recent orders */}
      <div className="px-2 mt-2">
        <p className="text-[9px] font-bold text-gray-700 mb-1">Dernières commandes</p>
        <div className="space-y-1">
          {[
            { id: "1089", amount: "458€", items: 8, status: "En livraison", color: "bg-blue-100 text-blue-700" },
            { id: "1082", amount: "672€", items: 12, status: "Livrée", color: "bg-green-100 text-green-700" },
          ].map((o, i) => (
            <div key={i} className="bg-white rounded-lg px-2 py-1.5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[8px] font-medium text-gray-800">CMD-{o.id}</p>
                <p className="text-[7px] text-gray-400">{o.items} articles • {o.amount}</p>
              </div>
              <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${o.color}`}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Agent IA */}
      <div className="px-2 mt-2">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-center gap-2">
          <Bot className="w-4 h-4 text-orange-500" />
          <div className="flex-1">
            <p className="text-[8px] font-bold text-orange-700">Agent IA 24/7</p>
            <p className="text-[7px] text-orange-500">Posez vos questions !</p>
          </div>
          <ArrowRight className="w-3 h-3 text-orange-400" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================

export default function OffreDistramPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const painPoints = [
    { icon: Clock, title: "2 heures pour UN devis", description: "Ton commercial visite un kebab, note le menu, rentre au bureau, cherche les prix dans Excel... Pendant ce temps, la concurrence a déjà signé.", cost: "15 000€/an perdus" },
    { icon: Phone, title: "Le téléphone sonne H24", description: "'C'est quoi le prix du kebab ?' 'Vous livrez demain ?' Même le dimanche à 22h. Tes équipes n'en peuvent plus.", cost: "70% d'appels = questions simples" },
    { icon: BarChart3, title: "Aucune visibilité", description: "Lyon fait quoi ? Bordeaux a combien de commandes ? Tu pilotes 3 dépôts à l'aveugle. Les décisions se prennent au doigt mouillé.", cost: "0 vision = mauvaises décisions" },
    { icon: Truck, title: "Livreurs qui tournent en rond", description: "Tes livreurs font 50km de plus que nécessaire chaque jour. Essence, temps, usure des véhicules. Et des clients qui attendent.", cost: "36 000€/an en carburant gaspillé" },
    { icon: Shield, title: "Clients qui partent en silence", description: "Tu découvres qu'un client est parti... 2 mois après. Il commande chez le concurrent. Personne n'a vu les signaux.", cost: "12 000€ par client perdu" },
    { icon: MessageSquare, title: "Tout passe par WhatsApp", description: "Commandes par message vocal, réclamations perdues, aucune traçabilité. Si un commercial part, l'historique disparaît.", cost: "Zéro traçabilité" },
  ];

  const espaces: Array<{
    icon: typeof Users; color: string; emoji: string; number: string;
    title: string; subtitle: string; features: string[]; stat: string;
    screen: React.ReactNode; link: string;
  }> = [
    {
      icon: Users, color: "blue", emoji: "📱", number: "01",
      title: "Espace Commercial",
      subtitle: "Tes 8 commerciaux closent 3× plus",
      features: [
        "Scan Menu IA : photo → devis en 30 secondes",
        "Pipeline prospects automatisé par l'IA",
        "Historique client complet + alertes",
        "Géolocalisation et planning terrain",
      ],
      stat: "7 RDV/jour au lieu de 3",
      screen: <ScreenCommercial />,
      link: "/commercial",
    },
    {
      icon: Truck, color: "green", emoji: "🚚", number: "02",
      title: "Espace Livreur",
      subtitle: "Moins de km, plus de livraisons",
      features: [
        "Tournées optimisées par IA (-30% km)",
        "GPS temps réel + navigation",
        "Signature électronique = preuve",
        "Notifications automatiques aux clients",
      ],
      stat: "-30% de kilomètres",
      screen: <ScreenLivreur />,
      link: "/livreur",
    },
    {
      icon: BarChart3, color: "purple", emoji: "📊", number: "03",
      title: "Espace Manager",
      subtitle: "Lyon, Montpellier, Bordeaux sur 1 écran",
      features: [
        "Dashboard multi-dépôts temps réel",
        "Alertes IA : 'Rupture kebab dans 3 jours'",
        "KPIs en direct + rapports automatiques",
        "Suivi performances équipes",
      ],
      stat: "100% visibilité",
      screen: <ScreenManager />,
      link: "/supervision",
    },
    {
      icon: Settings, color: "gray", emoji: "⚙️", number: "04",
      title: "Espace Administration",
      subtitle: "Configure tout, sans nous appeler",
      features: [
        "Gestion utilisateurs et droits",
        "Catalogues et tarifs personnalisables",
        "Export comptable automatique",
        "Paramètres avancés",
      ],
      stat: "Autonomie totale",
      screen: <ScreenAdmin />,
      link: "/settings",
    },
    {
      icon: ShoppingCart, color: "orange", emoji: "🛒", number: "05",
      title: "Portail Client B2B",
      subtitle: "Tes 300 clients commandent 24h/24",
      features: [
        "Commandes en ligne autonomes 24/7",
        "Agent IA intégré qui répond instantanément",
        "Historique, factures, suggestions personnalisées",
        "L'IA vend pendant que tu dors",
      ],
      stat: "-70% d'appels",
      screen: <ScreenPortail />,
      link: "/portail",
    },
  ];

  const iaFeatures = [
    { icon: Brain, title: "Agent IA 24/7", description: "Il répond à 3h du matin. Il connaît tes 500 références par cœur. Il suggère, il vend, il fidélise. Il ne dort jamais." },
    { icon: Camera, title: "Scan Menu IA", description: "Ton commercial prend le menu en photo. 30 secondes plus tard, le devis personnalisé est prêt. Fini les 2h de saisie." },
    { icon: Shield, title: "Détection de décrochage", description: "L'IA repère les clients qui commandent moins. Tu es alerté AVANT qu'ils partent à la concurrence." },
    { icon: Target, title: "Prospection intelligente", description: "Nouveau restaurant qui ouvre près de Lyon ? L'IA le détecte et te le signale automatiquement." },
    { icon: Route, title: "Tournées optimisées", description: "L'IA calcule le meilleur parcours. Résultat : -30% de km, -36 000€/an de carburant." },
    { icon: MessageSquare, title: "Messagerie intégrée", description: "Fini WhatsApp. Toutes les conversations clients tracées, sécurisées, accessibles à toute l'équipe." },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", light: "bg-blue-100" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", light: "bg-green-100" },
    purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", light: "bg-purple-100" },
    gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", light: "bg-gray-100" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", light: "bg-orange-100" },
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased">
      {/* ===================== NAV STICKY ===================== */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-4 py-3 transition-all duration-300",
          isScrolled ? "bg-[#1A1A1A]/95 backdrop-blur-xl shadow-lg" : "bg-transparent"
        )}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
            >
              D
            </div>
            <span className="font-bold text-lg text-white">DISTRAM × FACE MEDIA</span>
          </div>
          <a
            href={FAICAL_PHONE_LINK}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
          >
            <Phone className="w-4 h-4" />
            <span className="hidden md:inline">{FAICAL_PHONE}</span>
          </a>
        </div>
      </nav>

      {/* ===================== SECTION 1: HERO ===================== */}
      <section className="relative min-h-screen bg-gradient-to-br from-[#1A1A1A] via-gray-900 to-[#1A1A1A] text-white flex items-center pt-20">
        <div className="container mx-auto px-4 py-16 text-center">
          <Reveal>
            <div
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm mb-8 animate-pulse"
              style={{ background: `${DISTRAM_COLORS.primary}20`, color: DISTRAM_COLORS.primary }}
            >
              <Star className="w-4 h-4" />
              Proposition exclusive pour DISTRAM
            </div>
          </Reveal>

          <Reveal className="delay-100">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
              Et si DISTRAM prenait
              <br />
              <span style={{ color: DISTRAM_COLORS.primary }}>10 ans d&apos;avance</span>
              <br />
              sur la concurrence ?
            </h1>
          </Reveal>

          <Reveal className="delay-200">
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
              Une plateforme intelligente qui gère tes commerciaux, tes livreurs, tes stocks et tes clients.{" "}
              <span style={{ color: DISTRAM_COLORS.primary }}>Pendant que tu dors.</span>
            </p>
          </Reveal>

          <Reveal className="delay-300">
            <div className="flex flex-col md:flex-row justify-center gap-4 mb-16">
              <a
                href="#ecosysteme"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-xl font-semibold rounded-xl transition-all hover:-translate-y-1"
                style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
              >
                Découvrir comment <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </Reveal>

          {/* Stats hero */}
          <Reveal className="delay-400">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-gray-400">
              <div className="text-center">
                <p className="text-3xl md:text-5xl font-black text-white">
                  <AnimatedCounter value={291000} suffix="€" />
                </p>
                <p className="text-sm mt-1">de gains/an</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-5xl font-black" style={{ color: DISTRAM_COLORS.primary }}>×19</p>
                <p className="text-sm mt-1">retour sur investissement</p>
              </div>
              <div className="text-center">
                <p className="text-3xl md:text-5xl font-black text-white">3 sem.</p>
                <p className="text-sm mt-1">pour être rentable</p>
              </div>
            </div>
          </Reveal>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </section>

      {/* ===================== SECTION 2: LES PROBLÈMES ===================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Hamza, on sait ce que tu vis au quotidien.
            </h2>
            <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
              Gérer 300 clients, 8 commerciaux et 3 dépôts avec des outils des années 2000, c&apos;est épuisant.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {painPoints.map((pain, i) => (
              <Reveal key={i} className={i > 0 ? `delay-${Math.min(i, 5)}00` : ""}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                    <pain.icon className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{pain.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{pain.description}</p>
                  <p className="text-red-500 font-semibold text-sm">→ {pain.cost}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 3: ÉCOSYSTÈME ===================== */}
      <section id="ecosysteme" className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Une seule plateforme.{" "}
              <span style={{ color: DISTRAM_COLORS.primary }}>Tout est connecté.</span>
            </h2>
            <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
              Ce n&apos;est pas 5 outils séparés. C&apos;est UN écosystème intelligent où chaque action alimente les autres.
            </p>
          </Reveal>

          {/* Schéma visuel */}
          <div className="max-w-4xl mx-auto mb-16">
            {/* IA Centrale */}
            <Reveal>
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl blur-xl opacity-30" style={{ background: DISTRAM_COLORS.primary }} />
                  <div className="relative bg-gradient-to-br from-[#1A1A1A] to-gray-800 text-white rounded-3xl p-8 text-center max-w-md shadow-2xl border border-gray-700">
                    <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${DISTRAM_COLORS.primary}30` }}>
                      <Brain className="w-10 h-10" style={{ color: DISTRAM_COLORS.primary }} />
                    </div>
                    <h3 className="text-2xl font-black mb-2" style={{ color: DISTRAM_COLORS.primary }}>IA CENTRALE</h3>
                    <p className="text-gray-300 text-sm">Le cerveau de DISTRAM</p>
                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-lg font-bold" style={{ color: DISTRAM_COLORS.primary }}>500</p>
                        <p className="text-[10px] text-gray-400">références</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-lg font-bold" style={{ color: DISTRAM_COLORS.primary }}>300</p>
                        <p className="text-[10px] text-gray-400">clients</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-2">
                        <p className="text-lg font-bold" style={{ color: DISTRAM_COLORS.primary }}>3</p>
                        <p className="text-[10px] text-gray-400">dépôts</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Connexion lines */}
            <Reveal className="delay-100">
              <div className="flex justify-center mb-6">
                <div className="w-px h-8 bg-gradient-to-b from-[#F5A623] to-gray-300" />
              </div>
            </Reveal>

            {/* 5 espaces en grille */}
            <Reveal className="delay-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { emoji: "📱", label: "Commercial", color: "blue" },
                  { emoji: "🚚", label: "Livreur", color: "green" },
                  { emoji: "📊", label: "Manager", color: "purple" },
                  { emoji: "⚙️", label: "Admin", color: "gray" },
                  { emoji: "🛒", label: "Portail", color: "orange" },
                ].map((item, i) => (
                  <div key={i} className={cn("rounded-xl p-4 text-center border-2 hover:shadow-lg transition-all", colorMap[item.color].bg, colorMap[item.color].border)}>
                    <div className="text-3xl mb-2">{item.emoji}</div>
                    <p className={cn("text-sm font-bold", colorMap[item.color].text)}>{item.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Flux */}
            <Reveal className="delay-300">
              <div className="mt-12 grid md:grid-cols-2 gap-4">
                {[
                  { step: "1", title: "Le commercial scanne un menu", desc: "L'IA crée le devis en 30 sec. Le client est ajouté. L'IA apprend ses préférences." },
                  { step: "2", title: "Le client commande sur le portail", desc: "L'agent IA l'aide à choisir. La commande arrive en temps réel. Le stock se met à jour." },
                  { step: "3", title: "Le manager voit tout", desc: "3 dépôts sur 1 écran. Alerté si rupture prévue. Décisions basées sur données réelles." },
                  { step: "4", title: "Le livreur part en tournée optimisée", desc: "Parcours calculé par l'IA. Client notifié. Signature électronique = preuve." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white" style={{ background: DISTRAM_COLORS.primary }}>
                      {item.step}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Bénéfices */}
            <Reveal className="delay-400">
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <Zap className="w-8 h-8 mx-auto mb-2" style={{ color: DISTRAM_COLORS.primary }} />
                  <p className="font-bold text-gray-900">Automatisé</p>
                  <p className="text-xs text-gray-500 mt-1">Plus de double saisie, tout se synchronise</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: DISTRAM_COLORS.primary }} />
                  <p className="font-bold text-gray-900">Centralisé</p>
                  <p className="text-xs text-gray-500 mt-1">Fini les infos éparpillées, tout au même endroit</p>
                </div>
                <div className="text-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
                  <Brain className="w-8 h-8 mx-auto mb-2" style={{ color: DISTRAM_COLORS.primary }} />
                  <p className="font-bold text-gray-900">Intelligent</p>
                  <p className="text-xs text-gray-500 mt-1">L&apos;IA apprend et s&apos;améliore chaque jour</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: LES 5 ESPACES EN DÉTAIL ===================== */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Une plateforme.{" "}
              <span style={{ color: DISTRAM_COLORS.primary }}>Cinq espaces.</span>
            </h2>
            <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
              Chaque métier a son propre espace dédié. L&apos;IA connaît tes 500 références, tes 300 clients, tes 3 dépôts. Et elle s&apos;améliore chaque jour.
            </p>
          </Reveal>

          <div className="space-y-16 md:space-y-24 max-w-6xl mx-auto">
            {espaces.map((espace, i) => {
              const c = colorMap[espace.color];
              const isEven = i % 2 === 0;
              return (
                <Reveal key={i} className={i > 0 ? `delay-${Math.min(i, 3)}00` : ""}>
                  <div className={cn(
                    "flex flex-col items-center gap-8 md:gap-12",
                    "md:flex-row",
                    !isEven && "md:flex-row-reverse"
                  )}>
                    {/* Phone mockup */}
                    <div className="flex-shrink-0">
                      <PhoneMockup>
                        {espace.screen}
                      </PhoneMockup>
                    </div>

                    {/* Text content */}
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-xl", c.light)}>
                          {espace.emoji}
                        </div>
                        <div>
                          <p className={cn("text-xs font-bold", c.text)}>ESPACE {espace.number}</p>
                          <h3 className="text-2xl md:text-3xl font-bold text-gray-900">{espace.title}</h3>
                        </div>
                      </div>

                      <p className="text-lg text-gray-600 mb-6">{espace.subtitle}</p>

                      <ul className="space-y-3 mb-8">
                        {espace.features.map((f, j) => (
                          <li key={j} className="flex items-start gap-3 justify-center md:justify-start">
                            <CheckCircle className={cn("w-5 h-5 mt-0.5 flex-shrink-0", c.text)} />
                            <span className="text-gray-700">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                        <div className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm", c.light, c.text)}>
                          <TrendingUp className="w-4 h-4" />
                          {espace.stat}
                        </div>
                        <Link
                          href={espace.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:-translate-y-0.5"
                          style={{ background: DISTRAM_COLORS.primary }}
                        >
                          Tester cet espace <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 5: L'IA QUI CHANGE TOUT ===================== */}
      <section className="py-20 bg-[#1A1A1A] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              L&apos;intelligence artificielle travaille pour toi.{" "}
              <span style={{ color: DISTRAM_COLORS.primary }}>24h/24.</span>
            </h2>
            <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
              6 modules d&apos;IA qui automatisent, prédisent et vendent — sans intervention humaine.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {iaFeatures.map((feat, i) => (
              <Reveal key={i} className={i > 0 ? `delay-${Math.min(i, 3)}00` : ""}>
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700 hover:border-[#F5A623]/50 transition-all h-full">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${DISTRAM_COLORS.primary}20` }}>
                    <feat.icon className="w-6 h-6" style={{ color: DISTRAM_COLORS.primary }} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{feat.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Mockup conversation */}
          <Reveal>
            <div className="max-w-lg mx-auto">
              <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
                <ConversationMockup />
              </div>
              <div className="text-center mt-6">
                <Link
                  href="/portail/assistant"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-1"
                  style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
                >
                  Tester l&apos;agent IA <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== SECTION 6: LES RÉSULTATS — ROI ===================== */}
      <section id="gains" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Les chiffres parlent d&apos;eux-mêmes.
            </h2>
            <p className="text-center text-gray-500 mb-16">
              Basé sur tes vrais chiffres : 300 clients, 8 commerciaux, 3 dépôts, 500 références.
            </p>
          </Reveal>

          <div className="max-w-4xl mx-auto">
            {/* Tableau Avant/Après */}
            <Reveal>
              <div className="overflow-x-auto mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: DISTRAM_COLORS.primary }}>
                      <th className="text-left py-3 px-4 font-bold text-gray-900">Domaine</th>
                      <th className="text-center py-3 px-4 font-bold text-red-500">Avant</th>
                      <th className="text-center py-3 px-4 font-bold text-green-600">Après</th>
                      <th className="text-center py-3 px-4 font-bold" style={{ color: DISTRAM_COLORS.primary }}>Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { domain: "Temps devis", before: "2 heures", after: "30 secondes", gain: "-90%" },
                      { domain: "Appels entrants", before: "100/jour", after: "30/jour", gain: "-70%" },
                      { domain: "Km livraison", before: "100%", after: "70%", gain: "-30%" },
                      { domain: "Panier moyen", before: "Base", after: "Base + 15%", gain: "+15%" },
                      { domain: "Clients perdus/an", before: "~20", after: "~5", gain: "-75%" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-gray-900">{row.domain}</td>
                        <td className="py-3 px-4 text-center text-red-500 line-through">{row.before}</td>
                        <td className="py-3 px-4 text-center text-green-600 font-semibold">{row.after}</td>
                        <td className="py-3 px-4 text-center font-bold" style={{ color: DISTRAM_COLORS.primary }}>{row.gain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>

            {/* Gains détaillés */}
            <Reveal className="delay-100">
              <div className="rounded-2xl p-8 mb-8" style={{ background: `${DISTRAM_COLORS.primary}10` }}>
                <h3 className="text-xl font-bold mb-6">Ce que tu GAGNES chaque année :</h3>
                <div className="space-y-4">
                  {[
                    { label: "Temps commercial récupéré", detail: "2h/devis × 8 commerciaux × 200 devis/an", value: "+78 000€" },
                    { label: "Clients sauvés (détection décrochage)", detail: "10 clients × 12 000€/client", value: "+120 000€" },
                    { label: "Carburant économisé", detail: "Tournées optimisées, -30% de km", value: "+36 000€" },
                    { label: "Ventes additionnelles (cross-sell IA)", detail: "+15% panier moyen", value: "+45 000€" },
                    { label: "Appels évités (portail + IA)", detail: "70% d'appels en moins", value: "+12 000€" },
                  ].map((line, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{line.label}</p>
                        <p className="text-sm text-gray-500">{line.detail}</p>
                      </div>
                      <p className="font-bold text-gray-900 text-right">{line.value}</p>
                    </div>
                  ))}
                  <div className="border-t-2 pt-4 mt-4" style={{ borderColor: DISTRAM_COLORS.primary }}>
                    <div className="flex justify-between items-center text-xl">
                      <p className="font-bold" style={{ color: DISTRAM_COLORS.primary }}>TOTAL GAINS ANNUELS</p>
                      <p className="text-2xl font-black" style={{ color: DISTRAM_COLORS.primary }}>+291 000€</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Grande card ROI */}
            <Reveal className="delay-200">
              <div className="bg-[#1A1A1A] text-white rounded-2xl p-10 text-center">
                <p className="text-gray-400 mb-3">Ce que tu gagnes</p>
                <p className="text-5xl md:text-6xl font-black mb-3" style={{ color: DISTRAM_COLORS.primary }}>
                  +<AnimatedCounter value={291000} suffix="€" />/an
                </p>
                <p className="text-xl text-gray-300 mb-8">de gains potentiels avec la plateforme complète</p>
                <div className="flex justify-center gap-12">
                  <div>
                    <p className="text-4xl font-black" style={{ color: DISTRAM_COLORS.primary }}>×19</p>
                    <p className="text-sm text-gray-400 mt-1">retour sur investissement</p>
                    <p className="text-xs text-gray-500">Pour 1€ investi = 19€ récupérés</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black" style={{ color: DISTRAM_COLORS.primary }}>3 sem.</p>
                    <p className="text-sm text-gray-400 mt-1">pour être rentable</p>
                    <p className="text-xs text-gray-500">Investissement amorti en 21 jours</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 7: POURQUOI FACE MEDIA ===================== */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Pourquoi nous faire confiance ?
            </h2>
          </Reveal>

          <div className="max-w-4xl mx-auto">
            {/* Faiçal */}
            <Reveal>
              <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                <div className="flex-shrink-0">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${DISTRAM_COLORS.primary} 0%, ${DISTRAM_COLORS.primaryDark} 100%)` }}
                  >
                    F
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">
                    Je m&apos;appelle Faiçal.{" "}
                    <span style={{ color: DISTRAM_COLORS.primary }}>Je connais tes galères.</span>
                  </h3>
                  <p className="text-gray-600 mb-3">
                    <strong className="text-gray-900">8 ans comme grossiste alimentaire.</strong> J&apos;ai dirigé Marketfood.
                    {" "}<strong className="text-gray-900">15 ans dans la restauration.</strong> J&apos;ai créé cette solution pour résoudre les problèmes que j&apos;ai vécus pendant{" "}
                    <strong className="text-gray-900">23 ans</strong> dans ce secteur.
                  </p>
                  <p className="text-gray-600">
                    Cette plateforme, c&apos;est l&apos;outil que j&apos;aurais voulu avoir pour faire performer mes équipes.
                  </p>
                  <div className="flex gap-8 mt-6">
                    {[
                      { value: "8 ans", label: "Grossiste" },
                      { value: "15 ans", label: "Restauration" },
                      { value: "23 ans", label: "Dans ce secteur" },
                    ].map((stat, i) => (
                      <div key={i} className="text-center">
                        <p className="text-2xl font-bold" style={{ color: DISTRAM_COLORS.primary }}>{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Ce qu'on offre */}
            <Reveal className="delay-100">
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  "Formation complète de ton équipe",
                  "Support 7j/7 par téléphone",
                  "Mises à jour gratuites à vie",
                  "Migration de tes données existantes",
                  "Personnalisation à ton image",
                  "Accompagnement continu",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Partenaire prioritaire */}
            <Reveal className="delay-200">
              <div className="rounded-2xl p-6 text-center border-2" style={{ borderColor: DISTRAM_COLORS.primary, background: `${DISTRAM_COLORS.primary}10` }}>
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-bold mb-3" style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}>
                  <Star className="w-4 h-4" /> PARTENAIRE PRIORITAIRE
                </div>
                <p className="text-lg font-bold text-gray-900 mb-2">
                  DISTRAM fait partie de nos premiers partenaires.
                </p>
                <p className="text-gray-600">
                  Tu bénéficies de conditions qui ne seront <strong>JAMAIS reproposées</strong>.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 8: CTA FINAL ===================== */}
      <section className="py-20 bg-[#1A1A1A] text-white">
        <div className="container mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              Prêt à digitaliser{" "}
              <span style={{ color: DISTRAM_COLORS.primary }}>DISTRAM</span> ?
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Appelle Faiçal. On te montre la plateforme avec TES vrais produits, TES vrais clients, TES vrais chiffres.
            </p>
          </Reveal>

          <Reveal className="delay-100">
            <a
              href={FAICAL_PHONE_LINK}
              className="inline-flex items-center justify-center gap-3 text-2xl md:text-3xl px-12 py-6 rounded-2xl font-black transition-all hover:-translate-y-2 hover:shadow-2xl"
              style={{ background: DISTRAM_COLORS.primary, color: DISTRAM_COLORS.black }}
            >
              <Phone className="w-8 h-8" />
              {FAICAL_PHONE}
            </a>
            <p className="text-gray-500 mt-6">
              Ou{" "}
              <Link
                href="/portail"
                target="_blank"
                className="underline hover:text-white transition-colors"
                style={{ color: DISTRAM_COLORS.primary }}
              >
                teste la démo en ligne →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="py-8 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            DISTRAM × FACE MEDIA — Votre partenaire digitalisation
          </p>
          <p className="text-gray-500 text-sm mt-2">© 2026 FACE MEDIA</p>
        </div>
      </footer>
    </div>
  );
}
