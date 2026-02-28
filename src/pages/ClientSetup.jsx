import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, MessageSquare, Mail, Share2, Rocket,
  ArrowRight, ArrowLeft, Check, Loader2, AlertCircle,
  Globe, Users, Wifi, WifiOff, Eye, EyeOff, Copy,
  Zap, Clock, MapPin, RefreshCw, ChevronDown,
  Instagram, Linkedin, Twitter, CheckCircle2, XCircle,
  Send, Settings2, Sparkles
} from 'lucide-react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import toast from 'react-hot-toast'

// --- Step Configuration ---

const STEPS = [
  {
    id: 1,
    title: 'Votre entreprise',
    subtitle: 'Informations de base pour personnaliser vos campagnes',
    icon: Building2,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 to-purple-600/10',
  },
  {
    id: 2,
    title: 'WhatsApp',
    subtitle: 'Connectez votre instance Evolution API',
    icon: MessageSquare,
    gradient: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-500/10 to-emerald-600/10',
  },
  {
    id: 3,
    title: 'Email',
    subtitle: 'Configurez votre serveur SMTP ou Instantly',
    icon: Mail,
    gradient: 'from-blue-500 to-indigo-600',
    bgGradient: 'from-blue-500/10 to-indigo-600/10',
  },
  {
    id: 4,
    title: 'Reseaux sociaux',
    subtitle: 'Connectez vos comptes sociaux (optionnel)',
    icon: Share2,
    gradient: 'from-pink-500 to-rose-600',
    bgGradient: 'from-pink-500/10 to-rose-600/10',
  },
  {
    id: 5,
    title: 'Prospection',
    subtitle: 'Parametrez votre machine de prospection',
    icon: Rocket,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-600/10',
  },
]

const INDUSTRIES = [
  'Agence marketing', 'Agence web', 'Consultant', 'Coach',
  'SaaS / Tech', 'E-commerce', 'Immobilier', 'Formation',
  'Artisan / BTP', 'Restauration', 'Sante / Bien-etre', 'Autre',
]

const TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'Asia/Tokyo', 'Africa/Casablanca', 'Africa/Tunis',
]

const DEFAULT_FORM = {
  // Step 1
  companyName: '',
  industry: '',
  targetAudience: '',
  website: '',
  // Step 2
  whatsappEnabled: false,
  evolutionApiUrl: '',
  evolutionApiKey: '',
  evolutionInstanceName: '',
  // Step 3
  emailEnabled: true,
  emailProvider: 'smtp',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  emailFrom: '',
  instantlyApiKey: '',
  // Step 4
  typefullyApiKey: '',
  instagramEnabled: false,
  instagramHandle: '',
  linkedinEnabled: false,
  linkedinApiKey: '',
  // Step 5
  timezone: 'Europe/Paris',
  businessHoursStart: 8,
  businessHoursEnd: 20,
  dailyBudget: 50,
  autoStart: false,
  autoRefill: true,
  pipelineThreshold: 50,
  queries: '',
  locations: '',
}

// --- Main Component ---

export default function ClientSetup() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const orgId = currentOrg?.id

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [connectionTest, setConnectionTest] = useState(null)
  const [showPassword, setShowPassword] = useState({})
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [setupComplete, setSetupComplete] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(true)

  const functions = useMemo(() => getFunctions(undefined, 'europe-west1'), [])

  // --- Load existing progress ---
  useEffect(() => {
    if (!orgId || isDemo) {
      setLoadingProgress(false)
      return
    }

    const loadProgress = async () => {
      try {
        const getProgress = httpsCallable(functions, 'getSetupProgress')
        const result = await getProgress({ orgId })
        const { progress, setupComplete: done, currentStep: step } = result.data

        if (done) {
          setSetupComplete(true)
          setLoadingProgress(false)
          return
        }

        // Restore completed steps and their data
        const completed = new Set()
        Object.entries(progress).forEach(([key, value]) => {
          const stepNum = parseInt(key.replace('step', ''))
          if (value.completed) {
            completed.add(stepNum)
            // Restore saved data into form
            if (value.data) {
              setForm((prev) => ({ ...prev, ...value.data }))
            }
          }
        })

        setCompletedSteps(completed)
        // Go to first incomplete step
        const nextStep = Math.min(step, 5)
        setCurrentStep(nextStep)
      } catch (err) {
        console.error('Failed to load setup progress:', err)
      } finally {
        setLoadingProgress(false)
      }
    }

    loadProgress()
  }, [orgId, isDemo, functions])

  // --- Form field update ---
  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors([])
  }, [])

  // --- Validate & save current step ---
  const validateStep = async () => {
    setSaving(true)
    setErrors([])
    setConnectionTest(null)

    try {
      if (isDemo) {
        // Demo mode — simulate success
        await new Promise((r) => setTimeout(r, 800))
        setCompletedSteps((prev) => new Set([...prev, currentStep]))
        toast.success(`Etape ${currentStep} validee`)
        setSaving(false)
        return true
      }

      const validate = httpsCallable(functions, 'validateSetupStep')
      const result = await validate({ orgId, step: currentStep, data: form })

      if (!result.data.success) {
        setErrors(result.data.errors || ['Erreur de validation'])
        setSaving(false)
        return false
      }

      if (result.data.connectionTest) {
        setConnectionTest(result.data.connectionTest)
      }

      setCompletedSteps((prev) => new Set([...prev, currentStep]))
      toast.success(`Etape ${currentStep} validee`)
      setSaving(false)
      return true
    } catch (err) {
      const message = err.message || 'Erreur lors de la validation'
      setErrors([message])
      toast.error(message)
      setSaving(false)
      return false
    }
  }

  // --- Go to next step ---
  const handleNext = async () => {
    const valid = await validateStep()
    if (!valid) return

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
      setErrors([])
      setConnectionTest(null)
    }
  }

  // --- Go to previous step ---
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors([])
      setConnectionTest(null)
    }
  }

  // --- Complete setup ---
  const handleComplete = async () => {
    const valid = await validateStep()
    if (!valid) return

    setSaving(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 1200))
        setSetupComplete(true)
        toast.success('Configuration terminee !')
        setSaving(false)
        return
      }

      const complete = httpsCallable(functions, 'completeClientSetup')
      const result = await complete({ orgId })

      if (result.data.success) {
        setSetupComplete(true)
        toast.success('Configuration terminee ! Votre machine de prospection est prete.')
      }
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la finalisation')
    } finally {
      setSaving(false)
    }
  }

  // --- Toggle password visibility ---
  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  // --- Loading state ---
  if (loadingProgress) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-gray-500">Chargement de la configuration...</p>
        </div>
      </div>
    )
  }

  // --- Setup complete state ---
  if (setupComplete) {
    return <SetupCompleteScreen />
  }

  const stepConfig = STEPS[currentStep - 1]
  const StepIcon = stepConfig.icon

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Settings2 className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-600">Configuration initiale</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Configurez votre espace</h1>
        <p className="text-gray-500 mt-1">5 etapes pour lancer votre prospection</p>
      </motion.div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.has(step.id)
            const isCurrent = step.id === currentStep
            const Icon = step.icon

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isCompleted || step.id <= currentStep) {
                    setCurrentStep(step.id)
                    setErrors([])
                    setConnectionTest(null)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/30'
                    : isCompleted
                      ? 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!isCompleted && step.id > currentStep}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
            )
          })}
        </div>

        {/* Progress line */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card p-6 mb-6">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stepConfig.gradient} flex items-center justify-center`}>
                <StepIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Etape {currentStep} — {stepConfig.title}
                </h2>
                <p className="text-sm text-gray-500">{stepConfig.subtitle}</p>
              </div>
            </div>

            {/* Step form */}
            {currentStep === 1 && (
              <Step1Company form={form} updateField={updateField} />
            )}
            {currentStep === 2 && (
              <Step2WhatsApp
                form={form}
                updateField={updateField}
                connectionTest={connectionTest}
                showPassword={showPassword}
                togglePassword={togglePassword}
              />
            )}
            {currentStep === 3 && (
              <Step3Email
                form={form}
                updateField={updateField}
                showPassword={showPassword}
                togglePassword={togglePassword}
              />
            )}
            {currentStep === 4 && (
              <Step4Social
                form={form}
                updateField={updateField}
                showPassword={showPassword}
                togglePassword={togglePassword}
              />
            )}
            {currentStep === 5 && (
              <Step5Prospection form={form} updateField={updateField} />
            )}

            {/* Errors */}
            <AnimatePresence>
              {errors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connection test result */}
            <AnimatePresence>
              {connectionTest && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mt-4 p-3 rounded-lg border ${
                    connectionTest.connected || connectionTest.valid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {connectionTest.connected || connectionTest.valid ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={connectionTest.connected || connectionTest.valid ? 'text-green-700' : 'text-amber-700'}>
                      {connectionTest.message}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
              className="btn-ghost flex items-center gap-2 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Precedent
            </button>

            <div className="flex items-center gap-3">
              {currentStep < 5 && (
                <span className="text-xs text-gray-400">
                  {currentStep}/5
                </span>
              )}

              {currentStep < 5 ? (
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {saving ? 'Validation...' : 'Suivant'}
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {saving ? 'Finalisation...' : 'Lancer la prospection'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Step 1 — Infos entreprise
// ============================================

function Step1Company({ form, updateField }) {
  return (
    <div className="space-y-4">
      <FormField
        label="Nom de l'entreprise"
        required
        value={form.companyName}
        onChange={(v) => updateField('companyName', v)}
        placeholder="Ex: Mon Agence Marketing"
        icon={Building2}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Secteur d'activite <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => updateField('industry', ind)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                form.industry === ind
                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500/30 font-medium'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      <FormField
        label="Cible prospect"
        required
        value={form.targetAudience}
        onChange={(v) => updateField('targetAudience', v)}
        placeholder="Ex: PME dans le digital, 10-50 employes, Ile-de-France"
        icon={Users}
        multiline
      />

      <FormField
        label="Site web"
        value={form.website}
        onChange={(v) => updateField('website', v)}
        placeholder="https://monagence.fr"
        icon={Globe}
      />
    </div>
  )
}

// ============================================
// Step 2 — WhatsApp / Evolution API
// ============================================

function Step2WhatsApp({ form, updateField, connectionTest, showPassword, togglePassword }) {
  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Activer WhatsApp</p>
            <p className="text-xs text-gray-500">Via Evolution API (self-hosted, gratuit)</p>
          </div>
        </div>
        <ToggleSwitch
          enabled={form.whatsappEnabled}
          onChange={(v) => updateField('whatsappEnabled', v)}
        />
      </div>

      <AnimatePresence>
        {form.whatsappEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <FormField
              label="URL Evolution API"
              required
              value={form.evolutionApiUrl}
              onChange={(v) => updateField('evolutionApiUrl', v)}
              placeholder="https://evolution.monserveur.com"
              icon={Globe}
            />

            <FormField
              label="Cle API"
              required
              value={form.evolutionApiKey}
              onChange={(v) => updateField('evolutionApiKey', v)}
              placeholder="Votre cle API Evolution"
              type={showPassword.evolutionApiKey ? 'text' : 'password'}
              icon={Zap}
              suffix={
                <button
                  type="button"
                  onClick={() => togglePassword('evolutionApiKey')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword.evolutionApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <FormField
              label="Nom de l'instance"
              required
              value={form.evolutionInstanceName}
              onChange={(v) => updateField('evolutionInstanceName', v)}
              placeholder="Ex: main-instance"
              icon={Settings2}
            />

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">
                La connexion sera testee automatiquement a la validation de cette etape.
                Assurez-vous que votre instance est demarree et connectee a un numero WhatsApp.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!form.whatsappEnabled && (
        <p className="text-sm text-gray-400 italic">
          WhatsApp est desactive. Vous pourrez l'activer plus tard dans les parametres.
        </p>
      )}
    </div>
  )
}

// ============================================
// Step 3 — Email (SMTP ou Instantly)
// ============================================

function Step3Email({ form, updateField, showPassword, togglePassword }) {
  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Activer l'email</p>
            <p className="text-xs text-gray-500">SMTP personnalise ou Instantly</p>
          </div>
        </div>
        <ToggleSwitch
          enabled={form.emailEnabled}
          onChange={(v) => updateField('emailEnabled', v)}
        />
      </div>

      <AnimatePresence>
        {form.emailEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Provider selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fournisseur email
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateField('emailProvider', 'smtp')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.emailProvider === 'smtp'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Mail className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">SMTP</span>
                  <p className="text-xs text-gray-400 mt-0.5">Serveur personnalise</p>
                </button>
                <button
                  onClick={() => updateField('emailProvider', 'instantly')}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    form.emailProvider === 'instantly'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Zap className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Instantly</span>
                  <p className="text-xs text-gray-400 mt-0.5">Plateforme cold email</p>
                </button>
              </div>
            </div>

            {/* SMTP Fields */}
            {form.emailProvider === 'smtp' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Serveur SMTP"
                    required
                    value={form.smtpHost}
                    onChange={(v) => updateField('smtpHost', v)}
                    placeholder="smtp.gmail.com"
                  />
                  <FormField
                    label="Port"
                    required
                    value={form.smtpPort}
                    onChange={(v) => updateField('smtpPort', Number(v) || 587)}
                    placeholder="587"
                    type="number"
                  />
                </div>
                <FormField
                  label="Utilisateur SMTP"
                  required
                  value={form.smtpUser}
                  onChange={(v) => updateField('smtpUser', v)}
                  placeholder="email@mondomaine.com"
                />
                <FormField
                  label="Mot de passe SMTP"
                  required
                  value={form.smtpPass}
                  onChange={(v) => updateField('smtpPass', v)}
                  placeholder="Mot de passe ou App Password"
                  type={showPassword.smtpPass ? 'text' : 'password'}
                  suffix={
                    <button
                      type="button"
                      onClick={() => togglePassword('smtpPass')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showPassword.smtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                <FormField
                  label="Email expediteur"
                  required
                  value={form.emailFrom}
                  onChange={(v) => updateField('emailFrom', v)}
                  placeholder="prospection@mondomaine.com"
                  icon={Send}
                />
              </div>
            )}

            {/* Instantly Fields */}
            {form.emailProvider === 'instantly' && (
              <FormField
                label="Cle API Instantly"
                required
                value={form.instantlyApiKey}
                onChange={(v) => updateField('instantlyApiKey', v)}
                placeholder="Votre cle API Instantly"
                type={showPassword.instantlyApiKey ? 'text' : 'password'}
                icon={Zap}
                suffix={
                  <button
                    type="button"
                    onClick={() => togglePassword('instantlyApiKey')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showPassword.instantlyApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// Step 4 — Reseaux sociaux (optionnel)
// ============================================

function Step4Social({ form, updateField, showPassword, togglePassword }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-2">
        Ces canaux sont optionnels. Vous pourrez les configurer plus tard.
      </p>

      {/* Typefully */}
      <div className="p-4 rounded-lg border border-gray-200 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Twitter className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Typefully</p>
            <p className="text-xs text-gray-500">Publication automatique Twitter/X</p>
          </div>
        </div>
        <FormField
          value={form.typefullyApiKey}
          onChange={(v) => updateField('typefullyApiKey', v)}
          placeholder="Cle API Typefully (optionnel)"
          type={showPassword.typefullyApiKey ? 'text' : 'password'}
          suffix={
            <button
              type="button"
              onClick={() => togglePassword('typefullyApiKey')}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPassword.typefullyApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
      </div>

      {/* Instagram */}
      <div className="p-4 rounded-lg border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Instagram</p>
              <p className="text-xs text-gray-500">DM prospection automatique</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={form.instagramEnabled}
            onChange={(v) => updateField('instagramEnabled', v)}
          />
        </div>
        {form.instagramEnabled && (
          <FormField
            value={form.instagramHandle}
            onChange={(v) => updateField('instagramHandle', v)}
            placeholder="@votre_compte"
            icon={Instagram}
          />
        )}
      </div>

      {/* LinkedIn */}
      <div className="p-4 rounded-lg border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Linkedin className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">LinkedIn</p>
              <p className="text-xs text-gray-500">Connexion via HeyReach</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={form.linkedinEnabled}
            onChange={(v) => updateField('linkedinEnabled', v)}
          />
        </div>
        {form.linkedinEnabled && (
          <FormField
            value={form.linkedinApiKey}
            onChange={(v) => updateField('linkedinApiKey', v)}
            placeholder="Cle API HeyReach (optionnel)"
            type={showPassword.linkedinApiKey ? 'text' : 'password'}
            suffix={
              <button
                type="button"
                onClick={() => togglePassword('linkedinApiKey')}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword.linkedinApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// Step 5 — Prospection (horaires, budget, lead factory)
// ============================================

function Step5Prospection({ form, updateField }) {
  return (
    <div className="space-y-5">
      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            Fuseau horaire
          </div>
        </label>
        <select
          value={form.timezone}
          onChange={(e) => updateField('timezone', e.target.value)}
          className="input-field"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Business hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            Heures d'envoi
          </div>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Debut</label>
            <select
              value={form.businessHoursStart}
              onChange={(e) => updateField('businessHoursStart', Number(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fin</label>
            <select
              value={form.businessHoursEnd}
              onChange={(e) => updateField('businessHoursEnd', Number(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Les messages seront envoyes uniquement pendant ces heures.
        </p>
      </div>

      {/* Daily budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Send className="w-4 h-4 text-gray-400" />
            Budget quotidien (messages/jour)
          </div>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={500}
            value={form.dailyBudget}
            onChange={(e) => updateField('dailyBudget', Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-lg font-bold text-indigo-600 w-16 text-right">
            {form.dailyBudget}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 msg/jour</span>
          <span>500 msg/jour</span>
        </div>
      </div>

      {/* Lead Factory */}
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-600" />
          <p className="text-sm font-medium text-gray-900">Lead Factory</p>
        </div>
        <p className="text-xs text-gray-500">
          Rechargement automatique du pipeline quand il passe sous le seuil.
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Recharge automatique</span>
          <ToggleSwitch
            enabled={form.autoRefill}
            onChange={(v) => updateField('autoRefill', v)}
          />
        </div>

        <FormField
          label="Seuil de recharge"
          value={form.pipelineThreshold}
          onChange={(v) => updateField('pipelineThreshold', Number(v) || 50)}
          placeholder="50"
          type="number"
        />

        <FormField
          label="Requetes de recherche"
          value={form.queries}
          onChange={(v) => updateField('queries', v)}
          placeholder="Ex: agence marketing Paris, consultant digital Lyon"
          multiline
        />

        <FormField
          label="Villes / zones"
          value={form.locations}
          onChange={(v) => updateField('locations', v)}
          placeholder="Ex: Paris, Lyon, Marseille"
        />
      </div>

      {/* Auto-start */}
      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Demarrer automatiquement</p>
            <p className="text-xs text-gray-500">Lancer la prospection des la fin du setup</p>
          </div>
        </div>
        <ToggleSwitch
          enabled={form.autoStart}
          onChange={(v) => updateField('autoStart', v)}
        />
      </div>
    </div>
  )
}

// ============================================
// Setup Complete Screen
// ============================================

function SetupCompleteScreen() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
      >
        <CheckCircle2 className="w-10 h-10 text-white" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Configuration terminee !
        </h1>
        <p className="text-gray-500 mb-8">
          Votre espace de prospection est pret. Les canaux actifs vont commencer
          a fonctionner selon vos parametres.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/app"
            className="btn-primary flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            Aller au Dashboard
          </a>
          <a
            href="/app/settings"
            className="btn-ghost flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Modifier les parametres
          </a>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================
// Shared UI Components
// ============================================

function FormField({ label, required, value, onChange, placeholder, type = 'text', icon: Icon, multiline, suffix }) {
  const inputClasses = 'input-field w-full' + (Icon ? ' pl-9' : '') + (suffix ? ' pr-10' : '')

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={inputClasses + ' resize-none'}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputClasses}
          />
        )}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-indigo-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
