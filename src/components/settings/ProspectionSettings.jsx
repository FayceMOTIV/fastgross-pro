import { useState } from 'react'
import { Search, Users, Zap, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProspectionSettings({ saving, setSaving }) {
  const [multiContact, setMultiContact] = useState(true)
  const [maxContactsPerCompany, setMaxContactsPerCompany] = useState(3)
  const [autoScore, setAutoScore] = useState(true)
  const [minScore, setMinScore] = useState(60)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Parametres de prospection sauvegardes')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <Search className="w-5 h-5 text-brand-400" />
        <h2 className="section-title">Parametres de prospection</h2>
      </div>

      {/* Multi-contact toggle */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-brand-400" />
              <h3 className="font-medium text-white">Multi-contact par entreprise</h3>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              Contacter plusieurs personnes au sein de la meme entreprise pour maximiser vos chances
              de reponse
            </p>
          </div>
          <button
            onClick={() => setMultiContact(!multiContact)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              multiContact ? 'bg-brand-500' : 'bg-dark-700'
            }`}
          >
            {multiContact ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-dark-400" />
            )}
          </button>
        </div>

        {multiContact && (
          <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Nombre max de contacts par entreprise
            </label>
            <select
              value={maxContactsPerCompany}
              onChange={(e) => setMaxContactsPerCompany(parseInt(e.target.value))}
              className="input-field w-48"
            >
              <option value={2}>2 contacts</option>
              <option value={3}>3 contacts</option>
              <option value={5}>5 contacts</option>
              <option value={10}>10 contacts</option>
            </select>
            <p className="text-xs text-dark-500 mt-2">
              Recommande : 3 contacts (dirigeant, commercial, marketing)
            </p>
          </div>
        )}
      </div>

      {/* Auto-scoring toggle */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-medium text-white">Scoring automatique</h3>
            </div>
            <p className="text-sm text-dark-400 mt-2 ml-8">
              Attribuer automatiquement un score de qualite a chaque prospect trouve
            </p>
          </div>
          <button
            onClick={() => setAutoScore(!autoScore)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              autoScore ? 'bg-brand-500' : 'bg-dark-700'
            }`}
          >
            {autoScore ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-dark-400" />
            )}
          </button>
        </div>

        {autoScore && (
          <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Score minimum pour envoyer un email
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
                className="flex-1 accent-brand-500"
              />
              <span className="w-12 text-center font-medium text-white">{minScore}%</span>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              Les prospects avec un score inferieur ne seront pas contactes automatiquement
            </p>
          </div>
        )}
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
