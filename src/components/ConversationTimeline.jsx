/**
 * ConversationTimeline — Timeline messages in/out avec bulles
 * Affiche l'historique complet d'un prospect avec direction et canal
 */

import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { MessageSquare, Bot, User, Mail, Phone, Send, Loader2 } from 'lucide-react'

const CHANNEL_ICONS = {
  whatsapp: '💬',
  email: '📧',
  sms: '📱',
  instagram: '📸',
  linkedin: '💼',
  voicemail: '🎙️',
  postal: '📮',
}

const CHANNEL_COLORS = {
  whatsapp: 'bg-green-50 border-green-200',
  email: 'bg-blue-50 border-blue-200',
  sms: 'bg-amber-50 border-amber-200',
  instagram: 'bg-pink-50 border-pink-200',
  linkedin: 'bg-indigo-50 border-indigo-200',
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MessageBubble({ interaction }) {
  const isInbound = interaction.direction === 'in'
  const channelIcon = CHANNEL_ICONS[interaction.channel] || '💬'
  const channelColor = CHANNEL_COLORS[interaction.channel] || 'bg-gray-50 border-gray-200'

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 border ${
          isInbound
            ? `${channelColor}`
            : 'bg-indigo-50 border-indigo-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          {isInbound ? (
            <User className="w-3.5 h-3.5 text-gray-500" />
          ) : (
            <Bot className="w-3.5 h-3.5 text-indigo-500" />
          )}
          <span className="text-xs font-medium text-gray-500">
            {isInbound ? 'Prospect' : interaction.source === 'manual' ? 'Vous' : 'Alex'}
          </span>
          <span className="text-xs">{channelIcon}</span>
          {interaction.score && (
            <span className="text-xs text-gray-400">Score: {interaction.score}</span>
          )}
        </div>

        <p className="text-sm text-gray-800 whitespace-pre-wrap">
          {interaction.message || interaction.content || '(message vide)'}
        </p>

        <div className="flex items-center justify-end gap-2 mt-1.5">
          <span className="text-[10px] text-gray-400">
            {formatTime(interaction.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function ConversationTimeline({ prospectId, className = '' }) {
  const { currentOrg } = useOrg()
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!currentOrg?.id || !prospectId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'interactions'),
      where('prospectId', '==', prospectId),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setInteractions(items)
        setLoading(false)
      },
      (error) => {
        console.error('ConversationTimeline listener error:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, prospectId])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [interactions])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (interactions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-gray-400 ${className}`}>
        <MessageSquare className="w-10 h-10 mb-2" />
        <p className="text-sm">Aucune conversation</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col overflow-y-auto px-2 py-4 ${className}`}>
      {interactions.map((interaction) => (
        <MessageBubble key={interaction.id} interaction={interaction} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
