/**
 * ConversionActionSettings — Config conversion action dans Reglages
 * Type selector, keywords, URL, presets metier
 */
import { useState, useEffect, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import {
  FileUp, CalendarCheck, UserPlus, FileText, MessageCircle, Sparkles,
  Save, Loader2, ExternalLink, Copy, Check, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

const TYPES = [
  { value: 'document_upload', label: 'Envoi document', icon: FileUp, description: 'Le prospect envoie un document (facture, contrat...)' },
  { value: 'booking', label: 'Prise de RDV', icon: CalendarCheck, description: 'Le prospect reserve un creneau' },
  { value: 'signup', label: 'Inscription', icon: UserPlus, description: 'Le prospect cree un compte ou s\'inscrit' },
  { value: 'form_fill', label: 'Formulaire', icon: FileText, description: 'Le prospect remplit un formulaire' },
  { value: 'reply_positive', label: 'Reponse positive', icon: MessageCircle, description: 'Le prospect repond favorablement (defaut)' },
  { value: 'custom', label: 'Personnalise', icon: Sparkles, description: 'Action personnalisee avec votre propre URL' },
]

const PRESETS = {
  energie: { type: 'document_upload', label: 'Envoyez votre facture d\'electricite', keywords: ['kWh', 'facture', 'EDF', 'Engie', 'TotalEnergies', 'consommation'] },
  comptable: { type: 'document_upload', label: 'Envoyez votre bilan comptable', keywords: ['bilan', 'liasse fiscale', 'exercice', 'resultat'] },
  assurance: { type: 'document_upload', label: 'Envoyez votre contrat actuel', keywords: ['contrat', 'prime', 'cotisation', 'assurance'] },
  consultant: { type: 'booking', label: 'Reservez votre creneau decouverte', keywords: [] },
  saas: { type: 'signup', label: 'Creez votre compte essai gratuit', keywords: [] },
  agence: { type: 'booking', label: 'Reservez votre audit gratuit', keywords: [] },
}

export default function ConversionActionSettings() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [config, setConfig] = useState({
    type: 'reply_positive',
    label: '',
    description: '',
    landingPageEnabled: false,
    attachmentKeywords: [],
    ctaUrl: null,
  })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')

  // Load current config
  useEffect(() => {
    if (!orgId) return
    const unsub = onSnapshot(doc(db, 'organizations', orgId), (snap) => {
      if (snap.exists() && snap.data().conversionAction) {
        setConfig(snap.data().conversionAction)
      }
    })
    return unsub
  }, [orgId])

  const save = useCallback(async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const updateFn = httpsCallable(functions, 'updateConversionAction')
      await updateFn({ orgId, conversionAction: config })
      toast.success('Action de conversion mise a jour')
    } catch (err) {
      toast.error(err.message || 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [orgId, config])

  const applyPreset = (key) => {
    const preset = PRESETS[key]
    if (!preset) return
    setConfig(prev => ({
      ...prev,
      type: preset.type,
      label: preset.label,
      attachmentKeywords: preset.keywords,
      landingPageEnabled: preset.type === 'document_upload',
    }))
    setShowPresets(false)
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (!kw || config.attachmentKeywords.includes(kw)) return
    setConfig(prev => ({
      ...prev,
      attachmentKeywords: [...prev.attachmentKeywords, kw],
    }))
    setKeywordInput('')
  }

  const removeKeyword = (kw) => {
    setConfig(prev => ({
      ...prev,
      attachmentKeywords: prev.attachmentKeywords.filter(k => k !== kw),
    }))
  }

  const orgSlug = currentOrg?.slug || orgId
  const collectUrl = orgSlug ? `https://face-media-factory.web.app/collect/${orgSlug}` : null

  const copyUrl = () => {
    if (collectUrl) {
      navigator.clipboard.writeText(collectUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Action de conversion</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Definissez ce qu'un prospect doit faire pour etre considere comme chaud
          </p>
        </div>
        {/* Presets */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="text-xs text-[#4F6EF7] hover:text-[#3d5bd9] flex items-center gap-1"
          >
            Presets metier <ChevronDown className="w-3 h-3" />
          </button>
          {showPresets && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 w-48">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 capitalize"
                >
                  {key}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TYPES.map(({ value, label, icon: Icon, description }) => (
          <button
            key={value}
            onClick={() => setConfig(prev => ({
              ...prev,
              type: value,
              landingPageEnabled: value === 'document_upload' ? prev.landingPageEnabled : false,
            }))}
            className={`p-3 rounded-lg border text-left transition-all ${
              config.type === value
                ? 'border-[#4F6EF7] bg-indigo-50 ring-1 ring-[#4F6EF7]'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Icon className={`w-5 h-5 mb-1.5 ${config.type === value ? 'text-[#4F6EF7]' : 'text-gray-400'}`} />
            <p className="text-xs font-medium text-gray-900">{label}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          </button>
        ))}
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Label CTA (visible par le prospect)
        </label>
        <input
          type="text"
          value={config.label}
          onChange={e => setConfig(prev => ({ ...prev, label: e.target.value }))}
          placeholder="Ex: Envoyez votre facture d'electricite"
          className="input-field w-full text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Description interne
        </label>
        <input
          type="text"
          value={config.description}
          onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Ce que vous considerez comme un lead chaud"
          className="input-field w-full text-sm"
        />
      </div>

      {/* Document upload specific */}
      {config.type === 'document_upload' && (
        <>
          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mots-cles de detection (dans les messages entrants)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="Ajouter un mot-cle"
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={addKeyword}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200"
              >
                Ajouter
              </button>
            </div>
            {config.attachmentKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {config.attachmentKeywords.map(kw => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-[#4F6EF7] text-xs rounded-full cursor-pointer hover:bg-indigo-100"
                    onClick={() => removeKeyword(kw)}
                  >
                    {kw} &times;
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Landing page toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">Page de collecte</p>
              <p className="text-[10px] text-gray-500">Landing page publique pour deposer des documents</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, landingPageEnabled: !prev.landingPageEnabled }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                config.landingPageEnabled ? 'bg-[#4F6EF7]' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                config.landingPageEnabled ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>

          {/* Collect URL preview */}
          {config.landingPageEnabled && collectUrl && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 truncate">{collectUrl}</span>
              </div>
              <button
                onClick={copyUrl}
                className="flex-shrink-0 p-1.5 hover:bg-gray-200 rounded"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          )}
        </>
      )}

      {/* External URL (booking, signup, form_fill, custom) */}
      {['booking', 'signup', 'form_fill', 'custom'].includes(config.type) && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            URL externe {config.type === 'booking' ? '(Calendly, Cal.com...)' : config.type === 'signup' ? '(page d\'inscription)' : ''}
          </label>
          <input
            type="url"
            value={config.ctaUrl || ''}
            onChange={e => setConfig(prev => ({ ...prev, ctaUrl: e.target.value }))}
            placeholder="https://calendly.com/votre-nom/15min"
            className="input-field w-full text-sm"
          />
        </div>
      )}

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Enregistrer
      </button>
    </div>
  )
}
