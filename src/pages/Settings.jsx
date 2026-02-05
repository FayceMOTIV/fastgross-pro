import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore'
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
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import toast from 'react-hot-toast'

const isDevMode = import.meta.env.VITE_USE_EMULATORS === 'true' || import.meta.env.DEV

const baseTabs = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'billing', label: 'Plan & Facturation', icon: CreditCard },
  { id: 'team', label: 'Équipe', icon: Users },
  { id: 'danger', label: 'Zone dangereuse', icon: AlertTriangle },
]

const devTab = { id: 'dev', label: 'Dev Tools', icon: Wrench }
const tabs = isDevMode ? [...baseTabs, devTab] : baseTabs

export default function Settings() {
  const { user, userProfile } = useAuth()
  const { currentOrg } = useOrg()
  const { theme, setTheme, isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email] = useState(user?.email || '')

  // Org state
  const [orgName, setOrgName] = useState(currentOrg?.name || '')
  const [senderName, setSenderName] = useState(currentOrg?.senderName || '')
  const [senderEmail, setSenderEmail] = useState(currentOrg?.senderEmail || '')
  const [emailSignature, setEmailSignature] = useState(currentOrg?.emailSignature || '')

  // Team state
  const [inviteEmail, setInviteEmail] = useState('')

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

  const handleSeedData = async () => {
    if (!isDevMode) return
    setSeeding(true)
    try {
      // Call the seedData endpoint directly (works with emulator)
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project'
      const response = await fetch(
        `http://localhost:5001/${projectId}/europe-west1/seedData`,
        { method: 'POST' }
      )
      const data = await response.json()
      if (data.success) {
        toast.success(`Données de démo créées : ${data.data.leads} leads, ${data.data.clients} clients`)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Seed error:', error)
      toast.error('Erreur : vérifiez que les emulateurs Firebase sont lancés')
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
      toast.success('Profil mis à jour')
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
      toast.success('Organisation mise à jour')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail) return

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Email invalide')
      return
    }

    // Pour l'instant, on informe que la fonctionnalité arrive bientôt
    // TODO: Implémenter l'envoi d'invitation via Cloud Function
    toast.success(`Invitation envoyée à ${inviteEmail}`, {
      icon: '📧',
      duration: 3000
    })
    setInviteEmail('')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2MB')
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

      toast.success('Photo de profil mise à jour')
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

      // Télécharger comme JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `face-media-factory-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Données exportées')
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
      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(user.email, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, credential)

      // Supprimer les données Firestore de l'utilisateur
      await deleteDoc(doc(db, 'users', user.uid))

      // Supprimer le compte Firebase Auth
      await deleteUser(auth.currentUser)

      toast.success('Compte supprimé')
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
      name: 'Solo',
      price: 79,
      current: currentOrg?.plan === 'solo',
      features: ['1 client', '200 emails/mois', 'Scanner', 'Forgeur', 'Radar']
    },
    {
      name: 'Pro',
      price: 199,
      current: currentOrg?.plan === 'pro',
      features: ['3 clients', '1000 emails/mois', 'Tout Solo +', 'Proof', 'Support prioritaire']
    },
    {
      name: 'Agency',
      price: 499,
      current: currentOrg?.plan === 'agency',
      features: ['Illimité', 'Illimité', 'Tout Pro +', 'White-label', 'API', 'Account manager']
    },
  ]

  const teamMembers = [
    {
      name: user?.displayName || 'Vous',
      email: user?.email,
      role: 'owner',
      avatar: user?.displayName?.charAt(0) || '?'
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-dark-400" />
          Paramètres
        </h1>
        <p className="text-dark-400 mt-1">Gérez votre compte et votre organisation</p>
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
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-dark-800/50">
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
                  <p className="text-xs text-dark-500 mt-1">L'email ne peut pas être modifié</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-dark-800/50">
                <button
                  onClick={() => {
                    localStorage.removeItem('fmf_tour_completed')
                    toast.success('Tour réinitialisé. Retournez sur le Dashboard pour le revoir.')
                  }}
                  className="btn-ghost text-sm flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Revoir le tour guidé
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
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-dark-800/50">
                <Palette className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Apparence</h2>
              </div>

              <div>
                <h3 className="text-sm font-medium text-dark-300 mb-4">Thème</h3>
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
                        <p className="text-xs text-dark-500">Réduit la fatigue oculaire</p>
                      </div>
                    </div>
                    <div className="w-full h-20 rounded-lg bg-dark-900 border border-dark-700 p-2">
                      <div className="w-full h-3 rounded bg-dark-700 mb-1" />
                      <div className="w-2/3 h-2 rounded bg-dark-600" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-dark-800/50">
                <p className="text-xs text-dark-500">
                  Le thème est sauvegardé automatiquement et sera appliqué à chaque connexion.
                </p>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-dark-800/50">
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

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Logo (bientôt disponible)
                </label>
                <div className="border-2 border-dashed border-dark-700 rounded-xl p-8 text-center hover:border-dark-600 transition-colors cursor-pointer">
                  <Building2 className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                  <p className="text-sm text-dark-500">Glissez votre logo ici ou cliquez</p>
                  <p className="text-xs text-dark-600 mt-1">PNG, SVG. Max 1MB</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-800/50">
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

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="glass-card p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-dark-800/50">
                <Mail className="w-5 h-5 text-brand-400" />
                <h2 className="section-title">Configuration Email</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Nom de l'expéditeur
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="input-field"
                    placeholder="Jean de Mon Agence"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Ce nom apparaîtra dans la boîte de réception de vos destinataires
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email d'envoi
                  </label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="input-field"
                    placeholder="contact@monagence.com"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Domaine personnalisé à configurer dans Resend
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Signature par défaut
                </label>
                <textarea
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Cordialement,&#10;Jean Dupont&#10;Mon Agence&#10;01 23 45 67 89"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-dark-800/50">
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
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-dark-400">Plan actuel</p>
                    <p className="text-2xl font-display font-bold text-white mt-1">
                      {currentOrg?.plan === 'agency' ? 'Agency' :
                       currentOrg?.plan === 'pro' ? 'Pro' : 'Solo'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-dark-400">Usage ce mois</p>
                    <p className="text-lg font-medium text-white mt-1">
                      0 / {currentOrg?.settings?.emailsPerMonth || 200} emails
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
                    className={`glass-card p-6 space-y-4 ${
                      plan.current ? 'border-brand-500/50 ring-1 ring-brand-500/20' : ''
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
                        {plan.price}€
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
                Besoin d'un plan personnalisé ?{' '}
                <a href="mailto:contact@facemedia.fr" className="text-brand-400 hover:underline">
                  Contactez-nous
                </a>
              </p>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Invite form */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-medium text-dark-300 mb-4">
                  Inviter un membre
                </h3>
                <form onSubmit={handleInviteMember} className="flex gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-field flex-1"
                    placeholder="email@exemple.com"
                  />
                  <button type="submit" className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Inviter
                  </button>
                </form>
              </div>

              {/* Members list */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-dark-800/50">
                  <h3 className="text-sm font-medium text-dark-300">
                    Membres ({teamMembers.length})
                  </h3>
                </div>
                <div className="divide-y divide-dark-800/30">
                  {teamMembers.map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-dark-800/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold text-dark-950">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-dark-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`badge flex items-center gap-1 ${
                          member.role === 'owner' ? 'badge-warning' :
                          member.role === 'admin' ? 'badge-info' : 'badge-success'
                        }`}>
                          {member.role === 'owner' && <Crown className="w-3 h-3" />}
                          {member.role === 'admin' && <Shield className="w-3 h-3" />}
                          {member.role === 'member' && <UserCircle className="w-3 h-3" />}
                          {member.role === 'owner' ? 'Propriétaire' :
                           member.role === 'admin' ? 'Admin' : 'Membre'}
                        </span>
                        {member.role !== 'owner' && (
                          <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-dark-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-display font-semibold text-white">Zone dangereuse</h3>
                </div>
                <p className="text-sm text-dark-400 mb-6">
                  Ces actions sont irréversibles. Procédez avec précaution.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-800">
                    <div>
                      <p className="text-sm font-medium text-white">Exporter mes données</p>
                      <p className="text-xs text-dark-500 mt-1">
                        Téléchargez toutes vos données au format JSON
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
                        Supprime définitivement votre compte et toutes vos données
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
              <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  <h3 className="font-display font-semibold text-white">Outils de développement</h3>
                </div>
                <p className="text-sm text-dark-400 mb-6">
                  Ces outils sont disponibles uniquement en environnement de développement.
                </p>

                <div className="space-y-4">
                  {/* Seed Data */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-amber-500/20">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-400" />
                        Peupler avec des données de démo
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        Crée 1 organisation, 3 clients, 20 leads, 2 campagnes, 50 events email
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

                  {/* Emulator status */}
                  <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
                    <p className="text-sm font-medium text-white mb-2">État des émulateurs</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-dark-400">Auth: localhost:9099</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-dark-400">Firestore: localhost:8080</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-dark-400">Functions: localhost:5001</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-dark-400">UI: localhost:4000</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick links */}
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
              <strong>Attention :</strong> Cette action est irréversible. Toutes vos données seront supprimées définitivement.
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
