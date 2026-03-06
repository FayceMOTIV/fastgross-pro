/**
 * ManualReplyBox — Textarea + envoi via sendMessage callable
 * Permet au commercial de repondre manuellement a un prospect
 */

import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

const CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'sms', label: 'SMS', icon: '📱' },
]

export default function ManualReplyBox({ prospect, onSent }) {
  const { currentOrg } = useOrg()
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [sending, setSending] = useState(false)

  const getRecipient = () => {
    switch (channel) {
      case 'whatsapp':
      case 'sms':
        return prospect?.phone || ''
      case 'email':
        return prospect?.email || ''
      default:
        return prospect?.phone || ''
    }
  }

  const handleSend = async () => {
    if (!message.trim()) return

    const recipient = getRecipient()
    if (!recipient) {
      toast.error(`Pas de ${channel === 'email' ? 'email' : 'telephone'} pour ce prospect`)
      return
    }

    setSending(true)
    try {
      const sendMessageFn = httpsCallable(functions, 'sendManualMessage')
      await sendMessageFn({
        orgId: currentOrg.id,
        prospectId: prospect.id,
        channel,
        message: message.trim(),
        to: recipient,
        source: 'manual',
      })

      toast.success('Message envoye')
      setMessage('')
      onSent?.()
    } catch (error) {
      console.error('Manual send error:', error)
      toast.error(error.message || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 pt-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500">Reponse manuelle</span>
        <div className="flex gap-1 ml-auto">
          {CHANNEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setChannel(opt.value)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                channel === opt.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ecrire un message (${channel})...`}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="self-end px-3 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-1">
        Cmd+Enter pour envoyer
      </p>
    </div>
  )
}
