/**
 * SocialOutreach - Page unifiee Instagram DM + WhatsApp + Sourcing + Reponses
 *
 * 4 tabs :
 * - Instagram DM : comptes IG, campagne active, envois, stats
 * - WhatsApp : stats WA, prospects, envoi manuel
 * - Sourcing : config hashtags, scan manuel, derniers prospects
 * - Reponses : liste unifiee IG + WA replies
 */

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Send,
  Instagram,
  MessageCircle,
  Search as SearchIcon,
  RefreshCw,
  Users,
  TrendingUp,
  Zap,
  Clock,
  Plus,
  EyeOff,
  Eye,
  BarChart3,
  Inbox,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Hash,
  Play,
  Target,
  ArrowUpRight,
  Sparkles,
  Shield,
  Rocket,
  Mail,
  Phone,
  ExternalLink,
} from 'lucide-react'
import useSocialOutreach from '@/hooks/useSocialOutreach'
import SocialStatsCard from '@/components/social/SocialStatsCard'
import AccountCard from '@/components/social/AccountCard'
import ProspectTable from '@/components/social/ProspectTable'
import CampaignWizard from '@/components/social/CampaignWizard'

const tabs = [
  { id: 'instagram', label: 'Instagram DM', icon: Instagram },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'sourcing', label: 'Sourcing', icon: SearchIcon },
  { id: 'replies', label: 'Reponses', icon: Inbox },
]

const sentimentColors = {
  positive: 'text-green-600 bg-green-50',
  neutral: 'text-gray-600 bg-gray-50',
  negative: 'text-red-600 bg-red-50',
}

const replyStatusConfig = {
  unread: { label: 'Non lu', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  read: { label: 'Lu', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  in_progress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  converted: { label: 'Converti', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
}

export default function SocialOutreach() {
  const [activeTab, setActiveTab] = useState('instagram')
  const [showWizard, setShowWizard] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [addingAccount, setAddingAccount] = useState(false)
  const [togglingAccount, setTogglingAccount] = useState(null)
  const [removingAccount, setRemovingAccount] = useState(null)
  const [replyFilter, setReplyFilter] = useState('all')
  const [sourcingPlatform, setSourcingPlatform] = useState('instagram')
  const [sourcingHashtag, setSourcingHashtag] = useState('')

  const {
    orgId,
    accounts,
    igStats,
    waStats,
    sourcingStats,
    prospects,
    replies,
    unreadCount,
    sendInstagramDM,
    sendWhatsApp,
    runHunt,
    runAdvancedScrape,
    sendingDM,
    sendingWA,
    runningHunt,
    loading,
    refreshAll,
  } = useSocialOutreach()

  // Add Instagram account
  const handleAddAccount = useCallback(async () => {
    if (!newAccount.username || !newAccount.password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setAddingAccount(true)
    const toastId = toast.loading('Connexion au compte Instagram...')

    try {
      await accounts.addAccount(newAccount.username, newAccount.password)
      toast.success('Compte ajoute avec succes', { id: toastId })
      setShowAddAccount(false)
      setNewAccount({ username: '', password: '' })
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    } finally {
      setAddingAccount(false)
    }
  }, [newAccount, accounts])

  // Toggle account status
  const handleToggleStatus = useCallback(async (accountId, currentStatus) => {
    setTogglingAccount(accountId)
    const newStatus = currentStatus === 'active' ? 'Mise en pause' : 'Activation'
    const toastId = toast.loading(`${newStatus}...`)

    try {
      await accounts.toggleStatus(accountId, currentStatus)
      toast.success(currentStatus === 'active' ? 'Compte mis en pause' : 'Compte active', { id: toastId })
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    } finally {
      setTogglingAccount(null)
    }
  }, [accounts])

  // Remove account
  const handleRemoveAccount = useCallback(async (accountId, username) => {
    if (!confirm(`Supprimer le compte @${username} ?`)) return

    setRemovingAccount(accountId)
    const toastId = toast.loading('Suppression...')

    try {
      await accounts.removeAccount(accountId)
      toast.success('Compte supprime', { id: toastId })
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    } finally {
      setRemovingAccount(null)
    }
  }, [accounts])

  // Send DM
  const handleSendDM = useCallback(async (prospectId) => {
    const toastId = toast.loading('Envoi du DM Instagram...')
    try {
      await sendInstagramDM(prospectId)
      toast.success('DM envoye avec succes', { id: toastId })
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    }
  }, [sendInstagramDM])

  // Send WhatsApp
  const handleSendWhatsApp = useCallback(async (phone, message, prospectId) => {
    const toastId = toast.loading('Envoi WhatsApp...')
    try {
      await sendWhatsApp(phone, message, prospectId)
      toast.success('Message WhatsApp envoye', { id: toastId })
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    }
  }, [sendWhatsApp])

  // Run manual hunt
  const handleRunHunt = useCallback(async (platform) => {
    const toastId = toast.loading(`Scan ${platform} en cours...`)
    try {
      const config = sourcingHashtag ? { hashtag: sourcingHashtag } : {}
      const result = await runHunt(platform, config)
      toast.success(result?.message || `Scan termine : ${result?.found || 0} prospects trouves`, { id: toastId })
    } catch (err) {
      toast.error(`Echec du scan: ${err.message}`, { id: toastId })
    }
  }, [runHunt, sourcingHashtag])

  // Launch campaign from wizard
  const handleLaunchCampaign = useCallback(async (campaignConfig) => {
    const toastId = toast.loading('Lancement de la campagne...')
    try {
      // Use runHunt for the first channel
      const platform = campaignConfig.channels?.instagram ? 'instagram' : 'whatsapp'
      await runHunt(platform, campaignConfig)
      toast.success('Campagne lancee avec succes', { id: toastId })
      setShowWizard(false)
    } catch (err) {
      toast.error(`Echec: ${err.message}`, { id: toastId })
    }
  }, [runHunt])

  // Refresh all
  const handleRefresh = useCallback(async () => {
    const toastId = toast.loading('Actualisation...')
    try {
      await refreshAll()
      toast.success('Donnees actualisees', { id: toastId })
    } catch (err) {
      toast.dismiss(toastId)
    }
  }, [refreshAll])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = dateStr.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 3600000) return `il y a ${Math.round(diff / 60000)}min`
    if (diff < 86400000) return `il y a ${Math.round(diff / 3600000)}h`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const formatNextExecution = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  // Filter prospects by tab context
  const instagramProspects = prospects.filter(p => p.platform === 'instagram')
  const whatsappProspects = prospects.filter(p => p.whatsappActive || p.phone)
  const filteredReplies = replyFilter === 'all'
    ? replies
    : replies.filter(r => r.channel === replyFilter)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Send className="w-8 h-8 text-indigo-600" />
              Social Outreach
            </h1>
            <p className="text-gray-500 mt-1">
              Cold DM Instagram + WhatsApp automatises
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition"
            >
              <Rocket className="w-4 h-4" />
              Nouvelle campagne
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'replies' && unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* ============================================ */}
            {/* TAB: Instagram DM */}
            {/* ============================================ */}
            {activeTab === 'instagram' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SocialStatsCard
                    icon={Send}
                    label="DMs aujourd'hui"
                    value={igStats?.sentToday || 0}
                    color="pink"
                    subtitle={`${igStats?.sentThisWeek || 0} cette semaine`}
                  />
                  <SocialStatsCard
                    icon={TrendingUp}
                    label="Taux de reponse"
                    value={`${igStats?.responseRate || 0}%`}
                    color="green"
                    subtitle={`${igStats?.repliedCount || 0} reponses`}
                  />
                  <SocialStatsCard
                    icon={Users}
                    label="Comptes actifs"
                    value={`${accounts.activeCount}/${accounts.accounts.length}`}
                    color="indigo"
                    subtitle={`${accounts.totalDailySent}/${accounts.totalDailyCapacity} DMs`}
                  />
                  <SocialStatsCard
                    icon={Clock}
                    label="Prochaine execution"
                    value={formatNextExecution(igStats?.nextExecution)}
                    color="blue"
                    subtitle="Envoi automatique"
                  />
                </div>

                {/* Instagram Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Instagram className="w-5 h-5 text-pink-500" />
                      Comptes Instagram
                    </h2>
                    <button
                      onClick={() => setShowAddAccount(!showAddAccount)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un compte
                    </button>
                  </div>

                  {/* Add Account Form */}
                  {showAddAccount && (
                    <div className="bg-gray-50 rounded-xl border p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm text-gray-600">
                          Identifiants chiffres AES-256 - jamais stockes en clair
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Nom d'utilisateur Instagram"
                          value={newAccount.username}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, username: e.target.value }))}
                          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mot de passe"
                            value={newAccount.password}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={handleAddAccount}
                          disabled={addingAccount}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                          {addingAccount ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Connecter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Account Cards */}
                  {accounts.accounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Instagram className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Aucun compte Instagram connecte</p>
                      <p className="text-sm mt-1">Ajoutez un compte pour commencer l'envoi de DMs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accounts.accounts.map((account) => (
                        <AccountCard
                          key={account.id}
                          account={account}
                          onToggleStatus={handleToggleStatus}
                          onRemove={handleRemoveAccount}
                          toggling={togglingAccount}
                          removing={removingAccount}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Instagram Prospects Table */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" />
                    Prospects Instagram ({instagramProspects.length})
                  </h2>
                  <ProspectTable
                    prospects={instagramProspects}
                    onSendDM={handleSendDM}
                    onSendWhatsApp={handleSendWhatsApp}
                    sendingDM={sendingDM}
                    sendingWA={sendingWA}
                  />
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* TAB: WhatsApp */}
            {/* ============================================ */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SocialStatsCard
                    icon={MessageCircle}
                    label="Envoyes aujourd'hui"
                    value={waStats?.sentToday || 0}
                    color="emerald"
                    subtitle={`${waStats?.sentThisWeek || 0} cette semaine`}
                  />
                  <SocialStatsCard
                    icon={TrendingUp}
                    label="Taux de reponse"
                    value={`${waStats?.responseRate || 0}%`}
                    color="green"
                    subtitle={`${waStats?.repliedCount || 0} reponses`}
                  />
                  <SocialStatsCard
                    icon={Zap}
                    label="Instance API"
                    value={waStats?.instanceHealthy ? 'Active' : 'Inactive'}
                    color={waStats?.instanceHealthy ? 'green' : 'orange'}
                    subtitle="Evolution API"
                  />
                  <SocialStatsCard
                    icon={Clock}
                    label="Prochaine execution"
                    value={formatNextExecution(waStats?.nextExecution)}
                    color="blue"
                    subtitle="Envoi automatique"
                  />
                </div>

                {/* WhatsApp Anti-ban Info */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-emerald-900">Protections anti-ban actives</p>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-emerald-700">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Max 10/heure
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Max 50/jour
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Delais gaussiens
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Heures business
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Prospects Table */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    Prospects WhatsApp ({whatsappProspects.length})
                  </h2>
                  <ProspectTable
                    prospects={whatsappProspects}
                    onSendDM={handleSendDM}
                    onSendWhatsApp={handleSendWhatsApp}
                    sendingDM={sendingDM}
                    sendingWA={sendingWA}
                  />
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* TAB: Sourcing */}
            {/* ============================================ */}
            {activeTab === 'sourcing' && (
              <div className="space-y-6">
                {/* Sourcing Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sourcingStats && (
                    <>
                      <SocialStatsCard
                        icon={Instagram}
                        label="Instagram"
                        value={sourcingStats.instagram?.saved || 0}
                        color="pink"
                        subtitle={`${sourcingStats.instagram?.scanned || 0} scannes, ${sourcingStats.instagram?.qualified || 0} qualifies`}
                      />
                      <SocialStatsCard
                        icon={BarChart3}
                        label="TikTok"
                        value={sourcingStats.tiktok?.saved || 0}
                        color="purple"
                        subtitle={`${sourcingStats.tiktok?.scanned || 0} scannes, ${sourcingStats.tiktok?.qualified || 0} qualifies`}
                      />
                      <SocialStatsCard
                        icon={Users}
                        label="Facebook"
                        value={sourcingStats.facebook?.saved || 0}
                        color="blue"
                        subtitle={`${sourcingStats.facebook?.scanned || 0} scannes, ${sourcingStats.facebook?.qualified || 0} qualifies`}
                      />
                    </>
                  )}
                </div>

                {/* Quick Hunt */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Scan rapide
                  </h3>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Platform selector */}
                    <div className="flex gap-2">
                      {['instagram', 'tiktok', 'facebook'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setSourcingPlatform(p)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                            sourcingPlatform === p
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p === 'instagram' ? 'Instagram' : p === 'tiktok' ? 'TikTok' : 'Facebook'}
                        </button>
                      ))}
                    </div>

                    {/* Hashtag input */}
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={sourcingPlatform === 'facebook' ? 'Mot-cle...' : 'Hashtag...'}
                        value={sourcingHashtag}
                        onChange={(e) => setSourcingHashtag(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Launch button */}
                    <button
                      onClick={() => handleRunHunt(sourcingPlatform)}
                      disabled={runningHunt !== null}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {runningHunt === sourcingPlatform ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Lancer le scan
                    </button>
                  </div>
                </div>

                {/* Advanced Scraping */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Scraping avance Instagram
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Scrapez les followers, likers ou commenteurs de comptes/posts specifiques
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        const target = prompt('Nom du compte Instagram cible :')
                        if (target) runAdvancedScrape('followers', target)
                      }}
                      disabled={runningHunt !== null}
                      className="flex items-center gap-2 px-4 py-3 bg-pink-50 text-pink-700 rounded-lg hover:bg-pink-100 transition disabled:opacity-50"
                    >
                      <Users className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Scraper Followers</p>
                        <p className="text-xs opacity-70">D'un compte cible</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const target = prompt('URL du post Instagram :')
                        if (target) runAdvancedScrape('likers', target)
                      }}
                      disabled={runningHunt !== null}
                      className="flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Scraper Likers</p>
                        <p className="text-xs opacity-70">D'un post specifique</p>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        const target = prompt('URL du post Instagram :')
                        if (target) runAdvancedScrape('commenters', target)
                      }}
                      disabled={runningHunt !== null}
                      className="flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <div className="text-left">
                        <p className="font-medium text-sm">Scraper Commenteurs</p>
                        <p className="text-xs opacity-70">D'un post specifique</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* All Prospects Table */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" />
                    Tous les prospects ({prospects.length})
                  </h2>
                  <ProspectTable
                    prospects={prospects}
                    onSendDM={handleSendDM}
                    onSendWhatsApp={handleSendWhatsApp}
                    sendingDM={sendingDM}
                    sendingWA={sendingWA}
                  />
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* TAB: Reponses */}
            {/* ============================================ */}
            {activeTab === 'replies' && (
              <div className="space-y-6">
                {/* Reply Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SocialStatsCard
                    icon={Inbox}
                    label="Total reponses"
                    value={replies.length}
                    color="indigo"
                  />
                  <SocialStatsCard
                    icon={AlertTriangle}
                    label="Non lues"
                    value={unreadCount}
                    color="rose"
                  />
                  <SocialStatsCard
                    icon={Instagram}
                    label="Instagram"
                    value={replies.filter(r => r.channel === 'instagram').length}
                    color="pink"
                  />
                  <SocialStatsCard
                    icon={MessageCircle}
                    label="WhatsApp"
                    value={replies.filter(r => r.channel === 'whatsapp').length}
                    color="emerald"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Toutes' },
                    { value: 'instagram', label: 'Instagram' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setReplyFilter(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        replyFilter === opt.value
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Replies List */}
                {filteredReplies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Aucune reponse</p>
                    <p className="text-sm mt-1">Les reponses a vos DMs apparaitront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReplies.map((reply) => {
                      const status = replyStatusConfig[reply.status] || replyStatusConfig.unread
                      const sentimentClass = sentimentColors[reply.sentiment] || sentimentColors.neutral

                      return (
                        <div
                          key={reply.id}
                          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition ${
                            reply.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                reply.channel === 'instagram'
                                  ? 'bg-gradient-to-br from-pink-500 to-purple-500'
                                  : 'bg-gradient-to-br from-green-500 to-emerald-500'
                              }`}>
                                {(reply.prospectName || reply.prospectUsername || '?')[0].toUpperCase()}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-gray-900">{reply.prospectName || reply.prospectUsername}</p>
                                  <span className="text-sm text-gray-400">@{reply.prospectUsername}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    reply.channel === 'instagram' ? 'bg-pink-50 text-pink-600' : 'bg-green-50 text-green-600'
                                  }`}>
                                    {reply.channel === 'instagram' ? 'IG' : 'WA'}
                                  </span>
                                  {reply.sentiment && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sentimentClass}`}>
                                      {reply.sentiment === 'positive' ? 'Positif' : reply.sentiment === 'negative' ? 'Negatif' : 'Neutre'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 mt-1">{reply.message}</p>
                                <p className="text-xs text-gray-400 mt-1.5">{formatDate(reply.receivedAt)}</p>
                              </div>
                            </div>

                            {/* Status + Actions */}
                            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                {status.label}
                              </span>
                              {reply.channel === 'instagram' && reply.prospectUsername && (
                                <a
                                  href={`https://instagram.com/${reply.prospectUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-400 hover:text-gray-600 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Wizard Modal */}
      {showWizard && (
        <CampaignWizard
          onClose={() => setShowWizard(false)}
          onLaunch={handleLaunchCampaign}
        />
      )}
    </div>
  )
}
