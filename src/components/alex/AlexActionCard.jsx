import { useState } from 'react';

const ACTION_CONFIG = {
  intelligent_search: {
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    label: 'Recherche intelligente',
    color: 'indigo',
    description: 'Scan de 201 sources web',
  },
  find_lookalikes: {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    label: 'Profils similaires',
    color: 'purple',
    description: 'Prospects comme tes meilleurs clients',
  },
  sirene_search: {
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    label: 'Recherche SIRENE',
    color: 'blue',
    description: 'Donnees legales et financieres',
  },
  google_maps_scan: {
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    label: 'Scan Google Maps',
    color: 'emerald',
    description: 'Entreprises geolocalises + avis',
  },
  website_scan: {
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
    label: 'Analyse site web',
    color: 'cyan',
    description: 'SEO, tech stack, signaux',
  },
  send_whatsapp: {
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    label: 'WhatsApp',
    color: 'green',
    description: 'Message personnalise',
  },
  send_email: {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    label: 'Email',
    color: 'amber',
    description: 'Email de prospection',
  },
  send_sms: {
    icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
    label: 'SMS',
    color: 'orange',
    description: 'Message court et direct',
  },
  notify_user_whatsapp: {
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    label: 'Notification',
    color: 'violet',
    description: 'Tu seras prevenu',
  },
  schedule_daily_report: {
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'Rapport programme',
    color: 'slate',
    description: 'Chaque jour automatiquement',
  },
  activate_mission: {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    label: 'Mission activee',
    color: 'rose',
    description: 'Prospection automatique lancee',
  },
  get_prospects: {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    label: 'Liste prospects',
    color: 'teal',
    description: 'Recuperation des donnees',
  },
  get_stats: {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    label: 'Statistiques',
    color: 'sky',
    description: 'Dashboard chiffres cles',
  },
  update_prospect: {
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    label: 'Mise a jour prospect',
    color: 'lime',
    description: 'Fiche prospect modifiee',
  },
  create_prospect: {
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    label: 'Prospect cree',
    color: 'emerald',
    description: 'Nouveau contact ajoute au CRM',
  },
  list_campaigns: {
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    label: 'Campagnes',
    color: 'amber',
    description: 'Liste des campagnes actives',
  },
  get_dscore: {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    label: 'DScore',
    color: 'cyan',
    description: 'Score de digitalisation 0-100',
  },
  get_signals: {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    label: 'Signaux',
    color: 'rose',
    description: 'Intelligence competitive 8 dimensions',
  },
  qualify_prospect: {
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    label: 'Qualification BANT',
    color: 'violet',
    description: 'Budget, Autorite, Besoin, Timing',
  },
  enrich_prospect: {
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    label: 'Enrichissement',
    color: 'blue',
    description: 'Donnees supplementaires ajoutees',
  },
  get_roi_metrics: {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'ROI',
    color: 'emerald',
    description: 'Retour sur investissement',
  },
  generate_sequence: {
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    label: 'Sequence generee',
    color: 'purple',
    description: 'Messages multicanaux prets a envoyer',
  },
  get_pipeline_stats: {
    icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12',
    label: 'Pipeline',
    color: 'teal',
    description: 'Deals en cours par etape',
  },
  get_interactions: {
    icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
    label: 'Interactions',
    color: 'sky',
    description: 'Historique des echanges',
  },
  get_market_insights: {
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'Insights marche',
    color: 'indigo',
    description: 'Canaux, timing, tendances',
  },
  get_mission_progress: {
    icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
    label: 'Mission en cours',
    color: 'rose',
    description: 'Progression de la recherche',
  },
  pause_prospection: {
    icon: 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'Prospection pausee',
    color: 'orange',
    description: 'Envois en pause',
  },
  resume_prospection: {
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
    label: 'Prospection relancee',
    color: 'emerald',
    description: 'Envois repris',
  },
  tag_batch: {
    icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    label: 'Tags appliques',
    color: 'violet',
    description: 'Prospects etiquetes en masse',
  },
  bulk_status_update: {
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    label: 'Mise a jour en masse',
    color: 'blue',
    description: 'Statuts modifies',
  },
  delete_prospect: {
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    label: 'Prospect supprime',
    color: 'slate',
    description: 'Contact retire du CRM',
  },
  export_prospects: {
    icon: 'M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    label: 'Export CSV',
    color: 'teal',
    description: 'Prospects exportes',
  },
  notify_user_email: {
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    label: 'Notification email',
    color: 'amber',
    description: 'Tu seras prevenu par email',
  },
  send_instagram_dm: {
    icon: 'M7.5 7.5h.01M12 12h.01M7.5 16.5h.01M12 21a9 9 0 110-18 9 9 0 010 18zm0-13.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z',
    label: 'Instagram DM',
    color: 'rose',
    description: 'Message prive Instagram envoye',
  },
  send_linkedin: {
    icon: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z',
    label: 'LinkedIn',
    color: 'blue',
    description: 'Message LinkedIn envoye via HeyReach',
  },
  auto_outreach: {
    icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'Outreach auto',
    color: 'indigo',
    description: 'Meilleur canal selectionne automatiquement',
  },
};

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200/60', icon: 'bg-indigo-100 text-indigo-600', text: 'text-indigo-900', sub: 'text-indigo-600/70', dot: 'bg-indigo-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200/60', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-900', sub: 'text-purple-600/70', dot: 'bg-purple-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200/60', icon: 'bg-blue-100 text-blue-600', text: 'text-blue-900', sub: 'text-blue-600/70', dot: 'bg-blue-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-900', sub: 'text-emerald-600/70', dot: 'bg-emerald-400' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200/60', icon: 'bg-cyan-100 text-cyan-600', text: 'text-cyan-900', sub: 'text-cyan-600/70', dot: 'bg-cyan-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200/60', icon: 'bg-green-100 text-green-600', text: 'text-green-900', sub: 'text-green-600/70', dot: 'bg-green-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200/60', icon: 'bg-amber-100 text-amber-600', text: 'text-amber-900', sub: 'text-amber-600/70', dot: 'bg-amber-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200/60', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-900', sub: 'text-orange-600/70', dot: 'bg-orange-400' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200/60', icon: 'bg-violet-100 text-violet-600', text: 'text-violet-900', sub: 'text-violet-600/70', dot: 'bg-violet-400' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200/60', icon: 'bg-rose-100 text-rose-600', text: 'text-rose-900', sub: 'text-rose-600/70', dot: 'bg-rose-400' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200/60', icon: 'bg-teal-100 text-teal-600', text: 'text-teal-900', sub: 'text-teal-600/70', dot: 'bg-teal-400' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200/60', icon: 'bg-sky-100 text-sky-600', text: 'text-sky-900', sub: 'text-sky-600/70', dot: 'bg-sky-400' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200/60', icon: 'bg-lime-100 text-lime-600', text: 'text-lime-900', sub: 'text-lime-600/70', dot: 'bg-lime-400' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-200/60', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-900', sub: 'text-slate-600/70', dot: 'bg-slate-400' },
};

export default function AlexActionCard({ action }) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[action.type] || {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    label: action.type?.replace(/_/g, ' ') || 'Action',
    color: 'indigo',
    description: '',
  };
  const c = COLOR_MAP[config.color] || COLOR_MAP.indigo;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`flex items-center gap-3 w-full text-left p-3 ${c.bg} border ${c.border} rounded-xl text-sm transition-all hover:shadow-sm group`}
    >
      {/* Animated dot */}
      <div className="relative flex-shrink-0">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center transition-transform group-hover:scale-105`}>
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
          </svg>
        </div>
        <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${c.dot} rounded-full animate-pulse ring-2 ring-white`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${c.text} text-[13px]`}>{config.label}</p>
        <p className={`${c.sub} text-xs mt-0.5 truncate`}>
          {action.reason || config.description}
        </p>
        {expanded && action.params && (
          <div className="mt-2 pt-2 border-t border-current/5 text-xs text-gray-500 space-y-0.5">
            {Object.entries(action.params).slice(0, 4).map(([k, v]) => (
              <p key={k}><span className="font-medium text-gray-600">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</p>
            ))}
          </div>
        )}
      </div>

      <svg className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
