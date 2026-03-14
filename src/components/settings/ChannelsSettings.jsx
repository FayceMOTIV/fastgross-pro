import { useState, useEffect } from 'react'
import {
  Mail,
  Zap,
  Save,
  Loader2,
  Smartphone,
  Instagram,
  Mic,
  MapPin,
  Euro,
  ToggleLeft,
  ToggleRight,
  MessageCircle,
  Send,
  Linkedin,
  Map,
} from 'lucide-react'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import toast from 'react-hot-toast'

export default function ChannelsSettings({ saving, setSaving }) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
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
  const [socialDmEnabled, setSocialDmEnabled] = useState(false)
  const [whatsappOutreachEnabled, setWhatsappOutreachEnabled] = useState(false)
  const [socialDmDailyLimit, setSocialDmDailyLimit] = useState(30)
  const [whatsappOutreachDailyLimit, setWhatsappOutreachDailyLimit] = useState(50)
  const [linkedinEnabled, setLinkedinEnabled] = useState(false)
  const [linkedinApiKey, setLinkedinApiKey] = useState('')
  const [linkedinDailyLimit, setLinkedinDailyLimit] = useState(20)
  const [googleMapsEnabled, setGoogleMapsEnabled] = useState(false)
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')

  useEffect(() => {
    if (!currentOrg?.id || isDemo) return
    getDoc(doc(db, 'organizations', currentOrg.id, 'settings', 'channels'))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data()
          if (d.smsEnabled !== undefined) setSmsEnabled(d.smsEnabled)
          if (d.smsPhone !== undefined) setSmsPhone(d.smsPhone)
          if (d.instagramEnabled !== undefined) setInstagramEnabled(d.instagramEnabled)
          if (d.instagramHandle !== undefined) setInstagramHandle(d.instagramHandle)
          if (d.voicemailEnabled !== undefined) setVoicemailEnabled(d.voicemailEnabled)
          if (d.voicemailMethod !== undefined) setVoicemailMethod(d.voicemailMethod)
          if (d.voicemailVoice !== undefined) setVoicemailVoice(d.voicemailVoice)
          if (d.courrierEnabled !== undefined) setCourrierEnabled(d.courrierEnabled)
          if (d.courrierMonthlyBudget !== undefined)
            setCourrierMonthlyBudget(d.courrierMonthlyBudget)
          if (d.courrierAddress !== undefined) setCourrierAddress(d.courrierAddress)
          if (d.socialDmEnabled !== undefined) setSocialDmEnabled(d.socialDmEnabled)
          if (d.whatsappOutreachEnabled !== undefined)
            setWhatsappOutreachEnabled(d.whatsappOutreachEnabled)
          if (d.socialDmDailyLimit !== undefined) setSocialDmDailyLimit(d.socialDmDailyLimit)
          if (d.whatsappOutreachDailyLimit !== undefined)
            setWhatsappOutreachDailyLimit(d.whatsappOutreachDailyLimit)
          if (d.linkedinEnabled !== undefined) setLinkedinEnabled(d.linkedinEnabled)
          if (d.linkedinApiKey !== undefined) setLinkedinApiKey(d.linkedinApiKey)
          if (d.linkedinDailyLimit !== undefined) setLinkedinDailyLimit(d.linkedinDailyLimit)
          if (d.googleMapsEnabled !== undefined) setGoogleMapsEnabled(d.googleMapsEnabled)
          if (d.googleMapsApiKey !== undefined) setGoogleMapsApiKey(d.googleMapsApiKey)
        }
      })
      .catch(() => {})
  }, [currentOrg?.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (currentOrg?.id && !isDemo) {
        await setDoc(
          doc(db, 'organizations', currentOrg.id, 'settings', 'channels'),
          {
            smsEnabled,
            smsPhone,
            instagramEnabled,
            instagramHandle,
            voicemailEnabled,
            voicemailMethod,
            voicemailVoice,
            courrierEnabled,
            courrierMonthlyBudget,
            courrierAddress,
            socialDmEnabled,
            whatsappOutreachEnabled,
            socialDmDailyLimit,
            whatsappOutreachDailyLimit,
            linkedinEnabled,
            linkedinApiKey,
            linkedinDailyLimit,
            googleMapsEnabled,
            googleMapsApiKey,
            updatedAt: new Date(),
          },
          { merge: true }
        )
      }
      toast.success('Configuration des canaux sauvegardee')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <Zap className="w-5 h-5 text-brand-400" />
        <h2 className="section-title">Configuration des canaux</h2>
      </div>

      <p className="text-sm text-gray-500">
        Configurez les canaux de contact pour vos sequences multicanales. Plus de canaux = plus de
        chances de reponse.
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
              <p className="text-sm text-gray-500">Canal principal - toujours actif</p>
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
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.sms.bg}`}
              >
                <Smartphone className={`w-5 h-5 ${CHANNEL_STYLES.sms.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-white">SMS / WhatsApp</h3>
                <p className="text-sm text-gray-500">
                  Taux d'ouverture de 98% - max 2 par prospect
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSmsEnabled(!smsEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              smsEnabled ? 'bg-brand-500' : 'bg-gray-200'
            }`}
          >
            {smsEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        {smsEnabled && (
          <div className="mt-4 ml-13 p-4 rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Numero d'envoi SMS
            </label>
            <input
              type="tel"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              className="input-field"
              placeholder="+33 6 12 34 56 78"
            />
            <p className="text-xs text-gray-400 mt-2">
              Le numero depuis lequel les SMS seront envoyes (necessite integration Twilio)
            </p>
          </div>
        )}
      </div>

      {/* Instagram DM — Sur demande */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10 opacity-75">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.instagram_dm.bg}`}
              >
                <Instagram className={`w-5 h-5 ${CHANNEL_STYLES.instagram_dm.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Instagram DM</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold uppercase">
                    Sur demande
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Approche sociale pour commerces locaux - max 1 DM
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 ml-13 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <p className="text-xs text-amber-400/80">
            Disponible pour les plans Pro et Enterprise sur demande. Contactez-nous a
            contact@face-media-factory.com pour activer ce canal.
          </p>
        </div>
      </div>

      {/* Voicemail — Bientot disponible */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10 opacity-60">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.voicemail.bg}`}
              >
                <Mic className={`w-5 h-5 ${CHANNEL_STYLES.voicemail.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Message vocal</h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-semibold uppercase">
                    Bientot disponible
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Voicemail drop — le telephone ne sonne pas. Disponible Q2 2026.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courrier postal — Bientot disponible */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10 opacity-60">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.courrier.bg}`}
              >
                <MapPin className={`w-5 h-5 ${CHANNEL_STYLES.courrier.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Courrier postal</h3>
                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-semibold uppercase">
                    Bientot disponible
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Envoi de courrier physique automatise — carte + QR code. Disponible Q2 2026.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social DM Outreach */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Social DM Outreach</h3>
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                    NEW
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Cold DM automatise via Instagram et WhatsApp avec anti-ban
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Instagram DM Outreach toggle */}
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-medium text-white">Instagram Cold DM</span>
              </div>
              <button
                onClick={() => setSocialDmEnabled(!socialDmEnabled)}
                className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                  socialDmEnabled ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              >
                {socialDmEnabled ? (
                  <ToggleRight className="w-6 h-6 text-white" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-500" />
                )}
              </button>
            </div>
            {socialDmEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Limite quotidienne par compte
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={socialDmDailyLimit}
                    onChange={(e) => setSocialDmDailyLimit(parseInt(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-sm font-medium text-white min-w-[60px]">
                    {socialDmDailyLimit}/jour
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Warmup progressif : jour 1-3 = 3/jour, jour 4-7 = 15/jour, puis augmentation
                  graduelle
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp Outreach toggle */}
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">WhatsApp Outreach</span>
              </div>
              <button
                onClick={() => setWhatsappOutreachEnabled(!whatsappOutreachEnabled)}
                className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                  whatsappOutreachEnabled ? 'bg-brand-500' : 'bg-gray-200'
                }`}
              >
                {whatsappOutreachEnabled ? (
                  <ToggleRight className="w-6 h-6 text-white" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-500" />
                )}
              </button>
            </div>
            {whatsappOutreachEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Limite quotidienne par instance
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={whatsappOutreachDailyLimit}
                    onChange={(e) => setWhatsappOutreachDailyLimit(parseInt(e.target.value))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-sm font-medium text-white min-w-[60px]">
                    {whatsappOutreachDailyLimit}/jour
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Evolution API avec anti-ban : horaires business, rotation instances, monitoring
                  block rate
                </p>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-400">
              Le systeme anti-ban gere automatiquement le warmup progressif, les horaires d'envoi et
              la rotation des comptes/instances. Gerez vos campagnes depuis la page Social DM.
            </p>
          </div>
        </div>
      </div>

      {/* LinkedIn */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">LinkedIn</h3>
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                    NEW
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Prospection LinkedIn automatisee via HeyReach
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setLinkedinEnabled(!linkedinEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              linkedinEnabled ? 'bg-brand-500' : 'bg-gray-200'
            }`}
          >
            {linkedinEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        {linkedinEnabled && (
          <div className="mt-4 ml-13 p-4 rounded-lg bg-gray-50 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Cle API HeyReach
              </label>
              <input
                type="password"
                value={linkedinApiKey}
                onChange={(e) => setLinkedinApiKey(e.target.value)}
                className="input-field"
                placeholder="hr_api_..."
              />
              <p className="text-xs text-gray-400 mt-2">
                Obtenez votre cle API depuis votre compte HeyReach
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Limite quotidienne (connexions + messages)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={linkedinDailyLimit}
                  onChange={(e) => setLinkedinDailyLimit(parseInt(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-sm font-medium text-white min-w-[60px]">
                  {linkedinDailyLimit}/jour
                </span>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400">
                HeyReach gere automatiquement la rotation des comptes et le warmup. Gerez vos
                comptes et campagnes depuis la page LinkedIn.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Google Maps Sourcing */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Map className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">Google Maps Sourcing</h3>
                  <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs">
                    NEW
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Scraping et enrichissement de prospects via Google Maps (Apify)
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setGoogleMapsEnabled(!googleMapsEnabled)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              googleMapsEnabled ? 'bg-brand-500' : 'bg-gray-200'
            }`}
          >
            {googleMapsEnabled ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>

        {googleMapsEnabled && (
          <div className="mt-4 ml-13 p-4 rounded-lg bg-gray-50 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Cle API Apify</label>
              <input
                type="password"
                value={googleMapsApiKey}
                onChange={(e) => setGoogleMapsApiKey(e.target.value)}
                className="input-field"
                placeholder="apify_api_..."
              />
              <p className="text-xs text-gray-400 mt-2">
                Utilisee pour le scraping avance Google Maps. Sans cle, le systeme utilise
                Serper.dev en fallback.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">
                Lancez vos recherches depuis la page Google Maps Sourcing. Les resultats sont
                automatiquement enrichis et qualifies par l'IA.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </div>
  )
}
