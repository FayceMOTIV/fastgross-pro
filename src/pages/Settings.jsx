import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db, storage, auth } from '@/lib/firebase'
import Modal from '@/components/Modal'
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Mail,
  CreditCard,
  Users,
  AlertTriangle,
  Camera,
  Save,
  Loader2,
  Check,
  Plus,
  Trash2,
  Crown,
  Shield,
  UserCircle,
  ExternalLink,
  Database,
  Wrench,
  HelpCircle,
  Palette,
  Sun,
  Moon,
  Clock,
  Bell,
  Search,
  Globe,
  Zap,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  MessageSquare,
  Euro,
} from 'lucide-react'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'

// Channel icon component
const ChannelIcon = ({ channel, className = "w-4 h-4" }) => {
  const icons = {
    email: Mail,
    sms: Smartphone,
    whatsapp: Smartphone,
    instagram_dm: Instagram,
    facebook_dm: MessageSquare,
    voicemail: Mic,
    courrier: MapPin,
  }
  const Icon = icons[channel] || Mail
  return <Icon className={className} />
}
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

const isDevMode = import.meta.env.VITE_USE_EMULATORS === 'true' || import.meta.env.DEV

const baseTabs = [
  { id: 'prospection', label: 'Prospection', icon: Search },
  { id: 'channels', label: 'Canaux', icon: Zap },
  { id: 'sources', label: 'Sources emails', icon: Globe },
  { id: 'schedule', label: 'Planification', icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'billing', label: 'Plan & Facturation', icon: CreditCard },
  { id: 'danger', label: 'Zone dangereuse', icon: AlertTriangle },
]

const devTab = { id: 'dev', label: 'Dev Tools', icon: Wrench }
const tabs = isDevMode ? [...baseTabs, devTab] : baseTabs

export default function Settings() {
  const { user, userProfile } = useAuth()
  const { currentOrg } = useOrg()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('prospection')
  const [saving, setSaving] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email] = useState(user?.email || '')

  // Org state
  const [orgName, setOrgName] = useState(currentOrg?.name || '')
  const [senderName, setSenderName] = useState(currentOrg?.senderName || '')
  const [senderEmail, setSenderEmail] = useState(currentOrg?.senderEmail || '')
  const [emailSignature, setEmailSignature] = useState(currentOrg?.emailSignature || '')

  // Prospection settings
  const [multiContact, setMultiContact] = useState(true)
  const [maxContactsPerCompany, setMaxContactsPerCompany] = useState(3)
  const [autoScore, setAutoScore] = useState(true)
  const [minScore, setMinScore] = useState(60)

  // Sources settings
  const [hunterEnabled, setHunterEnabled] = useState(false)
  const [hunterApiKey, setHunterApiKey] = useState('')
  const [dropcontactEnabled, setDropcontactEnabled] = useState(false)
  const [dropcontactApiKey, setDropcontactApiKey] = useState('')
  const [scrapingEnabled, setScrapingEnabled] = useState(true)
  const [linkedinEnabled, setLinkedinEnabled] = useState(false)

  // Schedule settings
  const [sendStartHour, setSendStartHour] = useState(9)
  const [sendEndHour, setSendEndHour] = useState(18)
  const [sendDays, setSendDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  const [timezone, setTimezone] = useState('Europe/Paris')

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifyOnReply, setNotifyOnReply] = useState(true)
  const [notifyOnOpen, setNotifyOnOpen] = useState(false)
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)

  // Channels settings
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [smsPhone, setSmsPhone] = useState('')
  const [instagramEnabled, setInstagramEnabled] = useState(true)
  const [instagramHandle, setInstagramHandle] = useState('')
  const [voicemailEnabled, setVoicemailEnabled] = useState(false)
  const [voicemailMethod, setVoicemailMethod] = useState('tts')
  const [voicemailVoice, setVoicemailVoice] = useState('female-fr')
  const [courrierEnabled, setCourrierEnabled] = useState(false)
  const [courrierMonthlyBudget, setCourrierMonthlyBudget] = useState(50)
  const [courrierAddress, setCourrierAddress] = useState('')

  // Dev state
  const [seeding, setSeeding] = useState(false)

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Avatar upload
  const avatarInputRef = useRef(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Export
  const [exporting, setExporting] = useState(false)

  const dayLabels = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mer',
    thursday: 'Jeu',
    friday: 'Ven',
    saturday: 'Sam',
    sunday: 'Dim',
  }

  const toggleDay = (day) => {
    if (sendDays.includes(day)) {
      setSendDays(sendDays.filter(d => d !== day))
    } else {
      setSendDays([...sendDays, day])
    }
  }

  const handleSeedData = async () => {
    if (!isDevMode) return
    setSeeding(true)
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project'
      const response = await fetch(
        `http://localhost:5001/${projectId}/europe-west1/seedData`,
        { method: 'POST' }
      )
      const data = await response.json()
      if (data.success) {
        toast.success(`Donnees de demo creees : ${data.data.leads} leads, ${data.data.clients} clients`)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Seed error:', error)
      toast.error('Erreur : verifiez que les emulateurs Firebase sont lances')
    } finally {
      setSeeding(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
      })
      toast.success('Profil mis a jour')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOrg = async () => {
    if (!currentOrg) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'organizations', currentOrg.id), {
        name: orgName,
        senderName,
        senderEmail,
        emailSignature,
      })
      toast.success('Organisation mise a jour')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProspection = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Parametres de prospection sauvegardes')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSources = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Sources d\'emails sauvegardees')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSchedule = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Planification sauvegardee')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Notifications sauvegardees')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveChannels = async () => {
    setSaving(true)
    try {
      // Save to Firestore in real app
      toast.success('Configuration des canaux sauvegardee')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas depasser 2MB')
      return
    }

    setUploadingAvatar(true)
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL
      })

      toast.success('Photo de profil mise a jour')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erreur lors de l\'upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const exportData = {
        user: {
          email: user.email,
          displayName: displayName,
          createdAt: user.metadata?.creationTime
        },
        organization: currentOrg ? {
          name: currentOrg.name,
          id: currentOrg.id,
          plan: currentOrg.plan
        } : null,
        exportedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `face-media-factory-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Donnees exportees')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Erreur lors de l\'export')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Veuillez entrer votre mot de passe')
      return
    }

    setDeleting(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(auth.currentUser)
      toast.success('Compte supprime')
    } catch (error) {
      console.error('Delete error:', error)
      if (error.code === 'auth/wrong-password') {
        toast.error('Mot de passe incorrect')
      } else {
        toast.error('Erreur lors de la suppression du compte')
      }
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeletePassword('')
    }
  }

  const plans = [
    {
      name: 'Starter',
      price: 49,
      current: currentOrg?.plan === 'starter',
      features: ['100 prospects/mois', '500 emails/mois', 'Scraping automatique', '1 utilisateur']
    },
    {
      name: 'Pro',
      price: 99,
      current: currentOrg?.plan === 'pro' || !currentOrg?.plan,
      features: ['500 prospects/mois', '2000 emails/mois', 'Hunter.io + Dropcontact', '3 utilisateurs', 'Support prioritaire']
    },
    {
      name: 'Scale',
      price: 199,
      current: currentOrg?.plan === 'scale',
      features: ['Illimite', '10000 emails/mois', 'Toutes les sources', 'Equipe illimitee', 'API access', 'Account manager']
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-dark-400" />
          Parametres
        </h1>
        <p className="text-dark-400 mt-1">Configurez votre outil de prospection</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : tab.id === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Prospection Tab */}
          {activeTab === 'prospection' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Search className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Parametres de prospection</h2>
              </div>

              {/* Multi-contact toggle */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-brand-400" />
                      <h3 className="font-medium text-white">Multi-contact par entreprise</h3>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      Contacter plusieurs personnes au sein de la meme entreprise pour maximiser vos chances de reponse
                    </p>
                  </div>
                  <button
                    onClick={() => setMultiContact(!multiContact)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      multiContact ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {multiContact ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {multiContact && (
                  <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Nombre max de contacts par entreprise
                    </label>
                    <select
                      value={maxContactsPerCompany}
                      onChange={(e) => setMaxContactsPerCompany(parseInt(e.target.value))}
                      className="input-field w-48"
                    >
                      <option value={2}>2 contacts</option>
                      <option value={3}>3 contacts</option>
                      <option value={5}>5 contacts</option>
                      <option value={10}>10 contacts</option>
                    </select>
                    <p className="text-xs text-dark-500 mt-2">
                      Recommande : 3 contacts (dirigeant, commercial, marketing)
                    </p>
                  </div>
                )}
              </div>

              {/* Auto-scoring toggle */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <h3 className="font-medium text-white">Scoring automatique</h3>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      Attribuer automatiquement un score de qualite a chaque prospect trouve
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoScore(!autoScore)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      autoScore ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {autoScore ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {autoScore && (
                  <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Score minimum pour envoyer un email
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="flex-1 accent-brand-500"
                      />
                      <span className="w-12 text-center font-medium text-white">{minScore}%</span>
                    </div>
                    <p className="text-xs text-dark-500 mt-2">
                      Les prospects avec un score inferieur ne seront pas contactes automatiquement
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveProspection}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Zap className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Configuration des canaux</h2>
              </div>

              <p className="text-sm text-dark-400">
                Configurez les canaux de contact pour vos sequences multicanales.
                Plus de canaux = plus de chances de reponse.
              </p>

              {/* Email (always active) */}
              <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">Email</h3>
                      <p className="text-sm text-dark-400">Canal principal - toujours actif</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    Actif
                  </span>
                </div>
              </div>

              {/* SMS */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.sms.bg}`}>
                        <Smartphone className={`w-5 h-5 ${CHANNEL_STYLES.sms.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">SMS / WhatsApp</h3>
                        <p className="text-sm text-dark-400">Taux d'ouverture de 98% - max 2 par prospect</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSmsEnabled(!smsEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      smsEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {smsEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {smsEnabled && (
                  <div className="mt-4 ml-13 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Numero d'envoi SMS
                    </label>
                    <input
                      type="tel"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      className="input-field"
                      placeholder="+33 6 12 34 56 78"
                    />
                    <p className="text-xs text-dark-500 mt-2">
                      Le numero depuis lequel les SMS seront envoyes (necessite integration Twilio)
                    </p>
                  </div>
                )}
              </div>

              {/* Instagram DM */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.instagram_dm.bg}`}>
                        <Instagram className={`w-5 h-5 ${CHANNEL_STYLES.instagram_dm.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Instagram DM</h3>
                        <p className="text-sm text-dark-400">Approche sociale pour commerces locaux - max 1 DM</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setInstagramEnabled(!instagramEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      instagramEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {instagramEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {instagramEnabled && (
                  <div className="mt-4 ml-13 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Compte Instagram
                    </label>
                    <input
                      type="text"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className="input-field"
                      placeholder="@votrecompte"
                    />
                    <p className="text-xs text-dark-500 mt-2">
                      Votre compte Instagram professionnel (connectez-le dans les integrations)
                    </p>
                  </div>
                )}
              </div>

              {/* Voicemail */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.voicemail.bg}`}>
                        <Mic className={`w-5 h-5 ${CHANNEL_STYLES.voicemail.color}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">Message vocal</h3>
                        <p className="text-sm text-dark-400">Voicemail drop - le telephone ne sonne pas - max 1</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVoicemailEnabled(!voicemailEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      voicemailEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {voicemailEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {voicemailEnabled && (
                  <div className="mt-4 ml-13 p-4 rounded-lg bg-dark-900/50 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Methode de generation
                      </label>
                      <select
                        value={voicemailMethod}
                        onChange={(e) => setVoicemailMethod(e.target.value)}
                        className="input-field"
                      >
                        <option value="tts">Text-to-Speech (IA)</option>
                        <option value="recorded">Message pre-enregistre</option>
                      </select>
                    </div>

                    {voicemailMethod === 'tts' && (
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          Voix TTS
                        </label>
                        <select
                          value={voicemailVoice}
                          onChange={(e) => setVoicemailVoice(e.target.value)}
                          className="input-field"
                        >
                          <option value="female-fr">Femme - Francais</option>
                          <option value="male-fr">Homme - Francais</option>
                          <option value="female-en">Femme - Anglais</option>
                          <option value="male-en">Homme - Anglais</option>
                        </select>
                      </div>
                    )}

                    <p className="text-xs text-dark-500">
                      Le message vocal est depose directement dans la messagerie sans faire sonner le telephone.
                      Duree max : 30 secondes.
                    </p>
                  </div>
                )}
              </div>

              {/* Courrier postal */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.courrier.bg}`}>
                        <MapPin className={`w-5 h-5 ${CHANNEL_STYLES.courrier.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">Courrier postal</h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                            Premium
                          </span>
                        </div>
                        <p className="text-sm text-dark-400">Carte personnalisee avec QR code - 2.50 EUR/envoi</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCourrierEnabled(!courrierEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      courrierEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {courrierEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {courrierEnabled && (
                  <div className="mt-4 ml-13 p-4 rounded-lg bg-dark-900/50 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Budget mensuel maximum
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={200}
                          step={10}
                          value={courrierMonthlyBudget}
                          onChange={(e) => setCourrierMonthlyBudget(parseInt(e.target.value))}
                          className="flex-1 accent-brand-500"
                        />
                        <div className="flex items-center gap-1 min-w-[80px]">
                          <Euro className="w-4 h-4 text-amber-400" />
                          <span className="font-medium text-white">{courrierMonthlyBudget} EUR</span>
                        </div>
                      </div>
                      <p className="text-xs text-dark-500 mt-2">
                        = max {Math.floor(courrierMonthlyBudget / 2.5)} courriers/mois
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Adresse expediteur
                      </label>
                      <textarea
                        value={courrierAddress}
                        onChange={(e) => setCourrierAddress(e.target.value)}
                        className="input-field min-h-[80px]"
                        placeholder="Votre Entreprise&#10;123 Rue Example&#10;75001 Paris"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-400">
                        Le courrier postal est reserve aux prospects chauds (score &ge; 70%) ou en derniere etape de sequence.
                        Chaque carte inclut un QR code personnalise pour le tracking.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveChannels}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Globe className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Sources d'emails</h2>
              </div>

              <p className="text-sm text-dark-400">
                Configurez les sources utilisees pour trouver les emails de vos prospects.
                Plus de sources = plus de chances de trouver l'email valide.
              </p>

              {/* Scraping */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Search className="w-5 h-5 text-blue-400" />
                      <h3 className="font-medium text-white">Scraping de sites web</h3>
                      <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                        Gratuit
                      </span>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      Extraction automatique des emails depuis les pages contact, mentions legales, etc.
                    </p>
                  </div>
                  <button
                    onClick={() => setScrapingEnabled(!scrapingEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      scrapingEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {scrapingEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Hunter.io */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-amber-400" />
                      <h3 className="font-medium text-white">Hunter.io</h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                        Premium
                      </span>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      API professionnelle pour trouver et verifier les emails. ~50 credits/mois gratuits.
                    </p>
                  </div>
                  <button
                    onClick={() => setHunterEnabled(!hunterEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      hunterEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {hunterEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {hunterEnabled && (
                  <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Cle API Hunter.io
                    </label>
                    <input
                      type="password"
                      value={hunterApiKey}
                      onChange={(e) => setHunterApiKey(e.target.value)}
                      className="input-field"
                      placeholder="Votre cle API Hunter.io"
                    />
                    <a
                      href="https://hunter.io/api_keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      Obtenir une cle API
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Dropcontact */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-400" />
                      <h3 className="font-medium text-white">Dropcontact</h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                        Premium
                      </span>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      Enrichissement B2B francais. Excellent pour les entreprises francaises.
                    </p>
                  </div>
                  <button
                    onClick={() => setDropcontactEnabled(!dropcontactEnabled)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      dropcontactEnabled ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {dropcontactEnabled ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>

                {dropcontactEnabled && (
                  <div className="mt-4 ml-8 p-4 rounded-lg bg-dark-900/50">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Cle API Dropcontact
                    </label>
                    <input
                      type="password"
                      value={dropcontactApiKey}
                      onChange={(e) => setDropcontactApiKey(e.target.value)}
                      className="input-field"
                      placeholder="Votre cle API Dropcontact"
                    />
                    <a
                      href="https://www.dropcontact.com/fr/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-400 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      Obtenir une cle API
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* LinkedIn (coming soon) */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10 opacity-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-400" />
                      <h3 className="font-medium text-white">LinkedIn Sales Navigator</h3>
                      <span className="px-2 py-0.5 rounded-full bg-dark-700 text-dark-400 text-xs">
                        Bientot disponible
                      </span>
                    </div>
                    <p className="text-sm text-dark-400 mt-2 ml-8">
                      Import de leads depuis LinkedIn avec enrichissement automatique.
                    </p>
                  </div>
                  <button disabled className="flex-shrink-0 p-1 rounded-full bg-dark-700 cursor-not-allowed">
                    <ToggleLeft className="w-8 h-8 text-dark-500" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveSources}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Clock className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Planification des envois</h2>
              </div>

              {/* Send hours */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-medium text-white mb-4">Heures d'envoi</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Debut
                    </label>
                    <select
                      value={sendStartHour}
                      onChange={(e) => setSendStartHour(parseInt(e.target.value))}
                      className="input-field"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Fin
                    </label>
                    <select
                      value={sendEndHour}
                      onChange={(e) => setSendEndHour(parseInt(e.target.value))}
                      className="input-field"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-dark-500 mt-3">
                  Les emails seront envoyes entre {sendStartHour}h et {sendEndHour}h ({timezone})
                </p>
              </div>

              {/* Send days */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-medium text-white mb-4">Jours d'envoi</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dayLabels).map(([day, label]) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        sendDays.includes(day)
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-dark-500 mt-3">
                  Recommande : evitez le week-end pour de meilleurs taux d'ouverture
                </p>
              </div>

              {/* Timezone */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-medium text-white mb-4">Fuseau horaire</h3>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-field w-full md:w-64"
                >
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Bell className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Notifications</h2>
              </div>

              {/* Email notifications toggle */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Notifications par email</h3>
                    <p className="text-sm text-dark-400 mt-1">
                      Recevoir les notifications sur {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailNotifications(!emailNotifications)}
                    className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                      emailNotifications ? 'bg-brand-500' : 'bg-dark-700'
                    }`}
                  >
                    {emailNotifications ? (
                      <ToggleRight className="w-8 h-8 text-white" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-dark-400" />
                    )}
                  </button>
                </div>
              </div>

              {emailNotifications && (
                <div className="space-y-3 ml-4">
                  {/* Notify on reply */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-dark-900/50">
                    <div>
                      <p className="text-sm font-medium text-white">Nouvelles reponses</p>
                      <p className="text-xs text-dark-500">Quand un prospect repond a votre email</p>
                    </div>
                    <button
                      onClick={() => setNotifyOnReply(!notifyOnReply)}
                      className={`p-0.5 rounded-full transition-colors ${
                        notifyOnReply ? 'bg-brand-500' : 'bg-dark-700'
                      }`}
                    >
                      {notifyOnReply ? (
                        <ToggleRight className="w-6 h-6 text-white" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-dark-400" />
                      )}
                    </button>
                  </div>

                  {/* Notify on open */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-dark-900/50">
                    <div>
                      <p className="text-sm font-medium text-white">Ouvertures d'email</p>
                      <p className="text-xs text-dark-500">Quand un prospect ouvre votre email</p>
                    </div>
                    <button
                      onClick={() => setNotifyOnOpen(!notifyOnOpen)}
                      className={`p-0.5 rounded-full transition-colors ${
                        notifyOnOpen ? 'bg-brand-500' : 'bg-dark-700'
                      }`}
                    >
                      {notifyOnOpen ? (
                        <ToggleRight className="w-6 h-6 text-white" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-dark-400" />
                      )}
                    </button>
                  </div>

                  {/* Daily digest */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-dark-900/50">
                    <div>
                      <p className="text-sm font-medium text-white">Resume quotidien</p>
                      <p className="text-xs text-dark-500">Recap de la journee chaque soir a 18h</p>
                    </div>
                    <button
                      onClick={() => setNotifyDailyDigest(!notifyDailyDigest)}
                      className={`p-0.5 rounded-full transition-colors ${
                        notifyDailyDigest ? 'bg-brand-500' : 'bg-dark-700'
                      }`}
                    >
                      {notifyDailyDigest ? (
                        <ToggleRight className="w-6 h-6 text-white" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-dark-400" />
                      )}
                    </button>
                  </div>

                  {/* Weekly report */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-dark-900/50">
                    <div>
                      <p className="text-sm font-medium text-white">Rapport hebdomadaire</p>
                      <p className="text-xs text-dark-500">Statistiques de la semaine chaque lundi</p>
                    </div>
                    <button
                      onClick={() => setNotifyWeeklyReport(!notifyWeeklyReport)}
                      className={`p-0.5 rounded-full transition-colors ${
                        notifyWeeklyReport ? 'bg-brand-500' : 'bg-dark-700'
                      }`}
                    >
                      {notifyWeeklyReport ? (
                        <ToggleRight className="w-6 h-6 text-white" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-dark-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <User className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Profil</h2>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Avatar"
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-2xl font-display font-bold text-dark-950">
                      {displayName?.charAt(0) || '?'}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center hover:bg-dark-700 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 text-dark-400 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-dark-400" />
                    )}
                  </button>
                </div>
                <div>
                  <p className="text-sm text-dark-500">Photo de profil</p>
                  <p className="text-xs text-dark-600 mt-1">JPG, PNG. Max 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="input-field opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-dark-500 mt-1">L'email ne peut pas etre modifie</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    localStorage.removeItem('fmf_tour_completed')
                    toast.success('Tour reinitialise. Retournez sur le Dashboard pour le revoir.')
                  }}
                  className="btn-ghost text-sm flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Revoir le tour guide
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Palette className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Apparence</h2>
              </div>

              <div>
                <h3 className="text-sm font-medium text-dark-300 mb-4">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'light'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Sun className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">Mode clair</p>
                        <p className="text-xs text-dark-500">Interface lumineuse</p>
                      </div>
                    </div>
                    <div className="w-full h-20 rounded-lg bg-slate-100 border border-slate-200 p-2">
                      <div className="w-full h-3 rounded bg-slate-200 mb-1" />
                      <div className="w-2/3 h-2 rounded bg-slate-300" />
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">Mode sombre</p>
                        <p className="text-xs text-dark-500">Reduit la fatigue oculaire</p>
                      </div>
                    </div>
                    <div className="w-full h-20 rounded-lg bg-dark-900 border border-dark-700 p-2">
                      <div className="w-full h-3 rounded bg-dark-700 mb-1" />
                      <div className="w-2/3 h-2 rounded bg-dark-600" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-dark-500">
                  Le theme est sauvegarde automatiquement et sera applique a chaque connexion.
                </p>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <Building2 className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Organisation</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Nom de l'organisation
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="input-field"
                    placeholder="Mon Agence"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Identifiant
                  </label>
                  <input
                    type="text"
                    value={currentOrg?.id || ''}
                    disabled
                    className="input-field opacity-50 cursor-not-allowed font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  onClick={handleSaveOrg}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current plan */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-400">Plan actuel</p>
                    <p className="text-2xl font-display font-bold text-white mt-1">
                      {currentOrg?.plan === 'scale' ? 'Scale' :
                       currentOrg?.plan === 'starter' ? 'Starter' : 'Pro'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-dark-400">Usage ce mois</p>
                    <p className="text-lg font-medium text-white mt-1">
                      0 / {currentOrg?.settings?.emailsPerMonth || 2000} emails
                    </p>
                    <div className="w-32 h-2 bg-dark-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`bg-white/5 rounded-2xl border p-6 space-y-4 ${
                      plan.current ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-display font-semibold text-white">
                        {plan.name}
                      </h3>
                      {plan.current && (
                        <span className="badge-success">Actuel</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-display font-bold text-white">
                        {plan.price}EUR
                      </span>
                      <span className="text-dark-500">/mois</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-dark-300">
                          <Check className="w-4 h-4 text-brand-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      className={plan.current ? 'btn-secondary w-full' : 'btn-primary w-full'}
                      disabled={plan.current}
                    >
                      {plan.current ? 'Plan actuel' : 'Choisir'}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-dark-500 text-center">
                Besoin d'un plan personnalise ?{' '}
                <a href="mailto:contact@facemedia.fr" className="text-brand-400 hover:underline">
                  Contactez-nous
                </a>
              </p>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-display font-semibold text-white">Zone dangereuse</h3>
                </div>
                <p className="text-sm text-dark-400 mb-6">
                  Ces actions sont irreversibles. Procedez avec precaution.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-800">
                    <div>
                      <p className="text-sm font-medium text-white">Exporter mes donnees</p>
                      <p className="text-xs text-dark-500 mt-1">
                        Telechargez toutes vos donnees au format JSON
                      </p>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={exporting}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      {exporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      {exporting ? 'Export...' : 'Exporter'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-red-500/20">
                    <div>
                      <p className="text-sm font-medium text-red-400">Supprimer mon compte</p>
                      <p className="text-xs text-dark-500 mt-1">
                        Supprime definitivement votre compte et toutes vos donnees
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dev Tools Tab (only in dev mode) */}
          {activeTab === 'dev' && isDevMode && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-semibold text-white">Outils de developpement</h3>
                </div>
                <p className="text-sm text-dark-400 mb-6">
                  Ces outils sont disponibles uniquement en environnement de developpement.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-amber-500/20">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-400" />
                        Peupler avec des donnees de demo
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        Cree 1 organisation, 3 clients, 20 leads, 2 campagnes, 50 events email
                      </p>
                    </div>
                    <button
                      onClick={handleSeedData}
                      disabled={seeding}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                    >
                      {seeding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      {seeding ? 'En cours...' : 'Seed Data'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
                    <p className="text-sm font-medium text-white mb-3">Liens rapides</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href="http://localhost:4000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Firebase Emulator UI
                      </a>
                      <a
                        href="http://localhost:4000/firestore"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Firestore Data
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletePassword('')
        }}
        title="Supprimer mon compte"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              <strong>Attention :</strong> Cette action est irreversible. Toutes vos donnees seront supprimees definitivement.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Confirmez avec votre mot de passe
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input-field"
              placeholder="Votre mot de passe"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setDeletePassword('')
              }}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
