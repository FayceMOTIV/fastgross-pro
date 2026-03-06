/**
 * HotQueueWidget — Widget Dashboard avec timer + actions pour leads chauds
 */

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import { Flame, Clock, UserCheck, Loader2, Bot } from 'lucide-react'
import toast from 'react-hot-toast'

function CountdownTimer({ expiresAt }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const target = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt)

    const tick = () => {
      const now = new Date()
      const diff = Math.max(0, target - now)
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span className="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      {remaining}
    </span>
  )
}

export default function HotQueueWidget() {
  const { currentOrg } = useOrg()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)

  useEffect(() => {
    if (!currentOrg?.id) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'organizations', currentOrg.id, 'hotQueue'),
      where('status', '==', 'pending'),
      orderBy('addedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error('HotQueue listener error:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [currentOrg?.id])

  const handleClaim = async (item) => {
    setClaiming(item.id)
    try {
      await updateDoc(
        doc(db, 'organizations', currentOrg.id, 'hotQueue', item.id),
        { status: 'claimed', claimedBy: user?.uid, claimedAt: new Date() }
      )
      // Pause Alex
      await updateDoc(
        doc(db, 'organizations', currentOrg.id, 'prospects', item.prospectId),
        { alexPaused: true }
      )
      toast.success(`${item.prospectName} pris en charge`)
    } catch (err) {
      toast.error('Erreur: ' + err.message)
    } finally {
      setClaiming(null)
    }
  }

  const handleLetAlex = async (item) => {
    setClaiming(item.id)
    try {
      await updateDoc(
        doc(db, 'organizations', currentOrg.id, 'hotQueue', item.id),
        { status: 'alex_handled', handledAt: new Date() }
      )
      toast.success('Alex continue automatiquement')
    } catch (err) {
      toast.error('Erreur: ' + err.message)
    } finally {
      setClaiming(null)
    }
  }

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="card p-5 border-l-4 border-l-orange-400">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-orange-500" />
        <h3 className="text-sm font-display font-semibold text-gray-900">
          Leads chauds ({items.length})
        </h3>
        <Clock className="w-4 h-4 text-gray-400 ml-auto" />
      </div>

      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 border border-orange-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.prospectName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.company && (
                  <span className="text-xs text-gray-500 truncate">{item.company}</span>
                )}
                <span className="text-xs font-medium text-orange-600">
                  Score {item.score}
                </span>
              </div>
            </div>

            {item.expiresAt && <CountdownTimer expiresAt={item.expiresAt} />}

            <div className="flex gap-1.5">
              <button
                onClick={() => handleClaim(item)}
                disabled={claiming === item.id}
                className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                title="Prendre en charge"
              >
                {claiming === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleLetAlex(item)}
                disabled={claiming === item.id}
                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
                title="Laisser Alex"
              >
                <Bot className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
