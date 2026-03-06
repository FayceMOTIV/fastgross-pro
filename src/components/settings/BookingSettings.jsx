import { useState, useEffect } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  CalendarCheck,
  Link,
  Key,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

const PROVIDERS = [
  { id: 'calendly', label: 'Calendly', placeholder: 'https://calendly.com/votre-nom' },
  { id: 'calcom', label: 'Cal.com', placeholder: 'https://cal.com/votre-nom' },
]

export default function BookingSettings() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [provider, setProvider] = useState('calendly')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [autoSend, setAutoSend] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId))
      const booking = orgDoc.data()?.integrations?.booking
      if (booking) {
        setProvider(booking.provider || 'calendly')
        setUrl(booking.url || '')
        setApiKey(booking.apiKey || '')
        setAutoSend(booking.autoSend || false)
      }
    }
    load()
  }, [orgId])

  const save = async () => {
    if (!orgId) {
      toast.success('[Demo] Configuration sauvegardee')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        'integrations.booking': {
          provider,
          url,
          apiKey,
          autoSend,
          enabled: Boolean(url),
          updatedAt: new Date(),
        },
      })
      toast.success('Configuration booking sauvegardee')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const testLink = () => {
    if (!url) {
      toast.error('Entrez une URL d\'abord')
      return
    }
    setTesting(true)
    const testUrl = `${url}?name=Test%20FMF`
    window.open(testUrl, '_blank')
    setTimeout(() => setTesting(false), 1000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-indigo-500" />
          Prise de rendez-vous
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Connectez Calendly ou Cal.com pour la prise de RDV automatique
        </p>
      </div>

      {/* Provider toggle */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Plateforme</label>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                provider === p.id
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
          <Link className="w-3.5 h-3.5" />
          URL de booking
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={PROVIDERS.find((p) => p.id === provider)?.placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
      </div>

      {/* API Key */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
          <Key className="w-3.5 h-3.5" />
          API Key (optionnel)
        </label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder="Pour les webhooks automatiques"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
      </div>

      {/* Auto send toggle */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">Envoi automatique</p>
          <p className="text-xs text-gray-500">Envoyer le lien RDV automatiquement aux leads interesses</p>
        </div>
        <button
          onClick={() => setAutoSend(!autoSend)}
          className={`relative w-11 h-6 rounded-full transition-colors ${autoSend ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSend ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Sauvegarder
        </button>
        <button
          onClick={testLink}
          disabled={testing || !url}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
        >
          <ExternalLink className="w-4 h-4" />
          Tester le lien
        </button>
      </div>
    </div>
  )
}
