import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useSocialOAuthResult } from '@/hooks/useSocialOAuthResult'

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook & Instagram',
    icon: '👥',
    color: 'text-blue-400',
    border: 'border-blue-400/20',
    bg: 'bg-blue-400/10',
    description: 'Scanner les groupes locaux et commenter au nom de votre page',
    capabilities: ['Groupes Facebook', 'Pages Facebook', 'Commentaires Instagram', 'Hashtags sectoriels'],
    limits: '12 commentaires/jour, 15 DM/jour',
    oauthFn: 'metaOAuthStart',
    trustNote: 'Connexion via Meta officiel — acces revocable a tout moment dans vos parametres Facebook',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💡',
    color: 'text-sky-400',
    border: 'border-sky-400/20',
    bg: 'bg-sky-400/10',
    description: 'Surveiller le fil LinkedIn et commenter au nom de votre profil',
    capabilities: ["Fil d'actualite", 'Groupes LinkedIn', 'Posts sectoriels'],
    limits: '8 commentaires/jour, 10 messages/jour',
    oauthFn: 'linkedinOAuthStart',
    trustNote: 'Connexion via LinkedIn officiel — meme mecanisme que Buffer ou Hootsuite',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'text-indigo-400',
    border: 'border-indigo-400/20',
    bg: 'bg-indigo-400/10',
    description: 'Veille groupes publics via compte FMF dedie (pas le votre)',
    capabilities: ['Groupes Telegram publics', 'Canaux sectoriels FR', 'Reponses en votre nom'],
    limits: '50 messages/jour',
    oauthFn: null,
    trustNote: 'Utilise un compte Telegram dedie FMF — votre compte personnel n\'est pas implique',
    isManaged: true,
  },
]

export default function OAuthConnector({ orgId, connectedPlatforms }) {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)
  const oauthResult = useSocialOAuthResult()

  useEffect(() => {
    if (oauthResult?.type === 'error') {
      setError(`Erreur connexion ${oauthResult.platform} : ${oauthResult.reason || 'inconnue'}`)
    }
  }, [oauthResult])

  const handleConnect = async (platform) => {
    if (!platform.oauthFn) return
    setLoading(platform.id)
    setError(null)

    try {
      const startOAuth = httpsCallable(functions, platform.oauthFn)
      const result = await startOAuth({ orgId })
      window.location.href = result.data.authUrl
    } catch (err) {
      setError(`Erreur : ${err.message}`)
      setLoading(null)
    }
  }

  const handleDisconnect = async (platformId) => {
    if (!confirm(`Deconnecter ${platformId} ? Alex ne pourra plus agir sur cette plateforme.`)) return
    const disconnect = httpsCallable(functions, 'disconnectSocialPlatform')
    await disconnect({ orgId, platform: platformId })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white">Connectez vos comptes sociaux</h2>
        <p className="text-sm text-gray-400 mt-1">
          Alex agit <strong className="text-white">en votre nom</strong> — plus credible, meilleur taux de reponse.
          Connexion securisee via les APIs officielles de chaque reseau.
        </p>
      </div>

      {oauthResult?.type === 'success' && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-center gap-2">
          <strong>{oauthResult.platform}</strong> connecte avec succes !
          Alex peut maintenant agir sur cette plateforme en votre nom.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
        <span className="text-xl shrink-0">🔐</span>
        <div>
          <p className="text-sm font-medium text-amber-400">Vos donnees restent les votres</p>
          <p className="text-xs text-gray-400 mt-1">
            FMF utilise les protocoles OAuth officiels — vos identifiants ne transitent jamais par nos serveurs.
            Tokens chiffres AES-256 au repos. Revocable a tout moment depuis vos parametres de compte.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(platform => {
          const connected = connectedPlatforms?.[platform.id]?.connected
          const expiresAt = connectedPlatforms?.[platform.id]?.expiresAt
          const isExpiringSoon = expiresAt && (new Date(expiresAt) - Date.now()) < 7 * 24 * 60 * 60 * 1000

          return (
            <div
              key={platform.id}
              className={`rounded-2xl border p-5 transition-all ${
                connected
                  ? `${platform.border} bg-gray-900/70`
                  : 'border-gray-800 bg-gray-900/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${platform.bg} flex items-center justify-center text-xl`}>
                    {platform.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white text-sm">{platform.name}</h3>
                      {connected && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Actif
                        </span>
                      )}
                      {connected && isExpiringSoon && (
                        <span className="text-xs text-amber-400">Expire bientot</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{platform.description}</p>
                  </div>
                </div>
              </div>

              <ul className="space-y-1 mb-4">
                {platform.capabilities.map(cap => (
                  <li key={cap} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className={`w-1 h-1 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    {cap}
                  </li>
                ))}
              </ul>

              <div className="text-xs text-gray-600 mb-4">{platform.limits}</div>

              <p className="text-xs text-gray-600 italic mb-4 leading-relaxed">
                🔒 {platform.trustNote}
              </p>

              {connected ? (
                <button
                  onClick={() => handleDisconnect(platform.id)}
                  className="w-full py-2 text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 rounded-xl transition-colors"
                >
                  Deconnecter
                </button>
              ) : platform.isManaged ? (
                <div className="w-full py-2 text-xs text-center text-gray-500 border border-gray-700 rounded-xl">
                  Gere par FMF — configurez les groupes ci-dessous
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(platform)}
                  disabled={loading === platform.id}
                  className={`w-full py-2.5 text-sm font-medium rounded-xl border transition-all disabled:opacity-40
                    ${platform.bg} ${platform.color} ${platform.border} hover:opacity-90`}
                >
                  {loading === platform.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" />
                      Redirection...
                    </span>
                  ) : (
                    `Connecter via ${platform.name.split(' ')[0]}`
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-gray-800/50 border border-gray-700">
        <p className="text-sm font-medium text-gray-300 mb-2">Sources actives sans connexion requise</p>
        <p className="text-xs text-gray-500">
          BODACC, France Travail, SITADEL, INPI, Telegram, Google Alerts
          et 20+ flux RSS sont deja actifs. La connexion aux reseaux sociaux est optionnelle
          mais augmente significativement le volume de signaux detectes.
        </p>
      </div>
    </div>
  )
}
