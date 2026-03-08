import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

const ROLE_LABELS = {
  DG: 'Directeur General',
  DAF: 'Directeur Financier',
  COMEX_COMMERCIAL: 'Directeur Commercial',
  CMO: 'Directeur Marketing',
  DSI: 'Directeur Technique',
  DRH: 'DRH',
  dirigeant: 'Dirigeant'
}

const ROLE_COLORS = {
  DG: 'bg-blue-100 text-blue-700',
  DAF: 'bg-green-100 text-green-700',
  COMEX_COMMERCIAL: 'bg-purple-100 text-purple-700',
  CMO: 'bg-orange-100 text-orange-700',
  DSI: 'bg-cyan-100 text-cyan-700',
  DRH: 'bg-pink-100 text-pink-700',
  dirigeant: 'bg-gray-100 text-gray-700'
}

export default function ABMPanel({ leadId, abmData, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [sendingIndex, setSendingIndex] = useState(null)

  async function handleIdentify() {
    setLoading(true)
    try {
      const fn = httpsCallable(getFunctions(), 'identifyAndContactDecisionMakers')
      await fn({ leadId })
      onRefresh?.()
    } catch (err) {
      console.error('ABM identify error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(contactIndex, channel) {
    setSendingIndex(contactIndex)
    try {
      const fn = httpsCallable(getFunctions(), 'launchABMCampaign')
      await fn({ leadId, contactIndex, channel })
      onRefresh?.()
    } catch (err) {
      console.error('ABM send error:', err)
    } finally {
      setSendingIndex(null)
    }
  }

  if (!abmData) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h3 className="text-sm font-bold text-indigo-700 mb-2">ABM Multi-decideurs</h3>
        <p className="text-xs text-indigo-600 mb-3">Identifie automatiquement les decideurs cles de cette entreprise</p>
        <button
          onClick={handleIdentify}
          disabled={loading}
          className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50"
        >
          {loading ? 'Analyse en cours...' : 'Identifier les decideurs'}
        </button>
      </div>
    )
  }

  const { contacts, abmStrategy } = abmData

  if (!contacts || contacts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500">Aucun decideur identifie pour cette entreprise</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Decideurs identifies ({contacts.length})</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          abmStrategy === 'multi_thread' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {abmStrategy === 'multi_thread' ? 'Multi-thread' : 'Single-thread'}
        </span>
      </div>

      <div className="space-y-3">
        {contacts.map((contact, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{contact.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[contact.role] || ROLE_COLORS.dirigeant}`}>
                  {ROLE_LABELS[contact.role] || contact.role}
                </span>
              </div>
              <span className="text-xs text-gray-400">{contact.source}</span>
            </div>

            {contact.messages?.whatsapp && (
              <div className="bg-green-50 rounded-lg p-2 mb-2">
                <p className="text-xs text-gray-500 font-medium mb-1">Message WhatsApp :</p>
                <p className="text-xs text-gray-700 italic">{contact.messages.whatsapp}</p>
              </div>
            )}

            {contact.messages?.email && (
              <div className="bg-blue-50 rounded-lg p-2 mb-2">
                <p className="text-xs text-gray-500 font-medium mb-1">Message Email :</p>
                <p className="text-xs text-gray-700 italic">{contact.messages.email.slice(0, 150)}...</p>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleSend(i, 'whatsapp')}
                disabled={sendingIndex === i}
                className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 font-semibold disabled:opacity-50"
              >
                {sendingIndex === i ? '...' : 'WhatsApp'}
              </button>
              <button
                onClick={() => handleSend(i, 'email')}
                disabled={sendingIndex === i}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 font-semibold disabled:opacity-50"
              >
                {sendingIndex === i ? '...' : 'Email'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
