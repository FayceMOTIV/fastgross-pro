const SOURCE_CATEGORIES = [
  {
    name: 'Sources officielles',
    icon: '🏛️',
    description: 'Donnees publiques FR, scale illimite',
    sources: [
      { id: 'bodacc_creation', name: 'BODACC Creations', icon: '📜', free: true },
      { id: 'bodacc_radiation', name: 'BODACC Radiations', icon: '📜', free: true },
      { id: 'france_travail', name: 'France Travail', icon: '💼', free: true },
      { id: 'sitadel_permit', name: 'SITADEL Permis', icon: '🏗️', free: true },
      { id: 'inpi', name: 'INPI Brevets', icon: '📋', free: true },
      { id: 'boamp', name: 'BOAMP Marches publics', icon: '🏛️', free: true },
      { id: 'pappers', name: 'Pappers.fr', icon: '📊', free: true },
      { id: 'infogreffe', name: 'Infogreffe', icon: '⚖️', free: true },
    ]
  },
  {
    name: 'Web ouvert',
    icon: '🌐',
    description: 'RSS, alertes, scraping — sans authentification',
    sources: [
      { id: 'google_alerts', name: 'Google Alerts', icon: '🔔', free: true },
      { id: 'rss_batiactu', name: 'Batiactu', icon: '🏠', free: true },
      { id: 'rss_hotellerie', name: 'L\'Hotellerie', icon: '🏨', free: true },
      { id: 'rss_lsa', name: 'LSA Conso', icon: '🛒', free: true },
      { id: 'rss_decideurs', name: 'Decideurs', icon: '📰', free: true },
      { id: 'rss_fusac', name: 'Fusacq', icon: '🤝', free: true },
      { id: 'rss_indeed_fr', name: 'Indeed FR', icon: '💼', free: true },
      { id: 'rss_seloger', name: 'SeLoger', icon: '🏠', free: true },
      { id: 'trustpilot', name: 'Trustpilot', icon: '⭐', free: true },
      { id: 'google_shopping', name: 'Google Shopping', icon: '🛍️', free: true },
    ]
  },
  {
    name: 'Reseaux sociaux',
    icon: '📱',
    description: 'OAuth officiel — plan Hunter+ requis',
    sources: [
      { id: 'facebook_group', name: 'Groupes Facebook', icon: '👥', requiresPlan: 'hunter' },
      { id: 'linkedin_feed', name: 'Feed LinkedIn', icon: '💡', requiresPlan: 'hunter' },
      { id: 'instagram_hashtag', name: 'Hashtags Instagram', icon: '📸', requiresPlan: 'hunter' },
    ]
  },
  {
    name: 'Messagerie',
    icon: '💬',
    description: 'Groupes publics — plan Hunter+ requis',
    sources: [
      { id: 'telegram_group', name: 'Groupes Telegram', icon: '✈️', requiresPlan: 'hunter' },
      { id: 'discord', name: 'Discord (bientot)', icon: '🎮', requiresPlan: 'omniscient', comingSoon: true },
      { id: 'reddit', name: 'Reddit (bientot)', icon: '🔴', requiresPlan: 'omniscient', comingSoon: true },
    ]
  },
]

const PLAN_ORDER = ['radar', 'hunter', 'omniscient', 'war_room']

export default function SourceStatusGrid({ signals = [], config = {}, plan = 'radar' }) {
  const signalsBySource = {}
  signals.forEach(s => {
    const src = s.source || 'unknown'
    signalsBySource[src] = (signalsBySource[src] || 0) + 1
  })

  const planIndex = PLAN_ORDER.indexOf(plan)

  return (
    <div className="space-y-6">
      {SOURCE_CATEGORIES.map(cat => (
        <div key={cat.name}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{cat.icon}</span>
            <div>
              <h3 className="text-sm font-medium text-white">{cat.name}</h3>
              <p className="text-xs text-gray-500">{cat.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {cat.sources.map(source => {
              const count = signalsBySource[source.id] || 0
              const isLocked = source.requiresPlan && PLAN_ORDER.indexOf(source.requiresPlan) > planIndex
              const isActive = !isLocked && !source.comingSoon
              const isComingSoon = source.comingSoon

              return (
                <div
                  key={source.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isLocked || isComingSoon
                      ? 'border-gray-800 bg-gray-900/30 opacity-60'
                      : count > 0
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-gray-700/50 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{source.icon}</span>
                    <span className="text-xs font-medium text-gray-300 truncate">{source.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {isComingSoon ? (
                      <span className="text-[10px] text-gray-600">Bientot</span>
                    ) : isLocked ? (
                      <span className="text-[10px] text-gray-600">🔒 Plan {source.requiresPlan}</span>
                    ) : (
                      <>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        {count > 0 && (
                          <span className="text-[10px] font-medium text-emerald-400">{count} signaux</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
