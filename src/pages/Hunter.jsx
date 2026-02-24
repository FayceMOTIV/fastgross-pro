import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Target,
  Instagram,
  MessageCircle,
  Search,
  Filter,
  Play,
  RefreshCw,
  Users,
  Mail,
  ExternalLink,
  TrendingUp,
  Flame,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  ChevronRight,
  Settings,
  Hash,
  Globe,
  Zap,
  BarChart3,
  AlertCircle,
  Plus,
  Trash2,
  Power,
  Shield,
  Activity,
  Pause,
  Eye as EyeIcon,
  EyeOff,
} from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'

// TikTok icon component (not in lucide)
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)

// Facebook icon component
const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// Mock data for initial state
const mockStats = {
  instagram: {
    totalScanned: 245,
    totalQualified: 87,
    totalSaved: 62,
    lastRun: new Date().toISOString()
  },
  tiktok: {
    totalScanned: 156,
    totalQualified: 48,
    totalSaved: 35,
    lastRun: new Date().toISOString()
  },
  facebook: {
    totalScanned: 89,
    totalQualified: 34,
    totalSaved: 28,
    lastRun: new Date().toISOString()
  },
  dm: {
    sent: 45,
    failed: 3,
    replied: 12,
    responseRate: 26.7
  }
}

// Mock Instagram accounts for initial state
const mockInstagramAccounts = [
  {
    id: '1',
    username: 'prospection_agency',
    status: 'active',
    dailySent: 18,
    dailyLimit: 30,
    hourlySent: 2,
    hourlyLimit: 4,
    lastActivity: new Date().toISOString(),
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: '2',
    username: 'growth_hunter_fr',
    status: 'active',
    dailySent: 25,
    dailyLimit: 30,
    hourlySent: 3,
    hourlyLimit: 4,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: '3',
    username: 'business_connect_pro',
    status: 'paused',
    dailySent: 0,
    dailyLimit: 30,
    hourlySent: 0,
    hourlyLimit: 4,
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  }
]

const mockProspects = [
  {
    id: '1',
    platform: 'instagram',
    username: 'entrepreneur_paris',
    fullName: 'Marc Entrepreneur',
    bio: 'CEO @startup_tech | Helping founders scale | DM for collabs',
    followers: 15000,
    score: 92,
    status: 'new',
    email: null,
    hashtag: 'entrepreneur',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    platform: 'tiktok',
    username: 'coach_business_fr',
    fullName: 'Sophie Coach',
    bio: 'Business Coach | +2M de CA | contact@sophiecoach.fr | IG: @sophie.coach',
    followers: 45000,
    score: 88,
    status: 'contacted',
    email: 'contact@sophiecoach.fr',
    instagramHandle: 'sophie.coach',
    hashtag: 'business',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    platform: 'instagram',
    username: 'marketing_agency',
    fullName: 'Digital Agency Paris',
    bio: 'Agence Marketing Digital | 50+ clients | Contactez-nous',
    followers: 8500,
    score: 75,
    status: 'replied',
    email: null,
    hashtag: 'marketing',
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: '4',
    platform: 'tiktok',
    username: 'ecom_expert',
    fullName: 'Pierre E-commerce',
    bio: 'E-commerce Expert | Formation: https://pierre-ecom.fr',
    followers: 22000,
    score: 82,
    status: 'new',
    email: null,
    websiteUrl: 'https://pierre-ecom.fr',
    hashtag: 'ecommerce',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '5',
    platform: 'facebook',
    username: 'agence-digitale-paris',
    fullName: 'Agence Digitale Paris',
    bio: 'Agence de marketing digital specialisee en strategie et contenu',
    followers: 3200,
    score: 78,
    status: 'new',
    email: 'contact@agence-digitale-paris.fr',
    phone: '0142360000',
    websiteUrl: 'https://agence-digitale-paris.fr',
    facebookUrl: 'https://facebook.com/agence-digitale-paris',
    keyword: 'agence marketing',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
]

export default function Hunter() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(mockStats)
  const [prospects, setProspects] = useState(mockProspects)
  const [loading, setLoading] = useState(false)
  const [runningHunt, setRunningHunt] = useState(null)
  const [filter, setFilter] = useState({ platform: 'all', status: 'all' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState({
    instagramEnabled: true,
    tiktokEnabled: true,
    facebookEnabled: true,
    instagramHashtags: ['entrepreneur', 'business', 'startup'],
    tiktokHashtags: ['entrepreneur', 'business', 'coaching'],
    facebookKeywords: ['agence marketing', 'agence communication'],
    facebookLocation: 'Paris',
    autoSendDM: false,
    minScore: 70
  })
  const [runningMultiScan, setRunningMultiScan] = useState(false)

  // Instagram multi-account state
  const [instagramAccounts, setInstagramAccounts] = useState(mockInstagramAccounts)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ username: '', password: '' })
  const [addingAccount, setAddingAccount] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const functions = getFunctions()

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Try to load real stats from cloud functions
      // For now, use mock data
      setStats(mockStats)
      setProspects(mockProspects)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const runManualHunt = async (platform, hashtag) => {
    setRunningHunt(platform)
    const toastId = toast.loading(`Scan ${platform} en cours...`)

    try {
      const functionMap = {
        instagram: 'runInstagramHunterManual',
        tiktok: 'runTikTokHunterManual',
        facebook: 'runFacebookHunterManual'
      }

      const functionName = functionMap[platform]
      const huntFunction = httpsCallable(functions, functionName)

      const params = platform === 'facebook'
        ? { orgId: 'default', keyword: hashtag || config.facebookKeywords[0], location: config.facebookLocation }
        : { orgId: 'default', hashtag: hashtag || config[`${platform}Hashtags`][0] }

      const result = await huntFunction(params)

      toast.success(result.data.message, { id: toastId })
      await loadStats()
    } catch (error) {
      console.error('Hunt failed:', error)
      toast.error(`Echec du scan: ${error.message}`, { id: toastId })
    } finally {
      setRunningHunt(null)
    }
  }

  const runMultiPlatformScan = async () => {
    setRunningMultiScan(true)
    const toastId = toast.loading('Scan multi-reseaux en cours...')

    try {
      const campaignFunction = httpsCallable(functions, 'runSocialHuntingCampaign')
      const result = await campaignFunction({
        orgId: 'default',
        config: {
          enableInstagram: config.instagramEnabled,
          enableTiktok: config.tiktokEnabled,
          enableFacebook: config.facebookEnabled,
          instagramHashtag: config.instagramHashtags[0],
          facebookKeyword: config.facebookKeywords[0],
          facebookLocation: config.facebookLocation
        }
      })

      toast.success('Campagne multi-reseaux terminee', { id: toastId })
      await loadStats()
    } catch (error) {
      console.error('Multi-platform scan failed:', error)
      toast.error(`Echec: ${error.message}`, { id: toastId })
    } finally {
      setRunningMultiScan(false)
    }
  }

  const sendDM = async (prospectId) => {
    const toastId = toast.loading('Envoi du DM...')

    try {
      const sendDMFunction = httpsCallable(functions, 'sendManualDM')
      const result = await sendDMFunction({
        orgId: 'default',
        prospectId
      })

      toast.success(result.data.message, { id: toastId })

      // Update prospect status locally
      setProspects(prev => prev.map(p =>
        p.id === prospectId ? { ...p, status: 'contacted' } : p
      ))
    } catch (error) {
      console.error('DM failed:', error)
      toast.error(`Echec de l'envoi: ${error.message}`, { id: toastId })
    }
  }

  // Instagram account management functions
  const loadInstagramAccounts = async () => {
    try {
      const listAccounts = httpsCallable(functions, 'listInstagramAccounts')
      const result = await listAccounts({ orgId: 'default' })
      if (result.data.accounts) {
        setInstagramAccounts(result.data.accounts)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      // Keep mock data on error
    }
  }

  const addInstagramAccount = async () => {
    if (!newAccount.username || !newAccount.password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setAddingAccount(true)
    const toastId = toast.loading('Connexion au compte Instagram...')

    try {
      const addAccount = httpsCallable(functions, 'addInstagramAccount')
      const result = await addAccount({
        orgId: 'default',
        username: newAccount.username,
        password: newAccount.password
      })

      toast.success(result.data.message || 'Compte ajoute avec succes', { id: toastId })
      setShowAddAccount(false)
      setNewAccount({ username: '', password: '' })
      await loadInstagramAccounts()
    } catch (error) {
      console.error('Add account failed:', error)
      toast.error(`Echec: ${error.message}`, { id: toastId })
    } finally {
      setAddingAccount(false)
    }
  }

  const toggleAccountStatus = async (accountId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    const toastId = toast.loading(newStatus === 'active' ? 'Activation...' : 'Mise en pause...')

    try {
      const updateStatus = httpsCallable(functions, 'updateAccountStatus')
      await updateStatus({
        orgId: 'default',
        accountId,
        status: newStatus
      })

      toast.success(newStatus === 'active' ? 'Compte active' : 'Compte mis en pause', { id: toastId })
      setInstagramAccounts(prev => prev.map(acc =>
        acc.id === accountId ? { ...acc, status: newStatus } : acc
      ))
    } catch (error) {
      console.error('Status update failed:', error)
      toast.error(`Echec: ${error.message}`, { id: toastId })
    }
  }

  const removeInstagramAccount = async (accountId, username) => {
    if (!confirm(`Supprimer le compte @${username} ?`)) return

    const toastId = toast.loading('Suppression...')

    try {
      const removeAccount = httpsCallable(functions, 'removeInstagramAccount')
      await removeAccount({
        orgId: 'default',
        accountId
      })

      toast.success('Compte supprime', { id: toastId })
      setInstagramAccounts(prev => prev.filter(acc => acc.id !== accountId))
    } catch (error) {
      console.error('Remove account failed:', error)
      toast.error(`Echec: ${error.message}`, { id: toastId })
    }
  }

  const getAccountStatusBadge = (status) => {
    if (status === 'active') {
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif', icon: Activity }
    }
    if (status === 'paused') {
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pause', icon: Pause }
    }
    if (status === 'error') {
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Erreur', icon: AlertCircle }
    }
    return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inconnu', icon: AlertCircle }
  }

  const getTotalAccountStats = () => {
    const active = instagramAccounts.filter(a => a.status === 'active').length
    const totalDailySent = instagramAccounts.reduce((sum, a) => sum + (a.dailySent || 0), 0)
    const totalDailyCapacity = instagramAccounts.filter(a => a.status === 'active').reduce((sum, a) => sum + (a.dailyLimit || 30), 0)
    return { active, totalDailySent, totalDailyCapacity }
  }

  const filteredProspects = prospects.filter(p => {
    if (filter.platform !== 'all' && p.platform !== filter.platform) return false
    if (filter.status !== 'all' && p.status !== filter.status) return false
    if (searchQuery && !p.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const getStatusBadge = (status) => {
    const badges = {
      new: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Zap, label: 'Nouveau' },
      contacted: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Send, label: 'Contacte' },
      replied: { bg: 'bg-green-100', text: 'text-green-800', icon: MessageCircle, label: 'Repondu' },
      converted: { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle, label: 'Converti' },
      dm_failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Echec DM' }
    }
    return badges[status] || badges.new
  }

  const getPlatformIcon = (platform) => {
    if (platform === 'instagram') return <Instagram className="w-4 h-4 text-pink-500" />
    if (platform === 'facebook') return <FacebookIcon className="w-4 h-4 text-blue-600" />
    return <TikTokIcon className="w-4 h-4 text-black" />
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return `Il y a ${Math.floor(diff / 86400000)}j`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Target className="w-8 h-8 text-indigo-600" />
              Hunter Agent
            </h1>
            <p className="text-gray-500 mt-1">
              Prospection automatisee Instagram, TikTok & Facebook
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runMultiPlatformScan}
              disabled={runningMultiScan || runningHunt !== null}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            >
              {runningMultiScan ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Scan Multi-Reseaux
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Settings className="w-4 h-4" />
              Configuration
            </button>
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              Configuration Hunter
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Instagram Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    Instagram Hunter
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.instagramEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, instagramEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hashtags cibles</label>
                  <input
                    type="text"
                    value={config.instagramHashtags.join(', ')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      instagramHashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="entrepreneur, business, startup"
                  />
                </div>
              </div>

              {/* TikTok Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <TikTokIcon className="w-5 h-5" />
                    TikTok Hunter
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.tiktokEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, tiktokEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hashtags cibles</label>
                  <input
                    type="text"
                    value={config.tiktokHashtags.join(', ')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      tiktokHashtags: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="entrepreneur, business, coaching"
                  />
                </div>
              </div>

              {/* Facebook Config */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <FacebookIcon className="w-5 h-5 text-blue-600" />
                    Facebook Hunter
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.facebookEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, facebookEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Mots-cles de recherche</label>
                  <input
                    type="text"
                    value={config.facebookKeywords.join(', ')}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      facebookKeywords: e.target.value.split(',').map(h => h.trim()).filter(Boolean)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="agence marketing, studio creatif"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Localisation</label>
                  <input
                    type="text"
                    value={config.facebookLocation}
                    onChange={(e) => setConfig(prev => ({ ...prev, facebookLocation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Paris"
                  />
                </div>
              </div>

              {/* General Config */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Score minimum pour qualification</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.minScore}
                    onChange={(e) => setConfig(prev => ({ ...prev, minScore: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Envoi automatique des DMs</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoSendDM}
                      onChange={(e) => setConfig(prev => ({ ...prev, autoSendDM: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {config.autoSendDM && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      Limite securisee: 4 DMs/heure, 30/jour par compte avec rotation multi-comptes
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  toast.success('Configuration sauvegardee')
                  setShowConfig(false)
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {/* Instagram Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={() => runManualHunt('instagram')}
                disabled={runningHunt !== null}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition disabled:opacity-50"
              >
                {runningHunt === 'instagram' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Scan
              </button>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.instagram.totalSaved}</p>
              <p className="text-sm text-gray-500">Prospects Instagram</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.instagram.totalScanned} scannes, {stats.instagram.totalQualified} qualifies
              </p>
            </div>
          </div>

          {/* TikTok Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                <TikTokIcon className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={() => runManualHunt('tiktok')}
                disabled={runningHunt !== null}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                {runningHunt === 'tiktok' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Scan
              </button>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.tiktok.totalSaved}</p>
              <p className="text-sm text-gray-500">Prospects TikTok</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.tiktok.totalScanned} scannes, {stats.tiktok.totalQualified} qualifies
              </p>
            </div>
          </div>

          {/* Facebook Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <FacebookIcon className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={() => runManualHunt('facebook')}
                disabled={runningHunt !== null}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                {runningHunt === 'facebook' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Scan
              </button>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.facebook.totalSaved}</p>
              <p className="text-sm text-gray-500">Prospects Facebook</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.facebook.totalScanned} scannees, {stats.facebook.totalQualified} qualifiees
              </p>
            </div>
          </div>

          {/* DM Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                Actif
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.dm.sent}</p>
              <p className="text-sm text-gray-500">DMs envoyes</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.dm.replied} reponses ({stats.dm.responseRate}%)
              </p>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs text-gray-500">
                <Clock className="w-3 h-3 inline mr-1" />
                24h
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.dm.responseRate}%</p>
              <p className="text-sm text-gray-500">Taux de reponse</p>
              <p className="text-xs text-green-600 mt-1">
                +5.2% vs semaine derniere
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('prospects')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'prospects'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Prospects ({filteredProspects.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytiques
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'accounts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4" />
                Comptes ({instagramAccounts.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        Scan Instagram
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Scanne les hashtags: {config.instagramHashtags.join(', ')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Hashtag personnalise..."
                        className="flex-1 px-3 py-2 text-sm border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            runManualHunt('instagram', e.target.value)
                            e.target.value = ''
                          }
                        }}
                      />
                      <button
                        onClick={() => runManualHunt('instagram')}
                        disabled={runningHunt !== null}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
                      >
                        {runningHunt === 'instagram' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <TikTokIcon className="w-5 h-5" />
                        Scan TikTok
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Scanne les hashtags: {config.tiktokHashtags.join(', ')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Hashtag personnalise..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            runManualHunt('tiktok', e.target.value)
                            e.target.value = ''
                          }
                        }}
                      />
                      <button
                        onClick={() => runManualHunt('tiktok')}
                        disabled={runningHunt !== null}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        {runningHunt === 'tiktok' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Facebook Scan */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <FacebookIcon className="w-5 h-5 text-blue-600" />
                        Scan Facebook
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Recherche: {config.facebookKeywords.join(', ')} ({config.facebookLocation})
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Mot-cle personnalise..."
                        className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            runManualHunt('facebook', e.target.value)
                            e.target.value = ''
                          }
                        }}
                      />
                      <button
                        onClick={() => runManualHunt('facebook')}
                        disabled={runningHunt !== null}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {runningHunt === 'facebook' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Activite recente</h3>
                  <div className="space-y-3">
                    {prospects.slice(0, 5).map((prospect) => {
                      const statusBadge = getStatusBadge(prospect.status)
                      const StatusIcon = statusBadge.icon

                      return (
                        <div
                          key={prospect.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-4">
                            {getPlatformIcon(prospect.platform)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">@{prospect.username}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusBadge.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 truncate max-w-md">
                                {prospect.bio}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm">
                                <Flame className={`w-4 h-4 ${prospect.score >= 80 ? 'text-orange-500' : 'text-gray-400'}`} />
                                <span className="font-medium">{prospect.score}</span>
                              </div>
                              <p className="text-xs text-gray-400">{formatDate(prospect.createdAt)}</p>
                            </div>
                            {prospect.status === 'new' && prospect.platform === 'instagram' && (
                              <button
                                onClick={() => sendDM(prospect.id)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Envoyer un DM"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <a
                              href={prospect.facebookUrl || `https://${prospect.platform === 'instagram' ? 'instagram.com' : 'tiktok.com'}/@${prospect.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prospects' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un prospect..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={filter.platform}
                    onChange={(e) => setFilter(prev => ({ ...prev, platform: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Toutes plateformes</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                  </select>
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Tous statuts</option>
                    <option value="new">Nouveau</option>
                    <option value="contacted">Contacte</option>
                    <option value="replied">Repondu</option>
                    <option value="converted">Converti</option>
                  </select>
                </div>

                {/* Prospects List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Prospect</th>
                        <th className="pb-3 font-medium">Plateforme</th>
                        <th className="pb-3 font-medium">Score</th>
                        <th className="pb-3 font-medium">Contact</th>
                        <th className="pb-3 font-medium">Statut</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProspects.map((prospect) => {
                        const statusBadge = getStatusBadge(prospect.status)
                        const StatusIcon = statusBadge.icon

                        return (
                          <tr key={prospect.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4">
                              <div>
                                <div className="font-medium text-gray-900">@{prospect.username}</div>
                                <div className="text-sm text-gray-500">{prospect.fullName}</div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                {getPlatformIcon(prospect.platform)}
                                <span className="text-sm capitalize">{prospect.platform}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-1">
                                <Flame className={`w-4 h-4 ${prospect.score >= 80 ? 'text-orange-500' : prospect.score >= 60 ? 'text-yellow-500' : 'text-gray-400'}`} />
                                <span className="font-medium">{prospect.score}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                {prospect.email && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    <Mail className="w-3 h-3" />
                                    Email
                                  </span>
                                )}
                                {prospect.instagramHandle && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 text-pink-700 rounded text-xs">
                                    <Instagram className="w-3 h-3" />
                                  </span>
                                )}
                                {prospect.websiteUrl && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    <Globe className="w-3 h-3" />
                                  </span>
                                )}
                                {!prospect.email && !prospect.instagramHandle && !prospect.websiteUrl && (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="py-4 text-sm text-gray-500">
                              {formatDate(prospect.createdAt)}
                            </td>
                            <td className="py-4">
                              <div className="flex items-center justify-end gap-2">
                                {prospect.status === 'new' && prospect.platform === 'instagram' && (
                                  <button
                                    onClick={() => sendDM(prospect.id)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="Envoyer un DM"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}
                                <a
                                  href={prospect.facebookUrl || `https://${prospect.platform === 'instagram' ? 'instagram.com' : 'tiktok.com'}/@${prospect.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                  title="Voir le profil"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {filteredProspects.length === 0 && (
                    <div className="text-center py-12">
                      <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun prospect trouve</h3>
                      <p className="text-gray-500 mb-4">Lancez un scan pour decouvrir de nouveaux prospects</p>
                      <button
                        onClick={() => runManualHunt('instagram')}
                        disabled={runningHunt !== null}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        Lancer un scan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Scan Performance */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-gray-400" />
                      Performance des scans
                    </h4>
                    <div className="space-y-3">
                      {(() => {
                        const total = stats.instagram.totalSaved + stats.tiktok.totalSaved + stats.facebook.totalSaved
                        return (<>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Instagram</span>
                            <span className="font-medium">{stats.instagram.totalSaved} prospects</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                              style={{ width: `${total ? (stats.instagram.totalSaved / total) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">TikTok</span>
                            <span className="font-medium">{stats.tiktok.totalSaved} prospects</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-black h-2 rounded-full"
                              style={{ width: `${total ? (stats.tiktok.totalSaved / total) * 100 : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Facebook</span>
                            <span className="font-medium">{stats.facebook.totalSaved} prospects</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${total ? (stats.facebook.totalSaved / total) * 100 : 0}%` }}
                            />
                          </div>
                        </>)
                      })()}
                    </div>
                  </div>

                  {/* Qualification Rate */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-gray-400" />
                      Taux de qualification
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Instagram</span>
                        <span className="font-medium">
                          {stats.instagram.totalScanned ? Math.round((stats.instagram.totalQualified / stats.instagram.totalScanned) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">TikTok</span>
                        <span className="font-medium">
                          {stats.tiktok.totalScanned ? Math.round((stats.tiktok.totalQualified / stats.tiktok.totalScanned) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Facebook</span>
                        <span className="font-medium">
                          {stats.facebook.totalScanned ? Math.round((stats.facebook.totalQualified / stats.facebook.totalScanned) * 100) : 0}%
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Global</span>
                          <span className="font-bold text-indigo-600">
                            {(() => {
                              const totalQ = stats.instagram.totalQualified + stats.tiktok.totalQualified + stats.facebook.totalQualified
                              const totalS = stats.instagram.totalScanned + stats.tiktok.totalScanned + stats.facebook.totalScanned
                              return totalS ? Math.round((totalQ / totalS) * 100) : 0
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DM Performance */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Send className="w-5 h-5 text-gray-400" />
                      Performance DM
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Envoyes</span>
                        <span className="font-medium">{stats.dm.sent}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Reponses</span>
                        <span className="font-medium text-green-600">{stats.dm.replied}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Echecs</span>
                        <span className="font-medium text-red-600">{stats.dm.failed}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Taux de reponse</span>
                          <span className="font-bold text-green-600">{stats.dm.responseRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Empty state for more analytics */}
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Plus d'analytiques bientot</h3>
                  <p className="text-gray-500">
                    Graphiques d'evolution, comparaison par hashtag, meilleurs moments de scan...
                  </p>
                </div>
              </div>
            )}

            {/* Accounts Tab - Multi-account Instagram management */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                {/* Header with stats and add button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Comptes actifs</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {getTotalAccountStats().active} / {instagramAccounts.length}
                      </p>
                    </div>
                    <div className="h-12 w-px bg-gray-200" />
                    <div>
                      <p className="text-sm text-gray-500">DMs envoyes aujourd'hui</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {getTotalAccountStats().totalDailySent} / {getTotalAccountStats().totalDailyCapacity}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddAccount(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un compte
                  </button>
                </div>

                {/* Add account form */}
                {showAddAccount && (
                  <div className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
                    <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Instagram className="w-5 h-5 text-pink-500" />
                      Ajouter un compte Instagram
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Nom d'utilisateur</label>
                        <input
                          type="text"
                          value={newAccount.username}
                          onChange={(e) => setNewAccount(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="username"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Mot de passe</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newAccount.password}
                            onChange={(e) => setNewAccount(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="********"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        Le mot de passe est chiffre (AES-256) et stocke de facon securisee. Utilisez un compte dedie a la prospection.
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-4">
                      <button
                        onClick={() => {
                          setShowAddAccount(false)
                          setNewAccount({ username: '', password: '' })
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={addInstagramAccount}
                        disabled={addingAccount || !newAccount.username || !newAccount.password}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50"
                      >
                        {addingAccount ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Connecter
                      </button>
                    </div>
                  </div>
                )}

                {/* Accounts grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {instagramAccounts.map((account) => {
                    const statusBadge = getAccountStatusBadge(account.status)
                    const StatusIcon = statusBadge.icon
                    const dailyProgress = (account.dailySent / account.dailyLimit) * 100
                    const hourlyProgress = (account.hourlySent / account.hourlyLimit) * 100

                    return (
                      <div
                        key={account.id}
                        className={`p-4 bg-white rounded-xl border-2 transition ${
                          account.status === 'active' ? 'border-green-200' : account.status === 'paused' ? 'border-yellow-200' : 'border-red-200'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                              <Instagram className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">@{account.username}</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusBadge.bg} ${statusBadge.text}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleAccountStatus(account.id, account.status)}
                              className={`p-2 rounded-lg transition ${
                                account.status === 'active'
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={account.status === 'active' ? 'Mettre en pause' : 'Activer'}
                            >
                              {account.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => removeInstagramAccount(account.id, account.username)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Usage stats */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">DMs jour</span>
                              <span className="font-medium">{account.dailySent} / {account.dailyLimit}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  dailyProgress >= 90 ? 'bg-red-500' : dailyProgress >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">DMs heure</span>
                              <span className="font-medium">{account.hourlySent} / {account.hourlyLimit}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  hourlyProgress >= 75 ? 'bg-orange-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(hourlyProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Last activity */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Derniere activite
                          </span>
                          <span>{formatDate(account.lastActivity)}</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Empty add card */}
                  {instagramAccounts.length < 10 && !showAddAccount && (
                    <button
                      onClick={() => setShowAddAccount(true)}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition flex flex-col items-center justify-center min-h-[200px]"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-gray-500 font-medium">Ajouter un compte</span>
                      <span className="text-xs text-gray-400 mt-1">Max 10 comptes</span>
                    </button>
                  )}
                </div>

                {/* Info box */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Limites de securite (anti-ban)
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>4 DMs par heure</strong> par compte (delais gaussiens)</li>
                    <li>• <strong>30 DMs par jour</strong> par compte maximum</li>
                    <li>• Pause fatigue toutes les 3 actions (10-20 min)</li>
                    <li>• Aucune activite 23h-7h et le week-end</li>
                    <li>• Rotation automatique entre les comptes actifs</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
