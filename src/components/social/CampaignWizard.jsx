/**
 * CampaignWizard - Wizard 4 etapes pour configurer une campagne social DM
 *
 * Etapes :
 * 1. Ciblage (hashtags, location, type profils)
 * 2. Messages (template + variables + preview AI)
 * 3. Parametres envoi (limites, horaires, warmup)
 * 4. Resume + lancement
 */

import { useState } from 'react'
import {
  Target,
  MessageSquare,
  Settings,
  Rocket,
  ChevronRight,
  ChevronLeft,
  X,
  Instagram,
  MessageCircle,
  Hash,
  MapPin,
  Users,
  Clock,
  Shield,
  Sparkles,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

const STEPS = [
  { id: 'targeting', label: 'Ciblage', icon: Target },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'settings', label: 'Parametres', icon: Settings },
  { id: 'launch', label: 'Lancement', icon: Rocket },
]

const DEFAULT_DM_TEMPLATE = `Salut {firstName} !

J'ai vu ton profil {platform} et ton travail dans {niche} m'a vraiment interesse.

Chez Face Media Factory, on aide les {niche} a trouver des clients en automatique grace a la video et l'IA.

Ca te dirait qu'on en discute 5 min ?

{senderName}`

const DEFAULT_WA_TEMPLATE = `Bonjour {firstName} !

Je suis {senderName} de Face Media Factory.

On aide les professionnels {niche} a developper leur clientele grace a la prospection intelligente.

Tu serais dispo pour un appel de 10 min cette semaine ?`

export default function CampaignWizard({ onClose, onLaunch, launching }) {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState({
    // Step 1: Targeting
    channels: ['instagram'],
    hashtags: '',
    location: 'France',
    minFollowers: 500,
    maxFollowers: 100000,
    scrapeType: 'hashtag',
    scrapeTarget: '',
    // Step 2: Messages
    dmTemplate: DEFAULT_DM_TEMPLATE,
    waTemplate: DEFAULT_WA_TEMPLATE,
    useAI: true,
    senderName: 'Faical',
    // Step 3: Settings
    dailyLimitDM: 30,
    hourlyLimitDM: 4,
    dailyLimitWA: 50,
    hourlyLimitWA: 10,
    sendHoursStart: 9,
    sendHoursEnd: 20,
    skipWeekends: false,
    warmupEnabled: true,
    // Step 4: Launch
    startImmediately: true,
  })

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const toggleChannel = (channel) => {
    setConfig(prev => {
      const channels = prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
      return { ...prev, channels: channels.length > 0 ? channels : prev.channels }
    })
  }

  const canProceed = () => {
    switch (step) {
      case 0: return config.channels.length > 0 && (config.hashtags.trim() || config.scrapeTarget.trim())
      case 1: return config.dmTemplate.trim().length > 20
      case 2: return true
      case 3: return true
      default: return false
    }
  }

  const handleLaunch = () => {
    onLaunch({
      ...config,
      hashtags: config.hashtags.split(',').map(h => h.trim()).filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Nouvelle campagne Social DM</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = i === step
              const isDone = i < step

              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-indigo-100 text-indigo-700' :
                    isDone ? 'bg-green-100 text-green-700' :
                    'text-gray-400'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Targeting */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Canaux</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => toggleChannel('instagram')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      config.channels.includes('instagram')
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Instagram className="w-5 h-5" />
                    Instagram DM
                  </button>
                  <button
                    onClick={() => toggleChannel('whatsapp')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      config.channels.includes('whatsapp')
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de sourcing</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'hashtag', label: 'Hashtags', icon: Hash },
                    { value: 'followers', label: 'Followers de...', icon: Users },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateConfig('scrapeType', opt.value)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm transition-colors ${
                        config.scrapeType === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {config.scrapeType === 'hashtag' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Hashtags (separes par des virgules)
                  </label>
                  <input
                    type="text"
                    value={config.hashtags}
                    onChange={(e) => updateConfig('hashtags', e.target.value)}
                    placeholder="marketing, entrepreneur, business, startup"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Compte cible (username)
                  </label>
                  <input
                    type="text"
                    value={config.scrapeTarget}
                    onChange={(e) => updateConfig('scrapeTarget', e.target.value)}
                    placeholder="entrepreneur_france"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Localisation
                  </label>
                  <input
                    type="text"
                    value={config.location}
                    onChange={(e) => updateConfig('location', e.target.value)}
                    placeholder="France"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Followers (min - max)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={config.minFollowers}
                      onChange={(e) => updateConfig('minFollowers', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <input
                      type="number"
                      value={config.maxFollowers}
                      onChange={(e) => updateConfig('maxFollowers', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Messages */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Personnalisation IA</label>
                <button
                  onClick={() => updateConfig('useAI', !config.useAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.useAI ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.useAI ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {config.useAI && (
                <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-indigo-800 font-medium">IA activee</p>
                    <p className="text-xs text-indigo-600 mt-1">
                      Chaque message sera personnalise par l'IA en fonction du profil du prospect (bio, niche, activite).
                      Le template ci-dessous sert de base.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'expediteur</label>
                <input
                  type="text"
                  value={config.senderName}
                  onChange={(e) => updateConfig('senderName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {config.channels.includes('instagram') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Instagram className="w-4 h-4 inline mr-1" />
                    Template Instagram DM
                  </label>
                  <textarea
                    value={config.dmTemplate}
                    onChange={(e) => updateConfig('dmTemplate', e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Variables : {'{firstName}'}, {'{platform}'}, {'{niche}'}, {'{senderName}'}, {'{company}'}
                  </p>
                </div>
              )}

              {config.channels.includes('whatsapp') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Template WhatsApp
                  </label>
                  <textarea
                    value={config.waTemplate}
                    onChange={(e) => updateConfig('waTemplate', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 2 && (
            <div className="space-y-6">
              {config.channels.includes('instagram') && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    Limites Instagram DM
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">DMs par jour (par compte)</label>
                      <input
                        type="number"
                        value={config.dailyLimitDM}
                        onChange={(e) => updateConfig('dailyLimitDM', parseInt(e.target.value) || 0)}
                        min={1}
                        max={50}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">Recommande : 30/jour max</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">DMs par heure (par compte)</label>
                      <input
                        type="number"
                        value={config.hourlyLimitDM}
                        onChange={(e) => updateConfig('hourlyLimitDM', parseInt(e.target.value) || 0)}
                        min={1}
                        max={10}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">Recommande : 4/h max</p>
                    </div>
                  </div>
                </div>
              )}

              {config.channels.includes('whatsapp') && (
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    Limites WhatsApp
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Messages par jour</label>
                      <input
                        type="number"
                        value={config.dailyLimitWA}
                        onChange={(e) => updateConfig('dailyLimitWA', parseInt(e.target.value) || 0)}
                        min={1}
                        max={100}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">Recommande : 50/jour max</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Messages par heure</label>
                      <input
                        type="number"
                        value={config.hourlyLimitWA}
                        onChange={(e) => updateConfig('hourlyLimitWA', parseInt(e.target.value) || 0)}
                        min={1}
                        max={20}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">Recommande : 10/h max</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Horaires d'envoi
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Debut</label>
                    <select
                      value={config.sendHoursStart}
                      onChange={(e) => updateConfig('sendHoursStart', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {Array.from({ length: 14 }, (_, i) => i + 7).map(h => (
                        <option key={h} value={h}>{h}h00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fin</label>
                    <select
                      value={config.sendHoursEnd}
                      onChange={(e) => updateConfig('sendHoursEnd', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {Array.from({ length: 14 }, (_, i) => i + 7).map(h => (
                        <option key={h} value={h}>{h}h00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.skipWeekends}
                      onChange={(e) => updateConfig('skipWeekends', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Pause le weekend</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.warmupEnabled}
                      onChange={(e) => updateConfig('warmupEnabled', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Warmup progressif (recommande)</span>
                  </label>
                </div>
              </div>

              {config.dailyLimitDM > 30 && (
                <div className="bg-yellow-50 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Plus de 30 DMs/jour par compte augmente significativement le risque de ban Instagram.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Summary + Launch */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4">Resume de la campagne</h3>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Canaux</span>
                    <span className="font-medium text-gray-900">{config.channels.map(c => c === 'instagram' ? 'Instagram DM' : 'WhatsApp').join(', ')}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sourcing</span>
                    <span className="font-medium text-gray-900">
                      {config.scrapeType === 'hashtag'
                        ? `Hashtags: ${config.hashtags || '(non defini)'}`
                        : `Followers de @${config.scrapeTarget || '(non defini)'}`}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Localisation</span>
                    <span className="font-medium text-gray-900">{config.location}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Personnalisation IA</span>
                    <span className="font-medium text-gray-900">{config.useAI ? 'Activee' : 'Desactivee'}</span>
                  </div>

                  {config.channels.includes('instagram') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Limites IG</span>
                      <span className="font-medium text-gray-900">{config.dailyLimitDM}/jour, {config.hourlyLimitDM}/h</span>
                    </div>
                  )}

                  {config.channels.includes('whatsapp') && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Limites WA</span>
                      <span className="font-medium text-gray-900">{config.dailyLimitWA}/jour, {config.hourlyLimitWA}/h</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Horaires</span>
                    <span className="font-medium text-gray-900">
                      {config.sendHoursStart}h - {config.sendHoursEnd}h
                      {config.skipWeekends ? ' (lun-ven)' : ' (lun-dim)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">Protections anti-ban actives</p>
                  <ul className="text-xs text-green-600 mt-1 space-y-0.5">
                    <li>Delais gaussiens entre chaque envoi</li>
                    <li>Rotation des comptes automatique</li>
                    {config.warmupEnabled && <li>Warmup progressif active</li>}
                    <li>Pause automatique en cas de rate limit</li>
                  </ul>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.startImmediately}
                  onChange={(e) => updateConfig('startImmediately', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Demarrer immediatement</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Annuler' : 'Retour'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50"
            >
              {launching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lancement...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Lancer la campagne
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
