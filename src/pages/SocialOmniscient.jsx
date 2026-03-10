import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, query, where, orderBy, limit, doc
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import SignalFeedLive from '@/components/social/SignalFeedLive'
import SourceStatusGrid from '@/components/social/SourceStatusGrid'
import OAuthConnector from '@/components/social/OAuthConnector'
import SocialLeadCard from '@/components/social/SocialLeadCard'
import SocialStatsBar from '@/components/social/SocialStatsBar'
import SourceConfigModal from '@/components/social/SourceConfigModal'

export default function SocialOmniscient() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const [activeTab, setActiveTab] = useState('feed')
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState([])
  const [signals, setSignals] = useState([])
  const [orgConfig, setOrgConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showConfigModal, setShowConfigModal] = useState(false)

  // Listen to org config
  useEffect(() => {
    if (!orgId) return
    return onSnapshot(doc(db, 'organizations', orgId), snap => {
      setOrgConfig(snap.data()?.socialOmniscient || {})
      setLoading(false)
    })
  }, [orgId])

  // Listen to leads
  useEffect(() => {
    if (!orgId) return
    const q = query(
      collection(db, 'socialLeads'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    return onSnapshot(q, snap => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [orgId])

  // Listen to signals
  useEffect(() => {
    if (!orgId) return
    const q = query(
      collection(db, 'socialSignals'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    return onSnapshot(q, snap => setSignals(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [orgId])

  // Fetch stats
  useEffect(() => {
    if (!orgId) return
    httpsCallable(functions, 'getSocialStats')({ orgId, period: 7 })
      .then(r => setStats(r.data))
      .catch(console.error)
  }, [orgId])

  const isEnabled = orgConfig?.enabled !== false
  const plan = orgConfig?.plan || 'radar'

  const PLAN_BADGE = {
    radar:      'text-blue-400 bg-blue-400/10 border-blue-400/20',
    hunter:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
    omniscient: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    war_room:   'text-red-400 bg-red-400/10 border-red-400/20',
  }

  const connectedCount = Object.values(orgConfig?.connectedPlatforms || {})
    .filter(p => p.connected).length

  const activeLeads = leads.filter(l =>
    ['pending_first_action', 'first_action_done', 'new'].includes(l.status)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-indigo-500/60 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-indigo-500" />
          </div>
          <p className="text-gray-400 text-sm">Initialisation du radar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header sticky */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex items-center justify-center">
                {isEnabled && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-1 rounded-full bg-indigo-500/20 animate-pulse" />
                  </>
                )}
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm ${isEnabled ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                  📡
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Alex Social Omniscient</h1>
                <p className="text-xs text-gray-400">50 sources &bull; veille toutes les 2h</p>
              </div>
              <span className={`ml-2 text-xs px-2 py-1 rounded-full border font-medium uppercase tracking-wide ${PLAN_BADGE[plan] || PLAN_BADGE.radar}`}>
                {plan}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {signals.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {signals.length} signaux
                </div>
              )}
              <button
                onClick={() => setShowConfigModal(true)}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                Configurer
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'feed', label: 'Flux live', count: activeLeads.length },
              { id: 'sources', label: '50 Sources', count: null },
              { id: 'connect', label: 'Connexions', count: connectedCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && <SocialStatsBar stats={stats} />}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Onboarding banner */}
        {!orgConfig?.keywords?.length && !orgConfig?.facebookGroups?.length && (
          <div className="mb-6 p-6 rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center text-2xl">🎯</div>
              <div>
                <h3 className="font-medium text-white">Demarrez la veille en 2 minutes</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  Ajoutez des mots-cles et des zones geographiques. BODACC, Telegram et RSS sont deja actifs.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Configurer
            </button>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-medium text-gray-300">Leads a traiter</h2>
                <span className="text-xs text-gray-500">{activeLeads.length} en attente</span>
              </div>
              {activeLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-4xl mb-3">📡</div>
                  <h3 className="font-medium text-gray-300">Radar actif, en ecoute</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-xs">
                    Les leads chauds (score &ge; 70) apparaitront ici des detection.
                  </p>
                </div>
              ) : (
                activeLeads.map(lead => (
                  <SocialLeadCard key={lead.id} lead={lead} orgId={orgId} />
                ))
              )}
            </div>
            <div>
              <SignalFeedLive signals={signals} />
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <SourceStatusGrid signals={signals} config={orgConfig} plan={plan} />
        )}

        {activeTab === 'connect' && (
          <OAuthConnector
            orgId={orgId}
            connectedPlatforms={orgConfig?.connectedPlatforms || {}}
          />
        )}
      </div>

      {showConfigModal && (
        <SourceConfigModal orgId={orgId} config={orgConfig} onClose={() => setShowConfigModal(false)} />
      )}
    </div>
  )
}
