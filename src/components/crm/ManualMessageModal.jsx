import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Mail, MessageSquare, Phone, Loader2 } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'

const channels = [
  { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-emerald-600 bg-emerald-50' },
]

export default function ManualMessageModal({ prospect, onClose, onSent }) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: sendManual, loading } = useCloudFunction('sendManualMessage')

  const [channel, setChannel] = useState('email')
  const [content, setContent] = useState('')

  const handleSend = async () => {
    if (!content.trim()) {
      toast.error('Le message ne peut pas etre vide')
      return
    }

    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1000))
      } else {
        await sendManual({
          orgId: currentOrg.id,
          prospectId: prospect.id,
          channel,
          content: content.trim(),
        })
      }
      toast.success(`Message ${channel} envoye a ${prospect.name}`)
      onSent?.()
      onClose()
    } catch (error) {
      toast.error('Erreur: ' + (error?.message || 'Echec envoi'))
    }
  }

  return (
    <div className="fixed inset-0 bg-text/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-display font-bold text-text">
            Message a {prospect.name}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Channel selection */}
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase mb-2 block">
              Canal
            </label>
            <div className="flex gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    channel === ch.id
                      ? 'bg-accent/10 text-accent ring-2 ring-accent'
                      : 'bg-gray-50 text-text-muted hover:bg-gray-100'
                  }`}
                >
                  <ch.icon className="w-4 h-4" />
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-text-muted uppercase mb-2 block">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Ecrivez votre message ${channel}...`}
              rows={5}
              className="input-field w-full resize-none text-sm"
            />
            <p className="text-xs text-text-muted mt-1">{content.length} caracteres</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="btn-ghost text-sm">
            Annuler
          </button>
          <button
            onClick={handleSend}
            disabled={!content.trim() || loading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
        </div>
      </motion.div>
    </div>
  )
}
