import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Save,
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Linkedin,
  Clock,
  Shield,
  Bell,
  FlaskConical,
  Hash,
  Globe,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Info,
} from 'lucide-react'

const MOCK_SETTINGS = {
  name: 'Prospection SaaS France',
  description: 'Campagne de prospection ciblent les entreprises SaaS en France, focus sur les CTO et VP Engineering.',
  channels: {
    email: true,
    sms: false,
    whatsapp: true,
    linkedin: false,
  },
  businessHours: {
    start: 9,
    end: 19,
    timezone: 'Europe/Paris',
  },
  dailyLimits: {
    email: 50,
    sms: 20,
    whatsapp: 15,
    linkedin: 5,
  },
  hitl: {
    enabled: false,
    autoExpiration: '2h',
  },
  dailyDigest: {
    enabled: true,
    hour: 19,
  },
  dryRun: false,
}

const CHANNEL_CONFIG = [
  { key: 'email', label: 'Email', icon: Mail, color: 'indigo' },
  { key: 'sms', label: 'SMS', icon: Phone, color: 'emerald' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'green' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'blue' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

const EXPIRATION_OPTIONS = [
  { value: '1h', label: '1 heure' },
  { value: '2h', label: '2 heures' },
  { value: '4h', label: '4 heures' },
]

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
]

function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className="relative"
      >
        {enabled ? (
          <ToggleRight className="w-10 h-10 text-[#4F6EF7]" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-gray-300" />
        )}
      </button>
    </div>
  )
}

function AccordionSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-[#4F6EF7]" />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CampaignSettings() {
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId') || 'c1'
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [settings, setSettings] = useState(MOCK_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load settings from Firestore in real mode
  useEffect(() => {
    if (isDemo || !currentOrg?.id || !campaignId) return

    const loadSettings = async () => {
      setLoading(true)
      try {
        const ref = doc(db, 'organizations', currentOrg.id, 'campaigns', campaignId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          setSettings({
            name: data.name || '',
            description: data.description || '',
            channels: data.channels || { email: true, sms: false, whatsapp: false, linkedin: false },
            businessHours: data.businessHours || { start: 9, end: 19, timezone: 'Europe/Paris' },
            dailyLimits: data.dailyLimits || { email: 50, sms: 20, whatsapp: 15, linkedin: 5 },
            hitl: data.hitl || { enabled: false, autoExpiration: '2h' },
            dailyDigest: data.dailyDigest || { enabled: true, hour: 19 },
            dryRun: data.dryRun || false,
          })
        }
      } catch (err) {
        console.error('Load campaign settings error:', err)
        toast.error('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [currentOrg?.id, campaignId, isDemo])

  const updateField = (path, value) => {
    setSettings((prev) => {
      const parts = path.split('.')
      const updated = { ...prev }
      let current = updated

      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = { ...current[parts[i]] }
        current = current[parts[i]]
      }
      current[parts[parts.length - 1]] = value

      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (!isDemo && currentOrg?.id && campaignId) {
        const ref = doc(db, 'organizations', currentOrg.id, 'campaigns', campaignId)
        await updateDoc(ref, {
          name: settings.name,
          description: settings.description,
          channels: settings.channels,
          businessHours: settings.businessHours,
          dailyLimits: settings.dailyLimits,
          hitl: settings.hitl,
          dailyDigest: settings.dailyDigest,
          dryRun: settings.dryRun,
          updatedAt: new Date(),
        })
      }
      toast.success('Parametres sauvegardes')
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F6EF7]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/app/campaigns"
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title text-2xl">Parametres campagne</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {settings.name || 'Configuration'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* 1. General */}
        <AccordionSection title="General" icon={Settings} defaultOpen>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom de la campagne
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ex: Prospection SaaS France"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Objectifs, cibles, notes..."
                rows={3}
                className="input-field resize-none"
              />
            </div>
          </div>
        </AccordionSection>

        {/* 2. Canaux actives */}
        <AccordionSection title="Canaux actives" icon={Mail} defaultOpen>
          <div className="space-y-3">
            {CHANNEL_CONFIG.map((ch) => (
              <div
                key={ch.key}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  settings.channels[ch.key]
                    ? 'border-indigo-200 bg-indigo-50/40'
                    : 'border-gray-100 bg-gray-50/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-${ch.color}-100 flex items-center justify-center`}>
                    <ch.icon className={`w-4 h-4 text-${ch.color}-600`} />
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{ch.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateField(`channels.${ch.key}`, !settings.channels[ch.key])}
                >
                  {settings.channels[ch.key] ? (
                    <ToggleRight className="w-9 h-9 text-[#4F6EF7]" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* 3. Horaires d'envoi */}
        <AccordionSection title="Horaires d'envoi" icon={Clock}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Debut
                </label>
                <select
                  value={settings.businessHours.start}
                  onChange={(e) => updateField('businessHours.start', parseInt(e.target.value, 10))}
                  className="input-field"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fin
                </label>
                <select
                  value={settings.businessHours.end}
                  onChange={(e) => updateField('businessHours.end', parseInt(e.target.value, 10))}
                  className="input-field"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fuseau horaire
              </label>
              <select
                value={settings.businessHours.timezone}
                onChange={(e) => updateField('businessHours.timezone', e.target.value)}
                className="input-field"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AccordionSection>

        {/* 4. Limites quotidiennes */}
        <AccordionSection title="Limites quotidiennes" icon={Hash}>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50/60 text-sm text-indigo-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Les limites s'appliquent par jour ouvrable, par canal active.</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {CHANNEL_CONFIG.filter((ch) => settings.channels[ch.key]).map((ch) => (
                <div key={ch.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {ch.label} / jour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={settings.dailyLimits[ch.key] || 0}
                    onChange={(e) =>
                      updateField(`dailyLimits.${ch.key}`, parseInt(e.target.value, 10) || 0)
                    }
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            {CHANNEL_CONFIG.filter((ch) => settings.channels[ch.key]).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Activez au moins un canal pour configurer les limites
              </p>
            )}
          </div>
        </AccordionSection>

        {/* 5. Mode HITL */}
        <AccordionSection title="Mode HITL (approbation manuelle)" icon={Shield}>
          <div className="space-y-4">
            <Toggle
              enabled={settings.hitl.enabled}
              onChange={(v) => updateField('hitl.enabled', v)}
              label="Approbation manuelle"
              description="Chaque message genere doit etre approuve avant envoi"
            />
            {settings.hitl.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expiration automatique
                </label>
                <select
                  value={settings.hitl.autoExpiration}
                  onChange={(e) => updateField('hitl.autoExpiration', e.target.value)}
                  className="input-field"
                >
                  {EXPIRATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Les messages non approuves seront automatiquement envoyes apres ce delai
                </p>
              </motion.div>
            )}
          </div>
        </AccordionSection>

        {/* 6. Daily Digest */}
        <AccordionSection title="Daily Digest" icon={Bell}>
          <div className="space-y-4">
            <Toggle
              enabled={settings.dailyDigest.enabled}
              onChange={(v) => updateField('dailyDigest.enabled', v)}
              label="Resume quotidien"
              description="Recevez un resume des actions de la journee par email"
            />
            {settings.dailyDigest.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Heure d'envoi
                </label>
                <select
                  value={settings.dailyDigest.hour}
                  onChange={(e) =>
                    updateField('dailyDigest.hour', parseInt(e.target.value, 10))
                  }
                  className="input-field"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </div>
        </AccordionSection>

        {/* 7. Dry Run */}
        <AccordionSection title="Dry Run" icon={FlaskConical}>
          <div className="space-y-2">
            <Toggle
              enabled={settings.dryRun}
              onChange={(v) => updateField('dryRun', v)}
              label="Mode test (pas d'envoi reel)"
              description="Les messages seront simules sans etre envoyes aux prospects"
            />
            {settings.dryRun && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-sm text-amber-700"
              >
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Mode test actif : aucun message ne sera envoye. Les statistiques seront simulees.
                </span>
              </motion.div>
            )}
          </div>
        </AccordionSection>
      </div>

      {/* Bottom Save */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder les parametres
        </button>
      </div>
    </div>
  )
}
