"use client";

import { useState, useEffect, useRef } from "react";
import {
  Hash,
  Users,
  Megaphone,
  Lock,
  ChevronDown,
  ChevronRight,
  Send,
  Smile,
  Search,
  Plus,
  Settings,
  Pin,
  MoreHorizontal,
  Phone,
  Video,
  AtSign,
  Image as ImageIcon,
  FileText,
  MapPin,
  Truck,
  Briefcase,
  Building2,
  Calculator,
  Headphones,
  Star,
  MessageSquare,
  Bell,
  Clock,
  Bookmark,
  Reply,
  Forward,
  Trash2,
  Edit3,
  Copy,
  X,
  Home,
  ChevronLeft,
  Filter,
  ArrowUp,
  Mic,
  Paperclip,
  Command,
  Zap,
  Circle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

// Types
interface Thread {
  id: string;
  parentId: string;
  replies: Message[];
  lastReply?: string;
  replyCount: number;
  participants: string[];
}

interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "direct" | "announcement";
  category: string;
  description?: string;
  color: string;
  icon: any;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  members?: number;
  lastMessage?: {
    user: string;
    text: string;
    time: string;
  };
}

interface Message {
  id: string;
  channelId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userColor: string;
  content: string;
  time: string;
  date: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
  attachments?: { type: string; name: string; url: string; size?: string }[];
  isSystem?: boolean;
  isPinned?: boolean;
  isSaved?: boolean;
  threadId?: string;
  replyCount?: number;
  edited?: boolean;
}

interface User {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "busy" | "offline";
  avatar?: string;
  color: string;
  statusMessage?: string;
}

interface Activity {
  id: string;
  type: "mention" | "reaction" | "reply" | "dm";
  user: string;
  userColor: string;
  channel?: string;
  message: string;
  time: string;
  read: boolean;
}

type ViewType = "home" | "activity" | "dms" | "later" | "channel";

// Canaux DISTRAM
const CHANNEL_CATEGORIES = [
  { id: "favoris", name: "Favoris", color: "from-amber-500 to-yellow-500" },
  { id: "direction", name: "Direction", color: "from-purple-500 to-indigo-600" },
  { id: "equipes", name: "Équipes", color: "from-blue-500 to-cyan-500" },
  { id: "operations", name: "Opérations", color: "from-green-500 to-emerald-500" },
  { id: "support", name: "Support", color: "from-orange-500 to-amber-500" },
];

const CHANNELS: Channel[] = [
  // Favoris (pinned channels show here too)
  { id: "annonces", name: "annonces-generales", type: "announcement", category: "direction", description: "Annonces officielles de la direction", color: "bg-purple-500", icon: Megaphone, unread: 2, pinned: true, members: 45 },
  { id: "urgences", name: "urgences-livraison", type: "public", category: "operations", description: "Problèmes urgents livraisons", color: "bg-red-500", icon: Megaphone, unread: 1, pinned: true, members: 35 },

  // Direction
  { id: "direction", name: "comite-direction", type: "private", category: "direction", description: "Réunions et décisions stratégiques", color: "bg-indigo-500", icon: Building2, unread: 0, members: 5 },
  { id: "compta", name: "comptabilite", type: "private", category: "direction", description: "Facturation, paiements, finances", color: "bg-violet-500", icon: Calculator, unread: 5, members: 4 },

  // Équipes
  { id: "commerciaux", name: "equipe-commerciale", type: "public", category: "equipes", description: "Coordination équipe commerciale", color: "bg-blue-500", icon: Briefcase, unread: 12, members: 15 },
  { id: "livreurs", name: "equipe-livreurs", type: "public", category: "equipes", description: "Coordination livraisons", color: "bg-cyan-500", icon: Truck, unread: 8, members: 20 },
  { id: "entrepot", name: "equipe-entrepot", type: "public", category: "equipes", description: "Gestion stocks et préparation", color: "bg-teal-500", icon: Users, unread: 3, members: 12 },

  // Opérations
  { id: "planning", name: "planning-tournees", type: "public", category: "operations", description: "Organisation des tournées", color: "bg-green-500", icon: MapPin, unread: 0, members: 25 },
  { id: "clients", name: "retours-clients", type: "public", category: "operations", description: "Feedback et réclamations", color: "bg-emerald-500", icon: Star, unread: 4, members: 20 },

  // Support
  { id: "support", name: "support-technique", type: "public", category: "support", description: "Aide technique et informatique", color: "bg-orange-500", icon: Headphones, unread: 0, members: 45 },
  { id: "general", name: "discussion-generale", type: "public", category: "support", description: "Discussions informelles", color: "bg-amber-500", icon: Hash, unread: 15, members: 45 },
];

const USERS: User[] = [
  { id: "u1", name: "Hamza Directeur", role: "PDG", status: "online", color: "bg-purple-500", statusMessage: "Disponible" },
  { id: "u2", name: "Sophie Martin", role: "Commerciale", status: "online", color: "bg-blue-500", statusMessage: "En réunion jusqu'à 14h" },
  { id: "u3", name: "Thomas Bernard", role: "Commercial", status: "away", color: "bg-cyan-500", statusMessage: "Pause déjeuner" },
  { id: "u4", name: "Karim Mansouri", role: "Livreur", status: "online", color: "bg-green-500", statusMessage: "En tournée" },
  { id: "u5", name: "Julie Lambert", role: "Comptable", status: "busy", color: "bg-violet-500", statusMessage: "Ne pas déranger" },
  { id: "u6", name: "Youssef Benali", role: "Livreur", status: "online", color: "bg-teal-500" },
  { id: "u7", name: "Emma Wilson", role: "Commerciale", status: "offline", color: "bg-pink-500" },
  { id: "u8", name: "Lucas Martin", role: "Préparateur", status: "online", color: "bg-orange-500" },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  commerciaux: [
    { id: "m1", channelId: "commerciaux", userId: "u2", userName: "Sophie Martin", userColor: "bg-blue-500", content: "Bonjour l'équipe ! J'ai décroché un nouveau client ce matin : Napoli Pizza à Lyon. Commande de 2500€/semaine 🎉", time: "09:15", date: "Aujourd'hui", replyCount: 3 },
    { id: "m2", channelId: "commerciaux", userId: "u3", userName: "Thomas Bernard", userColor: "bg-cyan-500", content: "Bravo Sophie ! C'est énorme ! Tu as utilisé quelle approche ?", time: "09:18", date: "Aujourd'hui", threadId: "m1" },
    { id: "m3", channelId: "commerciaux", userId: "u2", userName: "Sophie Martin", userColor: "bg-blue-500", content: "J'ai montré le scan menu avec l'IA, ils ont été bluffés par la rapidité du devis. Je peux vous faire une démo si vous voulez.", time: "09:20", date: "Aujourd'hui" },
    { id: "m4", channelId: "commerciaux", userId: "u1", userName: "Hamza Directeur", userColor: "bg-purple-500", content: "Excellent travail Sophie ! @Thomas tu devrais essayer cette approche avec tes prospects. On peut organiser un call demain pour partager les best practices ?", time: "09:25", date: "Aujourd'hui", reactions: [{ emoji: "👍", count: 4, users: ["Thomas", "Karim", "Julie", "Emma"] }, { emoji: "🚀", count: 2, users: ["Sophie", "Lucas"] }], isPinned: true },
    { id: "m5", channelId: "commerciaux", userId: "u7", userName: "Emma Wilson", userColor: "bg-pink-500", content: "Je vais voir le Kebab Royal cet après-midi, je vais tester ça aussi ! @Sophie tu peux m'envoyer ta présentation ?", time: "09:30", date: "Aujourd'hui" },
    { id: "m6", channelId: "commerciaux", userId: "u2", userName: "Sophie Martin", userColor: "bg-blue-500", content: "Bien sûr ! Je te l'envoie en DM avec les supports. Tu verras c'est assez simple.", time: "09:32", date: "Aujourd'hui", attachments: [{ type: "pdf", name: "Présentation_DISTRAM_2025.pdf", url: "#", size: "2.4 MB" }] },
  ],
  livreurs: [
    { id: "l1", channelId: "livreurs", userId: "u4", userName: "Karim Mansouri", userColor: "bg-green-500", content: "Tournée du matin terminée ✅ 12 livraisons, tout est OK. RAS sur le secteur Est.", time: "11:45", date: "Aujourd'hui", reactions: [{ emoji: "✅", count: 3, users: [] }] },
    { id: "l2", channelId: "livreurs", userId: "u6", userName: "Youssef Benali", userColor: "bg-teal-500", content: "🚨 Je suis bloqué sur la rocade, accident important. Retard de 20min sur mes prochaines livraisons. J'ai prévenu les clients.", time: "11:50", date: "Aujourd'hui", replyCount: 2 },
    { id: "l3", channelId: "livreurs", userId: "system", userName: "Système DISTRAM", userColor: "bg-slate-500", content: "📍 Youssef Benali a partagé sa position en temps réel", time: "11:51", date: "Aujourd'hui", isSystem: true },
    { id: "l4", channelId: "livreurs", userId: "u4", userName: "Karim Mansouri", userColor: "bg-green-500", content: "@Youssef je peux prendre ta livraison chez Délice Kebab si tu veux, je suis à 5 min. Envoie-moi les infos.", time: "11:52", date: "Aujourd'hui" },
    { id: "l5", channelId: "livreurs", userId: "u6", userName: "Youssef Benali", userColor: "bg-teal-500", content: "Ce serait top Karim, merci beaucoup ! Je te transfère le bon de livraison.", time: "11:53", date: "Aujourd'hui", reactions: [{ emoji: "🙏", count: 1, users: ["Youssef"] }, { emoji: "💪", count: 2, users: ["Karim", "Lucas"] }] },
  ],
  annonces: [
    { id: "a1", channelId: "annonces", userId: "u1", userName: "Hamza Directeur", userColor: "bg-purple-500", content: "📢 IMPORTANT : Réunion générale vendredi 14h pour présenter les nouveaux objectifs Q2. Présence obligatoire pour tous. Ordre du jour en pièce jointe.", time: "08:00", date: "Aujourd'hui", reactions: [{ emoji: "👍", count: 18, users: [] }, { emoji: "📅", count: 5, users: [] }], isPinned: true, attachments: [{ type: "doc", name: "ODJ_Reunion_Q2.docx", url: "#", size: "156 KB" }] },
    { id: "a2", channelId: "annonces", userId: "u1", userName: "Hamza Directeur", userColor: "bg-purple-500", content: "🎉 Félicitations à toute l'équipe ! Nous avons dépassé nos objectifs de 15% ce mois-ci. Prime exceptionnelle pour tous, détails à venir vendredi !", time: "17:30", date: "Hier", reactions: [{ emoji: "🎉", count: 35, users: [] }, { emoji: "❤️", count: 28, users: [] }, { emoji: "🚀", count: 15, users: [] }] },
  ],
  urgences: [
    { id: "ur1", channelId: "urgences", userId: "u6", userName: "Youssef Benali", userColor: "bg-teal-500", content: "🚨 URGENT : Client Le Régal refuse la livraison - produits non conformes selon lui (dates OK pourtant). Besoin d'un commercial sur place SVP", time: "14:20", date: "Aujourd'hui", replyCount: 4 },
    { id: "ur2", channelId: "urgences", userId: "u2", userName: "Sophie Martin", userColor: "bg-blue-500", content: "J'y vais immédiatement, je suis à 10 min. @Pierre tu restes sur place ? Je t'appelle en arrivant.", time: "14:22", date: "Aujourd'hui" },
    { id: "ur3", channelId: "urgences", userId: "u6", userName: "Youssef Benali", userColor: "bg-teal-500", content: "Oui je t'attends. Le gérant est énervé mais reste correct. Il veut parler à quelqu'un de la direction.", time: "14:23", date: "Aujourd'hui" },
    { id: "ur4", channelId: "urgences", userId: "u1", userName: "Hamza Directeur", userColor: "bg-purple-500", content: "@Sophie je te laisse gérer en premier. Si besoin, appelle-moi directement sur mon portable. Tiens-moi au courant.", time: "14:25", date: "Aujourd'hui", reactions: [{ emoji: "👍", count: 2, users: [] }] },
  ],
  compta: [
    { id: "c1", channelId: "compta", userId: "u5", userName: "Julie Lambert", userColor: "bg-violet-500", content: "Rappel : 5 factures en attente de validation pour Le Kebab du Port, total 3 250€. @Hamza tu peux checker et valider aujourd'hui ?", time: "10:00", date: "Aujourd'hui", attachments: [{ type: "xlsx", name: "Factures_KebabPort.xlsx", url: "#", size: "45 KB" }] },
    { id: "c2", channelId: "compta", userId: "u1", userName: "Hamza Directeur", userColor: "bg-purple-500", content: "Je regarde ça dans l'heure. Tu peux m'envoyer le récap des impayés également ?", time: "10:15", date: "Aujourd'hui" },
    { id: "c3", channelId: "compta", userId: "u5", userName: "Julie Lambert", userColor: "bg-violet-500", content: "Voilà le récap complet. 3 clients à relancer cette semaine.", time: "10:20", date: "Aujourd'hui", attachments: [{ type: "xlsx", name: "Recap_Impayes_Fevrier.xlsx", url: "#", size: "78 KB" }] },
  ],
};

// Messages directs simulés
const DIRECT_MESSAGES: { id: string; user: User; lastMessage: string; time: string; unread: number }[] = [
  { id: "dm1", user: USERS[1], lastMessage: "Voici la présentation comme promis !", time: "09:35", unread: 1 },
  { id: "dm2", user: USERS[3], lastMessage: "Merci pour le coup de main Karim 👍", time: "11:55", unread: 0 },
  { id: "dm3", user: USERS[4], lastMessage: "Factures validées, merci !", time: "10:45", unread: 0 },
  { id: "dm4", user: USERS[2], lastMessage: "On fait le point demain ?", time: "Hier", unread: 2 },
];

// Activités récentes
const ACTIVITIES: Activity[] = [
  { id: "act1", type: "mention", user: "Sophie Martin", userColor: "bg-blue-500", channel: "commerciaux", message: "@Hamza tu devrais essayer cette approche", time: "09:25", read: false },
  { id: "act2", type: "reaction", user: "Thomas Bernard", userColor: "bg-cyan-500", channel: "commerciaux", message: "a réagi 👍 à votre message", time: "09:26", read: false },
  { id: "act3", type: "reply", user: "Youssef Benali", userColor: "bg-teal-500", channel: "urgences", message: "a répondu dans le fil de discussion", time: "14:23", read: true },
  { id: "act4", type: "dm", user: "Julie Lambert", userColor: "bg-violet-500", message: "Factures validées, merci !", time: "10:45", read: true },
  { id: "act5", type: "mention", user: "Emma Wilson", userColor: "bg-pink-500", channel: "commerciaux", message: "@Sophie tu peux m'envoyer ta présentation ?", time: "09:30", read: true },
];

// Messages sauvegardés
const SAVED_MESSAGES: Message[] = [
  MOCK_MESSAGES.commerciaux[3],
  MOCK_MESSAGES.annonces[0],
  MOCK_MESSAGES.compta[2],
];

// Current user
const CURRENT_USER: User = {
  id: "u1",
  name: "Hamza Directeur",
  role: "PDG",
  status: "online",
  color: "bg-purple-500",
  statusMessage: "Disponible",
};

// Emoji picker data
const EMOJI_CATEGORIES = [
  { name: "Récent", emojis: ["👍", "❤️", "🎉", "🚀", "✅", "👏", "🙏", "💪"] },
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌"] },
  { name: "Gestes", emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤝", "👏", "🙌", "👐", "🤲", "🙏"] },
  { name: "Objets", emojis: ["📁", "📂", "📄", "📊", "📈", "📉", "💰", "💵", "📦", "🚚", "📍", "🎯"] },
];

export default function ChatPage() {
  const [currentView, setCurrentView] = useState<ViewType>("channel");
  const [activeChannel, setActiveChannel] = useState<string>("commerciaux");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["favoris", "direction", "equipes", "operations", "support"]);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES.commerciaux || []);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setMessages(MOCK_MESSAGES[activeChannel] || []);
    scrollToBottom();
  }, [activeChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowQuickSwitcher(true);
      }
      if (e.key === "Escape") {
        setShowQuickSwitcher(false);
        setShowEmojiPicker(false);
        setActiveThread(null);
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: `new-${Date.now()}`,
      channelId: activeChannel,
      userId: CURRENT_USER.id,
      userName: CURRENT_USER.name,
      userColor: CURRENT_USER.color,
      content: newMessage,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      date: "Aujourd'hui",
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage("");
    setIsTyping(false);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions?.map(r =>
              r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, CURRENT_USER.name] } : r
            )
          };
        }
        return {
          ...msg,
          reactions: [...(msg.reactions || []), { emoji, count: 1, users: [CURRENT_USER.name] }]
        };
      }
      return msg;
    }));
    setShowEmojiPicker(false);
    setShowMessageActions(null);
  };

  const currentChannel = CHANNELS.find(c => c.id === activeChannel);
  const currentCategory = CHANNEL_CATEGORIES.find(cat => cat.id === currentChannel?.category);
  const pinnedChannels = CHANNELS.filter(c => c.pinned);
  const totalUnread = CHANNELS.reduce((sum, c) => sum + c.unread, 0) + DIRECT_MESSAGES.reduce((sum, dm) => sum + dm.unread, 0);
  const unreadActivities = ACTIVITIES.filter(a => !a.read).length;

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      default: return "bg-slate-400";
    }
  };

  const getStatusIcon = (status: User["status"]) => {
    switch (status) {
      case "online": return <Circle className="h-2 w-2 fill-green-500 text-green-500" />;
      case "away": return <Clock className="h-2.5 w-2.5 text-yellow-500" />;
      case "busy": return <AlertCircle className="h-2.5 w-2.5 text-red-500" />;
      default: return <Circle className="h-2 w-2 text-slate-400" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#1a1d21] text-white overflow-hidden">
      {/* Quick Switcher Modal */}
      {showQuickSwitcher && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24" onClick={() => setShowQuickSwitcher(false)}>
          <div className="w-full max-w-xl bg-[#222529] rounded-xl shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3 bg-[#1a1d21] rounded-lg px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Aller vers un canal ou une conversation..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-slate-400"
                  autoFocus
                />
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <p className="px-3 py-2 text-xs font-medium text-slate-400 uppercase">Canaux récents</p>
              {CHANNELS.slice(0, 5).map(channel => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setActiveChannel(channel.id);
                    setCurrentView("channel");
                    setShowQuickSwitcher(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition"
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", channel.color)}>
                    <channel.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm">#{channel.name}</span>
                </button>
              ))}
              <p className="px-3 py-2 text-xs font-medium text-slate-400 uppercase mt-2">Messages directs</p>
              {DIRECT_MESSAGES.slice(0, 3).map(dm => (
                <button
                  key={dm.id}
                  onClick={() => {
                    setCurrentView("dms");
                    setShowQuickSwitcher(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition"
                >
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white", dm.user.color)}>
                    {dm.user.name.charAt(0)}
                  </div>
                  <span className="text-sm">{dm.user.name}</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
              <span>Astuce : Utilisez ⌘K pour ouvrir rapidement</span>
              <button onClick={() => setShowQuickSwitcher(false)} className="text-slate-400 hover:text-white">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Panel */}
      {activeThread && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-[#222529] border-l border-slate-700 z-40 flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Fil de discussion</h3>
              <p className="text-sm text-slate-400">{activeThread.replyCount || 0} réponses</p>
            </div>
            <button onClick={() => setActiveThread(null)} className="p-2 hover:bg-slate-700 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Original Message */}
            <div className="flex gap-3 mb-6 pb-4 border-b border-slate-700">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0", activeThread.userColor)}>
                {activeThread.userName.charAt(0)}
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold">{activeThread.userName}</span>
                  <span className="text-xs text-slate-400">{activeThread.time}</span>
                </div>
                <p className="text-slate-200">{activeThread.content}</p>
              </div>
            </div>
            {/* Thread replies would go here */}
            <p className="text-center text-slate-400 text-sm">Les réponses apparaîtront ici</p>
          </div>
          <div className="p-4 border-t border-slate-700">
            <div className="bg-[#1a1d21] rounded-lg border border-slate-600 p-3">
              <textarea
                placeholder="Répondre..."
                rows={2}
                className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-slate-400 text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <button className="p-1.5 hover:bg-slate-700 rounded"><Smile className="h-4 w-4 text-slate-400" /></button>
                  <button className="p-1.5 hover:bg-slate-700 rounded"><Paperclip className="h-4 w-4 text-slate-400" /></button>
                </div>
                <button className="px-3 py-1.5 bg-[#007a5a] hover:bg-[#148567] text-white rounded-lg text-sm font-medium transition">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-12 bg-[#350d36] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Retour</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 ml-4">
            <Link href="/" className="px-3 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition text-sm">Dashboard</Link>
            <Link href="/orders" className="px-3 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition text-sm">Commandes</Link>
            <Link href="/tracking" className="px-3 py-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition text-sm">Tracking</Link>
          </div>
        </div>
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setShowQuickSwitcher(true)}
            className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-md px-3 py-1.5 transition"
          >
            <Search className="h-4 w-4 text-white/60" />
            <span className="text-sm text-white/60 flex-1 text-left">Rechercher dans DISTRAM</span>
            <div className="hidden sm:flex items-center gap-1 text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded">
              <Command className="h-3 w-3" />K
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg transition relative">
            <Bell className="h-5 w-5 text-white/80" />
            {unreadActivities > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadActivities}
              </span>
            )}
          </button>
          <Link href="/settings" className="p-2 hover:bg-white/10 rounded-lg transition">
            <Settings className="h-5 w-5 text-white/80" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <div className="w-16 bg-[#3f0e40] flex flex-col items-center py-4 gap-2 flex-shrink-0">
          {/* Workspace Icon */}
          <div className="w-10 h-10 rounded-xl bg-white text-[#3f0e40] flex items-center justify-center font-bold text-lg mb-4 cursor-pointer hover:rounded-2xl transition-all">
            D
          </div>

          {/* Nav Items */}
          <button
            onClick={() => setCurrentView("home")}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative",
              currentView === "home" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Home className="h-5 w-5" />
            {totalUnread > 0 && currentView !== "home" && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView("activity")}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative",
              currentView === "activity" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadActivities > 0 && currentView !== "activity" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadActivities}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView("dms")}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative",
              currentView === "dms" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            {DIRECT_MESSAGES.reduce((s, d) => s + d.unread, 0) > 0 && currentView !== "dms" && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {DIRECT_MESSAGES.reduce((s, d) => s + d.unread, 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentView("later")}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              currentView === "later" ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Bookmark className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Create Button */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
            >
              <Plus className="h-5 w-5" />
            </button>
            {showCreateMenu && (
              <div className="absolute left-full bottom-0 ml-2 w-56 bg-[#222529] rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 transition text-left">
                  <Hash className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">Créer un canal</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 transition text-left">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">Nouveau message</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 transition text-left">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">Démarrer un huddle</span>
                </button>
                <div className="border-t border-slate-700 my-2" />
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 transition text-left">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">Créer un document</span>
                </button>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="relative mt-2">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-white cursor-pointer", CURRENT_USER.color)}>
              {CURRENT_USER.name.charAt(0)}
            </div>
            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#3f0e40]", getStatusColor(CURRENT_USER.status))} />
          </div>
        </div>

        {/* Channels Sidebar */}
        <div className="w-64 bg-[#3f0e40] flex flex-col border-r border-[#522653] hidden md:flex">
          {/* Workspace Header */}
          <div className="p-4 border-b border-[#522653]">
            <button className="w-full flex items-center justify-between hover:bg-white/10 rounded-lg p-2 -m-2 transition">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">DISTRAM</span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 hover:bg-white/10 rounded transition">
                  <Filter className="h-4 w-4 text-white/60" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded transition">
                  <Edit3 className="h-4 w-4 text-white/60" />
                </button>
              </div>
            </button>
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto py-2">
            {/* Quick Links */}
            <div className="px-2 mb-2">
              <button
                onClick={() => setCurrentView("activity")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition",
                  currentView === "activity" ? "bg-[#1164a3] text-white" : "text-white/70 hover:bg-white/10"
                )}
              >
                <Zap className="h-4 w-4" />
                <span className="text-sm">Activité</span>
                {unreadActivities > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-1.5 rounded-full">{unreadActivities}</span>
                )}
              </button>
              <button
                onClick={() => setCurrentView("later")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition",
                  currentView === "later" ? "bg-[#1164a3] text-white" : "text-white/70 hover:bg-white/10"
                )}
              >
                <Bookmark className="h-4 w-4" />
                <span className="text-sm">Enregistrés</span>
              </button>
            </div>

            {/* Channels by Category */}
            {CHANNEL_CATEGORIES.filter(cat => cat.id !== "favoris").map(category => {
              const categoryChannels = CHANNELS.filter(c => c.category === category.id);
              const isExpanded = expandedCategories.includes(category.id);
              const categoryUnread = categoryChannels.reduce((sum, c) => sum + c.unread, 0);

              return (
                <div key={category.id} className="px-2 mb-1">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-white/60 hover:text-white transition group rounded"
                  >
                    <div className="flex items-center gap-1">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    {categoryUnread > 0 && !isExpanded && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{categoryUnread}</span>
                    )}
                    <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
                  </button>

                  {isExpanded && (
                    <div className="mt-0.5 space-y-0.5">
                      {categoryChannels.map(channel => {
                        const Icon = channel.icon;
                        const isActive = currentView === "channel" && activeChannel === channel.id;

                        return (
                          <button
                            key={channel.id}
                            onClick={() => {
                              setActiveChannel(channel.id);
                              setCurrentView("channel");
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-1 rounded transition group",
                              isActive
                                ? "bg-[#1164a3] text-white"
                                : channel.unread > 0
                                  ? "text-white hover:bg-white/10"
                                  : "text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            {channel.type === "private" ? (
                              <Lock className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <Hash className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className={cn("flex-1 text-left text-sm truncate", channel.unread > 0 && !isActive && "font-semibold")}>
                              {channel.name}
                            </span>
                            {channel.pinned && <Pin className="h-3 w-3 text-white/40" />}
                            {channel.unread > 0 && !isActive && (
                              <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold">{channel.unread}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Direct Messages */}
            <div className="px-2 mt-4">
              <button
                onClick={() => toggleCategory("dms")}
                className="w-full flex items-center justify-between px-2 py-1 text-white/60 hover:text-white transition group rounded"
              >
                <div className="flex items-center gap-1">
                  {expandedCategories.includes("dms") ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  <span className="text-sm font-medium">Messages directs</span>
                </div>
                <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
              </button>

              {expandedCategories.includes("dms") && (
                <div className="mt-0.5 space-y-0.5">
                  {DIRECT_MESSAGES.map(dm => (
                    <button
                      key={dm.id}
                      onClick={() => setCurrentView("dms")}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1 rounded transition",
                        dm.unread > 0 ? "text-white hover:bg-white/10" : "text-white/60 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium text-white", dm.user.color)}>
                          {dm.user.name.charAt(0)}
                        </div>
                        <div className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#3f0e40]", getStatusColor(dm.user.status))} />
                      </div>
                      <span className={cn("flex-1 text-left text-sm truncate", dm.unread > 0 && "font-semibold")}>
                        {dm.user.name.split(" ")[0]}
                      </span>
                      {dm.unread > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold">{dm.unread}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#1a1d21]">
          {/* Activity View */}
          {currentView === "activity" && (
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">Activité</h2>
                <p className="text-sm text-slate-400">Mentions, réactions et fils de discussion</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {ACTIVITIES.map(activity => (
                    <div
                      key={activity.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg mb-2 transition cursor-pointer",
                        activity.read ? "hover:bg-slate-800/50" : "bg-[#1164a3]/10 hover:bg-[#1164a3]/20 border-l-4 border-[#1164a3]"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0", activity.userColor)}>
                        {activity.user.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{activity.user}</span>
                          {activity.channel && (
                            <>
                              <span className="text-slate-400">dans</span>
                              <span className="text-[#1d9bd1]">#{activity.channel}</span>
                            </>
                          )}
                          <span className="text-xs text-slate-400 ml-auto">{activity.time}</span>
                        </div>
                        <p className="text-slate-300 text-sm">{activity.message}</p>
                      </div>
                      {!activity.read && <div className="w-2 h-2 bg-[#1164a3] rounded-full flex-shrink-0 mt-2" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DMs View */}
          {currentView === "dms" && (
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">Messages directs</h2>
                <p className="text-sm text-slate-400">Conversations privées avec vos collègues</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {DIRECT_MESSAGES.map(dm => (
                    <div
                      key={dm.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl mb-2 cursor-pointer transition",
                        dm.unread > 0 ? "bg-slate-800/80 hover:bg-slate-700/80" : "hover:bg-slate-800/50"
                      )}
                    >
                      <div className="relative">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-white text-lg", dm.user.color)}>
                          {dm.user.name.charAt(0)}
                        </div>
                        <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#1a1d21]", getStatusColor(dm.user.status))} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold", dm.unread > 0 && "text-white")}>{dm.user.name}</span>
                          <span className="text-xs text-slate-400">{dm.user.role}</span>
                        </div>
                        <p className={cn("text-sm truncate", dm.unread > 0 ? "text-slate-200" : "text-slate-400")}>
                          {dm.lastMessage}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-400">{dm.time}</p>
                        {dm.unread > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full mt-1">
                            {dm.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Later/Saved View */}
          {currentView === "later" && (
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">Enregistrés</h2>
                <p className="text-sm text-slate-400">Messages que vous avez sauvegardés pour plus tard</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {SAVED_MESSAGES.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Bookmark className="h-16 w-16 mb-4 text-slate-600" />
                      <p className="text-lg font-medium mb-2">Aucun message enregistré</p>
                      <p className="text-sm text-center max-w-sm">
                        Cliquez sur le bouton signet d&apos;un message pour le retrouver ici plus tard.
                      </p>
                    </div>
                  ) : (
                    SAVED_MESSAGES.map(msg => (
                      <div key={msg.id} className="bg-slate-800/50 rounded-xl p-4 mb-3 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                          <Hash className="h-3 w-3" />
                          <span>{msg.channelId}</span>
                          <span>•</span>
                          <span>{msg.date}</span>
                        </div>
                        <div className="flex gap-3">
                          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0", msg.userColor)}>
                            {msg.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-semibold">{msg.userName}</span>
                              <span className="text-xs text-slate-400">{msg.time}</span>
                            </div>
                            <p className="text-slate-200">{msg.content}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
                          <button className="text-xs text-[#1d9bd1] hover:underline">Voir dans le canal</button>
                          <span className="text-slate-600">•</span>
                          <button className="text-xs text-slate-400 hover:text-red-400">Supprimer</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Home View */}
          {currentView === "home" && (
            <div className="flex-1 flex flex-col">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-xl font-bold">Accueil</h2>
                <p className="text-sm text-slate-400">Votre vue d&apos;ensemble DISTRAM</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-sm text-blue-400">Messages non lus</p>
                    <p className="text-3xl font-bold mt-1">{totalUnread}</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-4 border border-red-500/20">
                    <p className="text-sm text-red-400">Mentions</p>
                    <p className="text-3xl font-bold mt-1">{unreadActivities}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                    <p className="text-sm text-green-400">En ligne</p>
                    <p className="text-3xl font-bold mt-1">{USERS.filter(u => u.status === "online").length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-sm text-purple-400">Enregistrés</p>
                    <p className="text-3xl font-bold mt-1">{SAVED_MESSAGES.length}</p>
                  </div>
                </div>

                {/* Channels with Activity */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Canaux actifs
                  </h3>
                  <div className="grid gap-2">
                    {CHANNELS.filter(c => c.unread > 0).slice(0, 5).map(channel => {
                      const Icon = channel.icon;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setActiveChannel(channel.id);
                            setCurrentView("channel");
                          }}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition"
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", channel.color)}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">#{channel.name}</p>
                            <p className="text-sm text-slate-400">{channel.description}</p>
                          </div>
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">{channel.unread} nouveau{channel.unread > 1 ? "x" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent DMs */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    Conversations récentes
                  </h3>
                  <div className="grid gap-2">
                    {DIRECT_MESSAGES.slice(0, 3).map(dm => (
                      <button
                        key={dm.id}
                        onClick={() => setCurrentView("dms")}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition"
                      >
                        <div className="relative">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-medium text-white", dm.user.color)}>
                            {dm.user.name.charAt(0)}
                          </div>
                          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1d21]", getStatusColor(dm.user.status))} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{dm.user.name}</p>
                          <p className="text-sm text-slate-400 truncate">{dm.lastMessage}</p>
                        </div>
                        <span className="text-xs text-slate-400">{dm.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Channel View */}
          {currentView === "channel" && (
            <>
              {/* Channel Header */}
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-[#1a1d21]">
                <div className="flex items-center gap-3">
                  <div className="md:hidden">
                    <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 hover:bg-slate-700 rounded-lg">
                      <Hash className="h-5 w-5" />
                    </button>
                  </div>
                  <div>
                    <h2 className="font-bold flex items-center gap-2">
                      {currentChannel?.type === "private" ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                      {currentChannel?.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users className="h-3 w-3" />
                      <span>{currentChannel?.members} membres</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{currentChannel?.description}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition hidden sm:block">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition hidden sm:block">
                    <Video className="h-4 w-4 text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                    <Pin className="h-4 w-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className={cn("p-2 rounded-lg transition", showMembers ? "bg-slate-700 text-white" : "hover:bg-slate-700 text-slate-400")}
                  >
                    <Users className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {messages.map((message, index) => {
                      const showDate = index === 0 || messages[index - 1]?.date !== message.date;
                      const showAvatar = index === 0 || messages[index - 1]?.userId !== message.userId || showDate;

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <div className="flex items-center gap-4 my-6">
                              <div className="flex-1 h-px bg-slate-700" />
                              <span className="text-xs font-medium text-slate-400 bg-[#1a1d21] px-3">{message.date}</span>
                              <div className="flex-1 h-px bg-slate-700" />
                            </div>
                          )}

                          {message.isSystem ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 py-1 pl-14">
                              <Zap className="h-4 w-4" />
                              {message.content}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "flex gap-3 group py-1 px-2 -mx-2 rounded-lg hover:bg-slate-800/50 transition relative",
                                !showAvatar && "pl-14"
                              )}
                              onMouseEnter={() => setShowMessageActions(message.id)}
                              onMouseLeave={() => setShowMessageActions(null)}
                            >
                              {showAvatar && (
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 mt-0.5", message.userColor)}>
                                  {message.userName.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                {showAvatar && (
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="font-semibold text-white hover:underline cursor-pointer">{message.userName}</span>
                                    <span className="text-xs text-slate-400">{message.time}</span>
                                    {message.edited && <span className="text-xs text-slate-500">(modifié)</span>}
                                  </div>
                                )}
                                <p className="text-slate-200 break-words whitespace-pre-wrap">{message.content}</p>

                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {message.attachments.map((attachment, i) => (
                                      <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                                        <FileText className="h-5 w-5 text-blue-400" />
                                        <div>
                                          <p className="text-sm font-medium text-blue-400 hover:underline cursor-pointer">{attachment.name}</p>
                                          {attachment.size && <p className="text-xs text-slate-400">{attachment.size}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Thread indicator */}
                                {message.replyCount && message.replyCount > 0 && (
                                  <button
                                    onClick={() => setActiveThread(message)}
                                    className="flex items-center gap-2 mt-2 text-[#1d9bd1] hover:underline text-sm"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{message.replyCount} réponse{message.replyCount > 1 ? "s" : ""}</span>
                                    <span className="text-slate-400">Voir le fil</span>
                                  </button>
                                )}

                                {/* Reactions */}
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {message.reactions.map((reaction, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handleReaction(message.id, reaction.emoji)}
                                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 hover:bg-slate-700 rounded-full text-sm transition border border-slate-600/50"
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span className="text-slate-300 text-xs">{reaction.count}</span>
                                      </button>
                                    ))}
                                    <button className="px-2 py-0.5 bg-slate-700/50 hover:bg-slate-700 rounded-full transition opacity-0 group-hover:opacity-100 border border-slate-600/50">
                                      <Smile className="h-3.5 w-3.5 text-slate-400" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Message Actions - Floating toolbar */}
                              {showMessageActions === message.id && (
                                <div className="absolute -top-4 right-2 flex items-center gap-0.5 bg-[#222529] rounded-lg shadow-lg border border-slate-700 px-1 py-0.5">
                                  <button
                                    onClick={() => setShowEmojiPicker(true)}
                                    className="p-1.5 hover:bg-slate-700 rounded transition"
                                    title="Ajouter une réaction"
                                  >
                                    <Smile className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <button
                                    onClick={() => setActiveThread(message)}
                                    className="p-1.5 hover:bg-slate-700 rounded transition"
                                    title="Répondre dans le fil"
                                  >
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-700 rounded transition" title="Transférer">
                                    <Forward className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-700 rounded transition" title="Enregistrer">
                                    <Bookmark className="h-4 w-4 text-slate-400" />
                                  </button>
                                  <button className="p-1.5 hover:bg-slate-700 rounded transition" title="Plus">
                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Typing indicator */}
                    {isTyping && (
                      <div className="flex items-center gap-2 py-2 pl-14 text-slate-400 text-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span>Sophie Martin est en train d&apos;écrire...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-700">
                    <div className="bg-[#222529] rounded-xl border border-slate-600 focus-within:border-[#1164a3] transition">
                      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-700/50">
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <Plus className="h-5 w-5" />
                        </button>
                        <div className="w-px h-5 bg-slate-700 mx-1" />
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <span className="font-bold text-sm">B</span>
                        </button>
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <span className="italic text-sm">I</span>
                        </button>
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <span className="line-through text-sm">S</span>
                        </button>
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <span className="text-sm font-mono">{`</>`}</span>
                        </button>
                        <div className="w-px h-5 bg-slate-700 mx-1" />
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <AtSign className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white">
                          <Smile className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-3">
                        <textarea
                          ref={inputRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder={`Message #${currentChannel?.name}`}
                          rows={1}
                          className="w-full bg-transparent border-none resize-none focus:outline-none text-white placeholder:text-slate-400 min-h-[24px] max-h-[200px]"
                        />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-700/50">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-slate-700 rounded transition">
                            <Paperclip className="h-4 w-4 text-slate-400" />
                          </button>
                          <button className="p-1.5 hover:bg-slate-700 rounded transition">
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                          </button>
                          <button className="p-1.5 hover:bg-slate-700 rounded transition">
                            <Mic className="h-4 w-4 text-slate-400" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 hidden sm:block">Shift + Entrée pour nouvelle ligne</span>
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className={cn(
                              "p-2 rounded-lg transition flex items-center gap-2",
                              newMessage.trim()
                                ? "bg-[#007a5a] hover:bg-[#148567] text-white"
                                : "bg-slate-700 text-slate-400 cursor-not-allowed"
                            )}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members Sidebar */}
                {showMembers && (
                  <div className="w-64 border-l border-slate-700 bg-[#1a1d21] overflow-y-auto hidden lg:block">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Membres</h3>
                        <span className="text-sm text-slate-400">{currentChannel?.members}</span>
                      </div>

                      {/* Online members */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">
                          En ligne — {USERS.filter(u => u.status === "online").length}
                        </p>
                        <div className="space-y-0.5">
                          {USERS.filter(u => u.status === "online").map(user => (
                            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer">
                              <div className="relative">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-medium text-white text-sm", user.color)}>
                                  {user.name.charAt(0)}
                                </div>
                                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1d21]", getStatusColor(user.status))} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                {user.statusMessage && (
                                  <p className="text-xs text-slate-400 truncate">{user.statusMessage}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Away/Busy members */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">
                          Absent — {USERS.filter(u => u.status === "away" || u.status === "busy").length}
                        </p>
                        <div className="space-y-0.5">
                          {USERS.filter(u => u.status === "away" || u.status === "busy").map(user => (
                            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer opacity-70">
                              <div className="relative">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-medium text-white text-sm", user.color)}>
                                  {user.name.charAt(0)}
                                </div>
                                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1a1d21]", getStatusColor(user.status))} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                {user.statusMessage && (
                                  <p className="text-xs text-slate-400 truncate">{user.statusMessage}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Offline members */}
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">
                          Hors ligne — {USERS.filter(u => u.status === "offline").length}
                        </p>
                        <div className="space-y-0.5">
                          {USERS.filter(u => u.status === "offline").map(user => (
                            <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition cursor-pointer opacity-50">
                              <div className="relative">
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-medium text-white text-sm grayscale", user.color)}>
                                  {user.name.charAt(0)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-slate-500">{user.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-50" onClick={() => setShowEmojiPicker(false)}>
          <div
            className="absolute bottom-24 right-8 w-80 bg-[#222529] rounded-xl shadow-2xl border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b border-slate-700">
              <input
                type="text"
                placeholder="Rechercher un emoji..."
                className="w-full bg-slate-700/50 rounded-lg px-3 py-2 text-sm border-none focus:outline-none focus:ring-2 focus:ring-[#1164a3]"
              />
            </div>
            <div className="p-3 max-h-64 overflow-y-auto">
              {EMOJI_CATEGORIES.map(category => (
                <div key={category.name} className="mb-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{category.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {category.emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          if (showMessageActions) {
                            handleReaction(showMessageActions, emoji);
                          }
                          setShowEmojiPicker(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded transition text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <PhonePreviewButton />
    </div>
  );
}
