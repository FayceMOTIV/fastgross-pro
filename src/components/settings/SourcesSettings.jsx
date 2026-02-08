import { useState } from 'react'
import {
  Globe,
  Search,
  Mail,
  Users,
  Save,
  Loader2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SourcesSettings({ saving, setSaving }) {
  const [hunterEnabled, setHunterEnabled] = useState(false)
  const [hunterApiKey, setHunterApiKey] = useState('')
  const [dropcontactEnabled, setDropcontactEnabled] = useState(false)
  const [dropcontactApiKey, setDropcontactApiKey] = useState('')
  const [scrapingEnabled, setScrapingEnabled] = useState(true)

  const handleSave = async () => {
    setSaving(true)
    try {
      toast.success("Sources d'emails sauvegardees")
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <Globe className="w-5 h-5 text-brand-400" />
        <h2 className="section-title">Sources d'emails</h2>
      </div>

      <p className="text-sm text-dark-400">
        Configurez les sources utilisees pour trouver les emails de vos prospects. Plus de sources =
        plus de chances de trouver l'email valide.
      </p>

      {/* Scraping */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-white">Scraping de sites web</h3>
              <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                Gratuit
              </span>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              Extraction automatique des emails depuis les pages contact, mentions legales, etc.
            </p>
          </div>
          <button
            onClick={() => setScrapingEnabled(!scrapingEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              scrapingEnabled ? 'bg-brand-500' : 'bg-dark-700'
            }`}
          >
            {scrapingEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-dark-400" />
            )}
          </button>
        </div>
      </div>

      {/* Hunter.io */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-amber-400" />
              <h3 className="font-medium text-white">Hunter.io</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                Premium
              </span>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              API professionnelle pour trouver et verifier les emails. ~50 credits/mois gratuits.
            </p>
          </div>
          <button
            onClick={() => setHunterEnabled(!hunterEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              hunterEnabled ? 'bg-brand-500' : 'bg-dark-700'
            }`}
          >
            {hunterEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-dark-400" />
            )}
          </button>
        </div>

        {hunterEnabled && (
          <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Cle API Hunter.io
            </label>
            <input
              type="password"
              value={hunterApiKey}
              onChange={(e) => setHunterApiKey(e.target.value)}
              className="input-field"
              placeholder="Votre cle API Hunter.io"
            />
            <a
              href="https://hunter.io/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:underline mt-2 inline-flex items-center gap-1"
            >
              Obtenir une cle API
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Dropcontact */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-white">Dropcontact</h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                Premium
              </span>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              Enrichissement B2B francais. Excellent pour les entreprises francaises.
            </p>
          </div>
          <button
            onClick={() => setDropcontactEnabled(!dropcontactEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              dropcontactEnabled ? 'bg-brand-500' : 'bg-dark-700'
            }`}
          >
            {dropcontactEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-dark-400" />
            )}
          </button>
        </div>

        {dropcontactEnabled && (
          <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Cle API Dropcontact
            </label>
            <input
              type="password"
              value={dropcontactApiKey}
              onChange={(e) => setDropcontactApiKey(e.target.value)}
              className="input-field"
              placeholder="Votre cle API Dropcontact"
            />
            <a
              href="https://www.dropcontact.com/fr/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:underline mt-2 inline-flex items-center gap-1"
            >
              Obtenir une cle API
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* LinkedIn (coming soon) */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10 opacity-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-white">LinkedIn Sales Navigator</h3>
              <span className="px-2 py-0.5 rounded-full bg-dark-700 text-dark-400 text-xs">
                Bientot disponible
              </span>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              Import de leads depuis LinkedIn avec enrichissement automatique.
            </p>
          </div>
          <button
            disabled
            className="flex-shrink-0 p-1 rounded-full bg-dark-700 cursor-not-allowed"
          >
            <ToggleLeft className="w-8 h-8 text-dark-500" />
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  )
}
