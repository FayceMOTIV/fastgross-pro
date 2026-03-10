import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

export default function SourceConfigModal({ orgId, config = {}, onClose }) {
  const [keywords, setKeywords] = useState((config.keywords || []).join(', '))
  const [nafCodes, setNafCodes] = useState((config.nafCodes || []).join(', '))
  const [facebookGroups, setFacebookGroups] = useState(
    (config.facebookGroups || []).map(g => g.url).join('\n')
  )
  const [telegramGroups, setTelegramGroups] = useState(
    (config.telegramGroups || []).map(g => g.username).join('\n')
  )
  const [googleAlertsUrls, setGoogleAlertsUrls] = useState(
    (config.googleAlertsUrls || []).join('\n')
  )
  const [enabled, setEnabled] = useState(config.enabled !== false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const fn = httpsCallable(functions, 'configureSocialSources')
      await fn({
        orgId,
        config: {
          enabled,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          nafCodes: nafCodes.split(',').map(k => k.trim()).filter(Boolean),
          facebookGroups: facebookGroups.split('\n').map(url => url.trim()).filter(Boolean).map(url => ({ url })),
          telegramGroups: telegramGroups.split('\n').map(u => u.trim()).filter(Boolean).map(username => ({ username })),
          googleAlertsUrls: googleAlertsUrls.split('\n').map(u => u.trim()).filter(Boolean),
        }
      })
      onClose()
    } catch (err) {
      console.error('Save error:', err)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 m-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-white">Configuration Social Omniscient</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700">
            <div>
              <p className="text-sm font-medium text-white">Veille active</p>
              <p className="text-xs text-gray-500">Scan toutes les 2 heures</p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Mots-cles de veille (separes par des virgules)
            </label>
            <textarea
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="restaurant, renovation, agrandissement, demenagement..."
              className="w-full p-3 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 resize-none"
              rows={2}
            />
          </div>

          {/* NAF Codes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Codes NAF cibles (optionnel)
            </label>
            <input
              value={nafCodes}
              onChange={e => setNafCodes(e.target.value)}
              placeholder="56.10A, 43.21A, 47.11F..."
              className="w-full p-3 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600"
            />
          </div>

          {/* Facebook Groups */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Groupes Facebook (1 URL par ligne, max 3)
            </label>
            <textarea
              value={facebookGroups}
              onChange={e => setFacebookGroups(e.target.value)}
              placeholder="https://facebook.com/groups/..."
              className="w-full p-3 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 resize-none"
              rows={3}
            />
          </div>

          {/* Telegram Groups */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Groupes Telegram (1 username par ligne, max 5)
            </label>
            <textarea
              value={telegramGroups}
              onChange={e => setTelegramGroups(e.target.value)}
              placeholder="@nomdugroupe"
              className="w-full p-3 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 resize-none"
              rows={3}
            />
          </div>

          {/* Google Alerts */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              URLs RSS Google Alerts (1 par ligne)
            </label>
            <textarea
              value={googleAlertsUrls}
              onChange={e => setGoogleAlertsUrls(e.target.value)}
              placeholder="https://www.google.com/alerts/feeds/..."
              className="w-full p-3 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40 transition-colors"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
