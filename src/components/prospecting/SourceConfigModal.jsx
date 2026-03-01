import { useState } from 'react'
import { X } from 'lucide-react'

export default function SourceConfigModal({ config, onSave, onClose }) {
  const [formData, setFormData] = useState({
    enabled: config?.enabled ?? false,
    minScoreToPromote: config?.scoring?.minScoreToPromote ?? 40,
    maxRawLeadsPerDay: config?.limits?.maxRawLeadsPerDay ?? 5000,
    maxPromotionsPerDay: config?.limits?.maxPromotionsPerDay ?? 500,
    rawLeadTTLDays: config?.limits?.rawLeadTTLDays ?? 30,
    enableFuzzyCompanyMatch: config?.dedup?.enableFuzzyCompanyMatch ?? true,
    fuzzyThreshold: config?.dedup?.fuzzyThreshold ?? 0.85,
  })

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        enabled: formData.enabled,
        scoring: { minScoreToPromote: formData.minScoreToPromote },
        limits: {
          maxRawLeadsPerDay: formData.maxRawLeadsPerDay,
          maxPromotionsPerDay: formData.maxPromotionsPerDay,
          rawLeadTTLDays: formData.rawLeadTTLDays,
        },
        dedup: {
          enableFuzzyCompanyMatch: formData.enableFuzzyCompanyMatch,
          fuzzyThreshold: formData.fuzzyThreshold,
        },
      })
      onClose()
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Configuration Prospecting</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Activation */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Activer la collecte automatique</p>
              <p className="text-sm text-gray-500">L'orchestrateur s'execute toutes les 2h</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => updateField('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>

          {/* Scoring */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Score minimum pour promotion ({formData.minScoreToPromote}/100)
            </label>
            <input
              type="range"
              min="10"
              max="80"
              value={formData.minScoreToPromote}
              onChange={e => updateField('minScoreToPromote', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10 (permissif)</span>
              <span>80 (strict)</span>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Limites quotidiennes</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max leads/jour</label>
                <input
                  type="number"
                  value={formData.maxRawLeadsPerDay}
                  onChange={e => updateField('maxRawLeadsPerDay', parseInt(e.target.value))}
                  className="input-field text-sm"
                  min="100"
                  max="50000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max promotions/jour</label>
                <input
                  type="number"
                  value={formData.maxPromotionsPerDay}
                  onChange={e => updateField('maxPromotionsPerDay', parseInt(e.target.value))}
                  className="input-field text-sm"
                  min="50"
                  max="10000"
                />
              </div>
            </div>
          </div>

          {/* Dedup */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Deduplication</h4>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.enableFuzzyCompanyMatch}
                onChange={e => updateField('enableFuzzyCompanyMatch', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              <label className="text-sm text-gray-600">
                Correspondance floue (nom entreprise + ville)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
