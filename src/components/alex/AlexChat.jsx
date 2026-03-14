import { useState, useEffect, useRef, useCallback } from 'react';
import { db, functions, auth as firebaseAuth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useDemo } from '../../contexts/DemoContext';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, limit, getDocs, doc, onSnapshot, where } from 'firebase/firestore';
import AlexActionCard from './AlexActionCard';

// ============================================================================
// CONSTANTS
// ============================================================================

const PHASE_LABELS = {
  welcome: { icon: '👋', label: 'Decouverte', color: 'text-gray-500', bg: 'bg-gray-100' },
  diagnose: { icon: '🩺', label: 'Diagnostic', color: 'text-amber-600', bg: 'bg-amber-50' },
  discover: { icon: '🔍', label: 'Ton activite', color: 'text-blue-600', bg: 'bg-blue-50' },
  icp: { icon: '🎯', label: 'Client ideal', color: 'text-purple-600', bg: 'bg-purple-50' },
  zone: { icon: '📍', label: 'Zone geo', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  volume: { icon: '📊', label: 'Volume cible', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  channel: { icon: '📱', label: 'Canal contact', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  strategy: { icon: '🧠', label: 'Strategie', color: 'text-violet-600', bg: 'bg-violet-50' },
  confirm: { icon: '✅', label: 'Confirmation', color: 'text-green-600', bg: 'bg-green-50' },
  ready: { icon: '🚀', label: 'En action', color: 'text-emerald-700', bg: 'bg-emerald-50' },
};

const STARTER_CARDS = [
  { label: 'Trouve-moi des clients', sub: 'Lance une recherche ciblee', icon: '🔎', message: 'Salut Alex, trouve-moi 20 prospects dans mon secteur' },
  { label: 'Quoi de neuf ?', sub: 'Briefing du jour', icon: '📊', message: 'Salut Alex, fais-moi un point sur la situation' },
  { label: 'Mes prospects chauds', sub: 'Ceux qui sont prets a signer', icon: '🔥', message: 'Montre-moi mes prospects chauds' },
  { label: 'On attaque quoi ?', sub: 'Conseille-moi pour aujourd\'hui', icon: '🎯', message: 'Alex, on attaque quoi aujourd\'hui ?' },
];

const DEMO_RESPONSES = [
  {
    message: "Super ! Plombier a Marseille, c'est un excellent marche. Je vais analyser ta zone et trouver des clients qui cherchent un plombier en ce moment.\n\nJe vais :\n1. Scanner les demandes de devis plomberie a Marseille\n2. Identifier les entreprises qui recrutent des plombiers (= forte demande)\n3. Preparer des messages personnalises\n\nDonne-moi 2 minutes, je lance le scan...",
    suggestions: ['Quels resultats ?', 'Combien de prospects ?', 'Montre-moi les stats'],
  },
  {
    message: "Voila les premiers resultats !\n\n**12 prospects identifies a Marseille** :\n- 4 chauds (demande de devis recente)\n- 5 tiedes (recherche active)\n- 3 froids (potentiel)\n\nJe peux commencer a les contacter par email ou WhatsApp. Qu'est-ce que tu preferes ?",
    suggestions: ['Email d\'abord', 'WhatsApp', 'Les deux'],
  },
  {
    message: "C'est note ! Je vais lancer une sequence multicanale :\n\n**Jour 1** : Email personnalise\n**Jour 3** : Relance WhatsApp\n**Jour 7** : Appel si pas de reponse\n\nTout est automatique, je te previens des qu'un prospect repond. Tu peux suivre les stats dans le dashboard.",
    suggestions: ['Voir le dashboard', 'Ajouter une zone', 'Modifier la sequence'],
  },
];

// ============================================================================
// MARKDOWN RENDERER (lightweight, no deps)
// ============================================================================

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1 my-1.5">
          {currentList.map((item, j) => (
            <li key={j} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    const bulletMatch = line.match(/^[-*]\s+(.+)/);

    if (numberedMatch) {
      flushList();
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1">
          <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            {numberedMatch[1]}
          </span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
    } else if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<p key={i} className="my-0.5">{renderInline(line)}</p>);
      }
    }
  }
  flushList();
  return elements;
}

function renderInline(text) {
  // Bold: **text** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ============================================================================
// WELCOME MESSAGE BUILDER
// ============================================================================

function getTimeGreeting() {
  const hour = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false });
  const h = parseInt(hour, 10);
  if (h >= 5 && h < 12) return 'Bonjour';
  if (h >= 12 && h < 18) return 'Hey';
  if (h >= 18 && h < 22) return 'Bonsoir';
  return 'Salut';
}

function getDayName() {
  return new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' });
}

function buildWelcomeMessage(orgContext) {
  const greeting = getTimeGreeting();
  const day = getDayName();

  if (!orgContext) {
    return {
      role: 'assistant',
      content: `${greeting} ! Ca va ?\n\nC'est Alex, ton associe commercial. On est **${day}** — pret a aller chercher du client.\n\nDis-moi ce que tu veux faire aujourd'hui, ou lance-moi directement une mission, par exemple :\n\n"Trouve moi 30 prospects courtage energie"`,
      actions: [],
      suggestions: [],
    };
  }

  const hot = orgContext.hotProspects?.length || 0;
  const topNames = hot > 0
    ? orgContext.hotProspects.slice(0, 2).map(p => p.company || p.name || '').filter(Boolean).join(', ')
    : '';
  const kpis = orgContext.kpis || {};
  const replies = kpis.recentReplies || 0;

  let content = `${greeting} ! La forme ?\n\nOn est **${day}**. `;
  if (hot > 0) {
    content += `Petit briefing : tu as **${hot} prospect${hot > 1 ? 's' : ''} chaud${hot > 1 ? 's' : ''}**`;
    if (topNames) content += ` (${topNames})`;
    content += `.`;
    if (replies > 0) content += ` Et **${replies} reponse${replies > 1 ? 's' : ''} en attente**.`;
    content += `\n\nOn attaque par quoi ?`;
  } else {
    content += `Nouvelle journee, nouveaux clients a aller chercher. Je suis pret.\n\nOn attaque par quoi aujourd'hui ?`;
  }

  return { role: 'assistant', content, actions: [], suggestions: [] };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MissionWidget({ mission }) {
  if (!mission || mission.status !== 'active') return null;

  const pct = mission.target > 0 ? Math.min(Math.round((mission.current / mission.target) * 100), 100) : 0;
  const stats = [
    { label: 'Trouves', value: mission.current || 0, emoji: '🔍' },
    { label: 'Contactes', value: mission.contacted || 0, emoji: '📩' },
    { label: 'Reponses', value: mission.replied || 0, emoji: '💬' },
    { label: 'Convertis', value: mission.converted || 0, emoji: '🤝' },
  ];

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/10">
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <span className="text-sm">🎯</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Mission en cours</p>
              <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{mission.objective}</p>
            </div>
          </div>
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
            pct >= 100 ? 'bg-emerald-100 text-emerald-700' :
            pct >= 50 ? 'bg-amber-100 text-amber-700' :
            'bg-indigo-100 text-indigo-700'
          }`}>{pct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-1.5">
          {stats.map(({ label, value, emoji }) => (
            <div key={label} className="text-center py-1.5 rounded-lg bg-gray-50">
              <p className="text-xs mb-0.5">{emoji}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[10px] text-gray-400">
          <span>Cible : {mission.target} prospects</span>
          <span>{[mission.niche, mission.zone].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
    </div>
  );
}

function ProspectsMiniTable({ prospects }) {
  if (!prospects?.length) return null;
  return (
    <div className="mt-2.5 rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
      <div className="divide-y divide-gray-50">
        {prospects.slice(0, 6).map((p, i) => (
          <div key={p.id || i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50/30 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
              (p.score || 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
              (p.score || 0) >= 60 ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>{p.score || '—'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{p.company || p.name || 'Inconnu'}</p>
              <p className="text-[11px] text-gray-400 capitalize">{p.status || 'new'}{p.sector ? ` · ${p.sector}` : ''}</p>
            </div>
            <a href="/app/crm" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Voir</a>
          </div>
        ))}
      </div>
      {prospects.length > 6 && (
        <div className="px-3 py-2 bg-gray-50/80 text-xs text-center">
          <a href="/app/crm" className="text-indigo-500 hover:text-indigo-700 font-medium">
            Voir les {prospects.length} prospects →
          </a>
        </div>
      )}
    </div>
  );
}

function StatsMiniCard({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Total', value: stats.totalProspects ?? '—', emoji: '📋' },
    { label: 'Chauds', value: stats.hotProspects ?? '—', emoji: '🔥' },
    { label: 'Qualifies', value: stats.qualified ?? '—', emoji: '✅' },
    { label: 'Conversion', value: stats.conversionRate != null ? `${stats.conversionRate}%` : '—', emoji: '📊' },
  ];
  return (
    <div className="mt-2.5 grid grid-cols-4 gap-2">
      {items.map(({ label, value, emoji }) => (
        <div key={label} className="rounded-xl bg-white border border-gray-100 px-2 py-2.5 text-center shadow-sm">
          <p className="text-xs mb-1">{emoji}</p>
          <p className="text-lg font-black text-gray-900">{value}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}

function ROIMiniCard({ roi }) {
  if (!roi) return null;
  const items = [
    { label: 'Envoyes', value: roi.totalSent ?? '—', emoji: '📤' },
    { label: 'Reponses', value: roi.totalReplies ?? '—', emoji: '💬' },
    { label: 'Taux', value: roi.replyRate != null ? `${roi.replyRate}%` : '—', emoji: '📈' },
    { label: 'Signes', value: roi.signedCount ?? roi.converted ?? '—', emoji: '🤝' },
  ];
  return (
    <div className="mt-2.5 grid grid-cols-4 gap-2">
      {items.map(({ label, value, emoji }) => (
        <div key={label} className="rounded-xl bg-white border border-emerald-100 px-2 py-2.5 text-center shadow-sm">
          <p className="text-xs mb-1">{emoji}</p>
          <p className="text-lg font-black text-gray-900">{value}</p>
          <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
        </div>
      ))}
    </div>
  );
}

function PipelineMiniCard({ pipeline }) {
  if (!pipeline) return null;
  const stages = Object.entries(pipeline.byStage || {});
  return (
    <div className="mt-2.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-600">Pipeline — {pipeline.total || 0} deals</p>
        {pipeline.totalValue > 0 && (
          <p className="text-xs font-bold text-emerald-600">{pipeline.totalValue.toLocaleString('fr-FR')} EUR</p>
        )}
      </div>
      <div className="flex gap-1">
        {stages.map(([stage, count]) => (
          <div key={stage} className="flex-1 text-center">
            <div className="h-6 rounded bg-indigo-100 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-700">{count}</span>
            </div>
            <p className="text-[9px] text-gray-400 mt-1 capitalize">{stage}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DScoreMiniCard({ dscore }) {
  if (!dscore || dscore.status === 'error') return null;
  const score = dscore.dScoreFinal || dscore.score || 0;
  const color = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';
  return (
    <div className={`mt-2.5 rounded-xl border border-${color}-100 bg-${color}-50/50 p-3 shadow-sm flex items-center gap-3`}>
      <div className={`w-14 h-14 rounded-xl bg-${color}-100 flex items-center justify-center`}>
        <span className={`text-2xl font-black text-${color}-700`}>{score}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">DScore</p>
        <p className="text-xs text-gray-500">{score >= 70 ? 'Maturite digitale elevee' : score >= 40 ? 'Maturite moyenne' : 'Faible presence digitale'}</p>
      </div>
    </div>
  );
}

function QualificationMiniCard({ qual }) {
  if (!qual || qual.status === 'error') return null;
  const items = [
    { label: 'Budget', value: qual.budget?.score ?? '?', max: 25 },
    { label: 'Autorite', value: qual.authority?.score ?? '?', max: 25 },
    { label: 'Besoin', value: qual.need?.score ?? '?', max: 25 },
    { label: 'Timing', value: qual.timing?.score ?? '?', max: 25 },
  ];
  return (
    <div className="mt-2.5 rounded-xl border border-violet-100 bg-violet-50/50 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-violet-700">Qualification BANT</p>
        <p className="text-sm font-bold text-violet-900">{qual.totalScore || 0}/100</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {items.map(({ label, value, max }) => (
          <div key={label} className="text-center">
            <div className="h-1.5 rounded-full bg-violet-100 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <p className="text-[9px] text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
      {qual.recommendation && (
        <p className="text-xs text-violet-600 mt-2 font-medium">{qual.recommendation}</p>
      )}
    </div>
  );
}

function OutreachMiniCard({ outreach }) {
  if (!outreach || outreach.status === 'error') return null;
  const channelEmoji = { email: '📧', sms: '📱', whatsapp: '💬', instagram: '📸', linkedin: '💼' };
  const channels = outreach.channels || (outreach.channel ? [outreach.channel] : []);
  return (
    <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-semibold text-indigo-700">
          {outreach.mode === 'all_channels' ? 'Outreach multicanal' : 'Outreach intelligent'}
        </p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${outreach.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {outreach.status === 'sent' ? 'Envoye' : 'Echec'}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {channels.map(ch => (
          <span key={ch} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-lg border border-indigo-100">
            <span>{channelEmoji[ch] || '📨'}</span>
            <span className="font-medium text-indigo-800 capitalize">{ch}</span>
          </span>
        ))}
      </div>
      {outreach.reason && <p className="text-[10px] text-indigo-500 mt-1.5">{outreach.reason}</p>}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <AlexAvatar size="sm" />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-400 ml-1">Alex reflechit...</span>
        </div>
      </div>
    </div>
  );
}

function AlexAvatar({ size = 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${s} rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20 flex-shrink-0`}>
      A
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AlexChat({ orgContext, threadId, onNewThread, onToggleSidebar }) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { isDemo } = useDemo();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState([]);
  const [demoStep, setDemoStep] = useState(0);
  const [conversationPhase, setConversationPhase] = useState('welcome');
  const [mission, setMission] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const orgId = currentOrg?.id;
  const isRealUser = !isDemo && !!firebaseAuth.currentUser;
  const isEmptyConversation = messages.length <= 1 && messages[0]?.role === 'assistant';

  // ---- Effects ----

  useEffect(() => {
    if (!historyLoaded) setMessages([buildWelcomeMessage(orgContext)]);
  }, [orgContext, historyLoaded]);

  useEffect(() => {
    if (!orgId || isDemo || !isRealUser) return;
    const unsubs = [];
    // Listen to thread doc for phase (falls back to conversationState if no threadId)
    if (threadId) {
      const threadRef = doc(db, `organizations/${orgId}/alexThreads/${threadId}`);
      unsubs.push(onSnapshot(threadRef, (snap) => {
        if (snap.exists()) setConversationPhase(snap.data().phase || 'welcome');
      }));
    } else {
      const stateRef = doc(db, `organizations/${orgId}/alexMemory/conversationState`);
      unsubs.push(onSnapshot(stateRef, (snap) => {
        if (snap.exists()) setConversationPhase(snap.data().phase || 'welcome');
      }));
    }
    const missionRef = doc(db, `organizations/${orgId}/alexMemory/currentMission`);
    unsubs.push(onSnapshot(missionRef, (snap) => {
      setMission(snap.exists() ? snap.data() : null);
    }));
    return () => unsubs.forEach(u => u());
  }, [orgId, isDemo, isRealUser, threadId]);

  useEffect(() => {
    if (!orgId || isDemo || !isRealUser) return;
    // Reset state when switching threads
    setMessages([buildWelcomeMessage(orgContext)]);
    setLastSuggestions([]);
    setHistoryLoaded(false);

    if (!threadId) return;
    const loadHistory = async () => {
      try {
        const q = query(
          collection(db, `organizations/${orgId}/alexConversations`),
          where('threadId', '==', threadId),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const msgs = snapshot.docs.reverse().map(d => ({ id: d.id, ...d.data() }));
        if (msgs.length > 0) {
          setMessages(msgs);
          setHistoryLoaded(true);
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
          if (lastAssistant?.suggestions) setLastSuggestions(lastAssistant.suggestions);
        }
      } catch (err) {
        console.warn('[AlexChat] History load failed:', err.message);
      }
    };
    loadHistory();
  }, [orgId, isDemo, isRealUser, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleTextareaInput = useCallback((e) => {
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    setInput(ta.value);
  }, []);

  // ---- Send message ----

  const sendMessage = async (text) => {
    if (!text.trim() || loading || !orgId) return;

    const userMsg = { role: 'user', content: text, id: 'temp-' + Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    if (isDemo || !isRealUser) {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
      const resp = DEMO_RESPONSES[demoStep % DEMO_RESPONSES.length];
      setMessages(prev => [...prev, { role: 'assistant', content: resp.message, id: 'demo-' + Date.now() }]);
      setLastSuggestions(resp.suggestions);
      setDemoStep(prev => prev + 1);
      setLoading(false);
      return;
    }

    try {
      const chatFn = httpsCallable(functions, 'chatWithAlex');
      const result = await chatFn({ message: text, organizationId: orgId, threadId });
      const data = result?.data || {};

      const localAssistant = {
        role: 'assistant',
        content: data.message || data.reply || data.response || data.text || '',
        actions: data.actions || [],
        actionData: data.actionData || {},
        suggestions: data.suggestions || [],
        id: 'alex-' + Date.now(),
      };
      setMessages(prev => [...prev, localAssistant]);
      if (data.suggestions?.length) setLastSuggestions(data.suggestions);

      // Background sync — filter by thread
      if (threadId) {
        try {
          const { where: fbWhere } = await import('firebase/firestore');
          const q = query(
            collection(db, `organizations/${orgId}/alexConversations`),
            fbWhere('threadId', '==', threadId),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          const snapshot = await getDocs(q);
          const freshMsgs = snapshot.docs.reverse().map(d => ({ id: d.id, ...d.data() }));
          if (freshMsgs.length > 0) {
            setMessages(freshMsgs);
            setHistoryLoaded(true);
          }
        } catch { /* keep local */ }
      }
    } catch (error) {
      console.error('[AlexChat] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Oups, j'ai eu un probleme technique. Reessaie dans quelques secondes.\n\n*${error?.message || 'Erreur inconnue'}*`,
        id: 'error-' + Date.now(),
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewConversation = async () => {
    if (isDemo || !isRealUser) {
      setMessages([buildWelcomeMessage(orgContext)]);
      setLastSuggestions([]);
      setDemoStep(0);
      setConversationPhase('welcome');
      setHistoryLoaded(false);
      return;
    }
    if (onNewThread) {
      onNewThread();
    }
    textareaRef.current?.focus();
  };

  const phaseInfo = PHASE_LABELS[conversationPhase] || PHASE_LABELS.welcome;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-[#FAFBFE]">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-100">
        {/* Mobile hamburger */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="relative">
          <AlexAvatar />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-[15px]">Alex</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${phaseInfo.bg} ${phaseInfo.color}`}>
              {phaseInfo.icon} {phaseInfo.label}
            </span>
            {isDemo && <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Demo</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {loading ? 'Analyse en cours...' : '201 sources · Qualification BANT · IA conversationnelle'}
          </p>
        </div>
        <button
          onClick={handleNewConversation}
          disabled={loading}
          title="Nouvelle conversation"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau
        </button>
      </div>

      {/* ─── Mission Widget ─── */}
      <MissionWidget mission={mission} />

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
        {/* Starter cards for empty conversation */}
        {isEmptyConversation && !loading && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2.5 max-w-lg mx-auto">
              {STARTER_CARDS.map((card) => (
                <button
                  key={card.label}
                  onClick={() => sendMessage(card.message)}
                  className="text-left p-3.5 rounded-xl border border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg mt-0.5 group-hover:scale-110 transition-transform">{card.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{card.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg, i) => (
            <div key={msg.id || i} className="animate-fade-in">
              {msg.role === 'user' ? (
                /* ─── User bubble ─── */
                <div className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/15">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ) : (
                /* ─── Alex bubble ─── */
                <div className="flex items-start gap-2.5">
                  <AlexAvatar size="sm" />
                  <div className="flex-1 min-w-0 max-w-[85%]">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                        {renderMarkdown(msg.content)}
                      </div>
                    </div>

                    {/* Inline data: prospects table */}
                    {msg.actionData?.get_prospects?.results?.length > 0 && (
                      <ProspectsMiniTable prospects={msg.actionData.get_prospects.results} />
                    )}

                    {/* Inline data: stats */}
                    {msg.actionData?.get_stats?.totalProspects != null && (
                      <StatsMiniCard stats={msg.actionData.get_stats} />
                    )}

                    {/* Inline data: ROI */}
                    {msg.actionData?.get_roi_metrics?.totalSent != null && (
                      <ROIMiniCard roi={msg.actionData.get_roi_metrics} />
                    )}

                    {/* Inline data: Pipeline */}
                    {msg.actionData?.get_pipeline_stats?.total != null && (
                      <PipelineMiniCard pipeline={msg.actionData.get_pipeline_stats} />
                    )}

                    {/* Inline data: DScore */}
                    {msg.actionData?.get_dscore && (
                      <DScoreMiniCard dscore={msg.actionData.get_dscore} />
                    )}

                    {/* Inline data: Qualification BANT */}
                    {msg.actionData?.qualify_prospect?.totalScore != null && (
                      <QualificationMiniCard qual={msg.actionData.qualify_prospect} />
                    )}
                    {msg.actionData?.auto_outreach && (
                      <OutreachMiniCard outreach={msg.actionData.auto_outreach} />
                    )}

                    {/* Action cards */}
                    {msg.actions?.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.actions.map((action, j) => (
                          <AlexActionCard key={j} action={typeof action === 'string' ? { type: action } : action} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing */}
          {loading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ─── Suggestions ─── */}
      {!isEmptyConversation && lastSuggestions?.length > 0 && !loading && (
        <div className="px-4 lg:px-6 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex flex-wrap gap-2">
            {lastSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="px-3.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Input ─── */}
      <div className="px-4 lg:px-6 py-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                mission?.status === 'active'
                  ? `Mission ${mission.current || 0}/${mission.target} — Ecris a Alex...`
                  : 'Ecris ton message a Alex...'
              }
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1.5 max-h-[120px]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:from-indigo-700 hover:to-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 flex-shrink-0 mb-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center mt-1.5">
            Shift+Entree pour retour a la ligne · Alex peut se tromper
          </p>
        </form>
      </div>
    </div>
  );
}
