import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import toast from 'react-hot-toast'

const DEMO_NOTIFICATIONS = [
  {
    id: '1',
    type: 'high_score',
    message: 'Nouveau lead score 92 — TechSolutions recrute un dev senior',
    leadId: 'demo-1',
    score: 92,
    createdAt: new Date(),
  },
  {
    id: '2',
    type: 'reply',
    message: 'Reponse positive de Marie Dupont (TechCorp)',
    leadId: 'demo-2',
    score: 85,
    createdAt: new Date(Date.now() - 300000),
  },
]

export default function useIntentNotifications() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS)
      setLoading(false)
      return
    }

    if (!currentOrg?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, 'organizations', currentOrg.id, 'prospects')
    const highScoreQuery = query(
      prospectsRef,
      where('score', '>=', 70),
      orderBy('score', 'desc'),
      limit(20)
    )

    const unsubscribe = onSnapshot(
      highScoreQuery,
      (snapshot) => {
        const newNotifs = []

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data()
            const notif = {
              id: change.doc.id,
              type: data.lastReply ? 'reply' : 'high_score',
              message: data.lastReply
                ? `Reponse de ${data.firstName || ''} ${data.lastName || ''} (${data.company || 'N/A'})`
                : `Lead score ${data.score} — ${data.company || 'Entreprise'} ${data.intentSignal || ''}`,
              leadId: change.doc.id,
              score: data.score || 0,
              createdAt: data.updatedAt?.toDate?.() || new Date(),
            }
            newNotifs.push(notif)

            // In-app toast for new high-score leads
            if (change.type === 'added' && data.score >= 80) {
              toast.success(notif.message, { duration: 5000, icon: '\uD83C\uDFAF' })
            }

            // In-app toast for replies
            if (data.lastReply && change.type === 'modified') {
              toast.success(notif.message, { duration: 5000, icon: '\uD83D\uDCE8' })
            }
          }
        })

        setNotifications((prev) => {
          const merged = [...newNotifs]
          prev.forEach((existing) => {
            if (!merged.find((n) => n.id === existing.id)) {
              merged.push(existing)
            }
          })
          return merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50)
        })

        setLoading(false)
      },
      (error) => {
        console.error('Intent notifications listener error:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id, isDemo])

  return { notifications, loading }
}
