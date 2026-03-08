import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function VoiceCallButton({ leadId, phone, firstName, disabled }) {
  const [status, setStatus] = useState('idle')

  async function handleCall() {
    if (!phone) return
    setStatus('calling')
    try {
      const fn = httpsCallable(getFunctions(), 'initiateVoiceCall')
      await fn({ leadId })
      setStatus('success')
      setTimeout(() => setStatus('idle'), 5000)
    } catch (err) {
      console.error('Voice call error:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const states = {
    idle: { label: 'Appel IA', cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
    calling: { label: 'En cours...', cls: 'bg-orange-300 text-white cursor-wait' },
    success: { label: 'Appel lance', cls: 'bg-green-500 text-white' },
    error: { label: 'Erreur', cls: 'bg-red-500 text-white' }
  }

  const s = states[status]

  return (
    <button
      onClick={handleCall}
      disabled={disabled || status === 'calling' || !phone}
      title={!phone ? 'Numero de telephone requis' : `Appeler ${firstName} via IA`}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${s.cls} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {s.label}
    </button>
  )
}
