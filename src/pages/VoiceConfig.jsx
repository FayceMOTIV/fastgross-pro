import { useState, useEffect } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import {
  Phone,
  Mic,
  Key,
  Clock,
  Play,
  Pause,
  Save,
  Loader2,
  Volume2,
  Settings,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'

const DEFAULT_HOURS = [
  { day: 'Lundi', start: '09:00', end: '18:00', enabled: true },
  { day: 'Mardi', start: '09:00', end: '18:00', enabled: true },
  { day: 'Mercredi', start: '09:00', end: '18:00', enabled: true },
  { day: 'Jeudi', start: '09:00', end: '18:00', enabled: true },
  { day: 'Vendredi', start: '09:00', end: '18:00', enabled: true },
  { day: 'Samedi', start: '09:00', end: '12:00', enabled: false },
  { day: 'Dimanche', start: '', end: '', enabled: false },
]

export default function VoiceConfig() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [vapiKey, setVapiKey] = useState('')
  const [elevenLabsKey, setElevenLabsKey] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [callingHours, setCallingHours] = useState(DEFAULT_HOURS)
  const [maxCallsPerDay, setMaxCallsPerDay] = useState(20)
  const [saving, setSaving] = useState(false)

  // Demo stats
  const stats = {
    totalCalls: 47,
    avgDuration: '1:45',
    responseRate: 62,
    meetingsBooked: 8,
  }

  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId))
      const voice = orgDoc.data()?.voiceConfig
      if (voice) {
        setVapiKey(voice.vapiKey || '')
        setElevenLabsKey(voice.elevenLabsKey || '')
        setEnabled(voice.enabled || false)
        setMaxCallsPerDay(voice.maxCallsPerDay || 20)
      }
      const script = orgDoc.data()?.voiceScript
      if (script) {
        setSystemPrompt(script.systemPrompt || '')
        setFirstMessage(script.firstMessage || '')
      }
      if (voice?.callingHours) {
        setCallingHours(voice.callingHours)
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
        voiceConfig: {
          vapiKey,
          elevenLabsKey,
          enabled,
          maxCallsPerDay,
          callingHours,
          updatedAt: new Date(),
        },
        voiceScript: {
          systemPrompt,
          firstMessage,
        },
      })
      toast.success('Configuration voice sauvegardee')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-500" />
            Agent Vocal
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Appels sortants automatises via Vapi + ElevenLabs</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Appels', value: stats.totalCalls, icon: Phone },
          { label: 'Duree moy.', value: stats.avgDuration, icon: Clock },
          { label: 'Taux reponse', value: `${stats.responseRate}%`, icon: BarChart3 },
          { label: 'RDV obtenus', value: stats.meetingsBooked, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-400" />
          Cles API
        </h3>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Vapi API Key</label>
          <input
            value={vapiKey}
            onChange={(e) => setVapiKey(e.target.value)}
            type="password"
            placeholder="vapi-xxxxxxxx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">ElevenLabs API Key</label>
          <input
            value={elevenLabsKey}
            onChange={(e) => setElevenLabsKey(e.target.value)}
            type="password"
            placeholder="xi-xxxxxxxx"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Script */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Mic className="w-4 h-4 text-gray-400" />
          Script d'appel
        </h3>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Instructions systeme (personnalite)</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Tu es un assistant commercial professionnel de [entreprise]. Tu appelles pour proposer un rendez-vous..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Premier message</label>
          <textarea
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            rows={2}
            placeholder="Bonjour {prenom}, c'est [entreprise]. Je me permets de vous appeler suite a..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Calling hours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          Plages horaires
        </h3>
        <div className="space-y-2">
          {callingHours.map((hour, i) => (
            <div key={hour.day} className="flex items-center gap-3">
              <label className="flex items-center gap-2 w-28">
                <input
                  type="checkbox"
                  checked={hour.enabled}
                  onChange={(e) => {
                    const updated = [...callingHours]
                    updated[i] = { ...updated[i], enabled: e.target.checked }
                    setCallingHours(updated)
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{hour.day}</span>
              </label>
              {hour.enabled && (
                <div className="flex items-center gap-1 text-sm">
                  <input
                    type="time"
                    value={hour.start}
                    onChange={(e) => {
                      const updated = [...callingHours]
                      updated[i] = { ...updated[i], start: e.target.value }
                      setCallingHours(updated)
                    }}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={hour.end}
                    onChange={(e) => {
                      const updated = [...callingHours]
                      updated[i] = { ...updated[i], end: e.target.value }
                      setCallingHours(updated)
                    }}
                    className="border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="text-sm text-gray-600">Max appels/jour :</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxCallsPerDay}
            onChange={(e) => setMaxCallsPerDay(parseInt(e.target.value) || 20)}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Sauvegarder la configuration
      </button>
    </div>
  )
}
