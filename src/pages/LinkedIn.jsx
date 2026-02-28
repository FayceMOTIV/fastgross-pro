/**
 * LinkedIn — Page LinkedIn automation (comptes, campagnes, inbox)
 */

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Linkedin,
  Users,
  Send,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Plus,
  Play,
  Search,
  Settings,
  UserCheck,
  Zap,
  Loader2,
} from 'lucide-react'
import useLinkedIn from '../hooks/useLinkedIn'
import { useOrg } from '../contexts/OrgContext'
import LinkedInAccountCard from '../components/linkedin/LinkedInAccountCard'
import LinkedInCampaignCard from '../components/linkedin/LinkedInCampaignCard'
import LinkedInInboxItem from '../components/linkedin/LinkedInInboxItem'

export default function LinkedIn() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const {
    accounts,
    campaigns,
    inbox,
    stats,
    loading,
    addAccount,
    removeAccount,
    createCampaign,
    pauseCampaign,
    resumeCampaign,
    syncInbox,
    markAsRead,
    sendConnectionRequest,
    sendMessage,
    runHunt,
    refreshStats,
  } = useLinkedIn(orgId)

  const [activeTab, setActiveTab] = useState('accounts')
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showCreateCampaign, setShowCreateCampaign] = useState(false)
  const [newAccountUrl, setNewAccountUrl] = useState('')
  const [newAccountApiKey, setNewAccountApiKey] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)

  // New campaign form
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignMessage, setNewCampaignMessage] = useState('')
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [hunting, setHunting] = useState(false)

  const handleAddAccount = async () => {
    if (!newAccountUrl.trim()) {
      toast.error('URL du profil requise')
      return
    }
    setAddingAccount(true)
    try {
      await addAccount({ profileUrl: newAccountUrl, apiKey: newAccountApiKey })
      toast.success('Compte ajoute')
      setNewAccountUrl('')
      setNewAccountApiKey('')
      setShowAddAccount(false)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'ajout')
    } finally {
      setAddingAccount(false)
    }
  }

  const handleRemoveAccount = async (accountId) => {
    try {
      await removeAccount(accountId)
      toast.success('Compte supprime')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la suppression')
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      toast.error('Nom de campagne requis')
      return
    }
    setCreatingCampaign(true)
    try {
      await createCampaign({
        name: newCampaignName,
        message: newCampaignMessage,
      })
      toast.success('Campagne creee')
      setNewCampaignName('')
      setNewCampaignMessage('')
      setShowCreateCampaign(false)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la creation')
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleSyncInbox = async () => {
    setSyncing(true)
    try {
      await syncInbox()
      toast.success('Inbox synchronisee')
    } catch (err) {
      toast.error(err.message || 'Erreur de sync')
    } finally {
      setSyncing(false)
    }
  }

  const handleRunHunt = async () => {
    setHunting(true)
    try {
      await runHunt({ keywords: 'CEO', location: 'France', limit: 50 })
      toast.success('Hunt lance')
    } catch (err) {
      toast.error(err.message || 'Erreur hunt')
    } finally {
      setHunting(false)
    }
  }

  const handleReply = (message) => {
    toast.success(`Reponse a ${message.prospectName} (a implementer)`)
  }

  const unreadCount = inbox.filter((m) => m.status === 'unread').length

  const tabs = [
    { id: 'accounts', label: 'Comptes', count: accounts.length },
    { id: 'campaigns', label: 'Campagnes', count: campaigns.length },
    { id: 'inbox', label: 'Inbox', count: unreadCount },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Linkedin className="w-8 h-8 text-blue-600" />
              LinkedIn Automation
            </h1>
            <p className="text-gray-500 mt-1">
              Comptes HeyReach, campagnes et inbox LinkedIn
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunHunt}
              disabled={hunting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
            >
              {hunting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Lancer Hunt
            </button>
            <button
              onClick={refreshStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts || accounts.length}</p>
            <p className="text-sm text-gray-500">Comptes</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSent || 0}</p>
            <p className="text-sm text-gray-500">Envoyes</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalConnected || 0}</p>
            <p className="text-sm text-gray-500">Connectes</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalReplies || 0}</p>
            <p className="text-sm text-gray-500">Reponses</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.replyRate || 0}%</p>
            <p className="text-sm text-gray-500">Taux reponse</p>
          </div>
        </div>

        {/* Tabs Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Buttons */}
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* ========== ACCOUNTS TAB ========== */}
            {activeTab === 'accounts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Comptes LinkedIn</h2>
                  <button
                    onClick={() => setShowAddAccount(!showAddAccount)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un compte
                  </button>
                </div>

                {/* Add Account Form */}
                {showAddAccount && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Nouveau compte HeyReach
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">URL Profil LinkedIn</label>
                        <input
                          type="text"
                          value={newAccountUrl}
                          onChange={(e) => setNewAccountUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">API Key HeyReach</label>
                        <input
                          type="password"
                          value={newAccountApiKey}
                          onChange={(e) => setNewAccountApiKey(e.target.value)}
                          placeholder="Cle API..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddAccount}
                        disabled={addingAccount}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        {addingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
                        Ajouter
                      </button>
                      <button
                        onClick={() => setShowAddAccount(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Account Cards Grid */}
                {accounts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun compte LinkedIn configure</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ajoutez un compte HeyReach pour commencer
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map((account) => (
                      <LinkedInAccountCard
                        key={account.id}
                        account={account}
                        onRemove={handleRemoveAccount}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== CAMPAIGNS TAB ========== */}
            {activeTab === 'campaigns' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Campagnes</h2>
                  <button
                    onClick={() => setShowCreateCampaign(!showCreateCampaign)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle campagne
                  </button>
                </div>

                {/* Create Campaign Form */}
                {showCreateCampaign && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Nouvelle campagne HeyReach
                    </h3>
                    <div className="space-y-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Nom de la campagne</label>
                        <input
                          type="text"
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                          placeholder="Ex: Campagne CEOs SaaS France"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Message de connexion</label>
                        <textarea
                          value={newCampaignMessage}
                          onChange={(e) => setNewCampaignMessage(e.target.value)}
                          rows={3}
                          placeholder="Bonjour {firstName}, j'aimerais echanger avec vous..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateCampaign}
                        disabled={creatingCampaign}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        {creatingCampaign && <Loader2 className="w-4 h-4 animate-spin" />}
                        Creer
                      </button>
                      <button
                        onClick={() => setShowCreateCampaign(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {/* Campaign Cards Grid */}
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucune campagne</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Creez votre premiere campagne LinkedIn
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaigns.map((campaign) => (
                      <LinkedInCampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        onPause={pauseCampaign}
                        onResume={resumeCampaign}
                        onGetStats={() =>
                          toast.success(`Stats campagne ${campaign.name} (a implementer)`)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== INBOX TAB ========== */}
            {activeTab === 'inbox' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Inbox
                    {unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {unreadCount} non lus
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={handleSyncInbox}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium disabled:opacity-50"
                  >
                    {syncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Synchroniser
                  </button>
                </div>

                {/* Inbox Messages */}
                {inbox.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun message</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Synchronisez votre inbox HeyReach
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inbox.map((message) => (
                      <LinkedInInboxItem
                        key={message.id}
                        message={message}
                        onMarkAsRead={markAsRead}
                        onReply={handleReply}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
