const ACTION_ICONS = {
  intelligent_search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  find_lookalikes: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  sirene_search: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  google_maps_scan: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
  website_scan: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9',
  send_whatsapp: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  send_email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  notify_user_whatsapp: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  schedule_daily_report: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
};

const ACTION_LABELS = {
  intelligent_search: 'Recherche intelligente',
  find_lookalikes: 'Recherche de profils similaires',
  sirene_search: 'Recherche SIRENE',
  google_maps_scan: 'Scan Google Maps',
  website_scan: 'Analyse site web',
  send_whatsapp: 'Envoi WhatsApp',
  send_email: 'Envoi email',
  send_sms: 'Envoi SMS',
  notify_user_whatsapp: 'Notification WhatsApp',
  notify_user_email: 'Notification email',
  schedule_daily_report: 'Rapport quotidien programme',
  france_travail_monitor: 'Surveillance France Travail',
  google_reviews_monitor: 'Surveillance avis Google',
  bodacc_monitor: 'Surveillance BODACC',
  social_scan: 'Analyse reseaux sociaux',
};

export default function AlexActionCard({ action }) {
  const iconPath = ACTION_ICONS[action.type] || ACTION_ICONS.intelligent_search;
  const label = ACTION_LABELS[action.type] || action.type;

  return (
    <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-indigo-900">{label}</p>
        {action.reason && (
          <p className="text-indigo-600 text-xs mt-0.5">{action.reason}</p>
        )}
      </div>
    </div>
  );
}
