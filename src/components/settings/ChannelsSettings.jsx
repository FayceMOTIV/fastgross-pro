import { useState } from 'react'
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
} from 'lucide-react'
import { CHANNEL_STYLES } from '@/engine/multiChannelEngine'
import toast from 'react-hot-toast'

export default function ChannelsSettings({ saving, setSaving }) {
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

  const handleSave = async () => {
    setSaving(true)
    try {
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

      <p className="text-sm text-dark-400">
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
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.sms.bg}`}
              >
                <Smartphone className={`w-5 h-5 ${CHANNEL_STYLES.sms.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-white">SMS / WhatsApp</h3>
                <p className="text-sm text-dark-400">
                  Taux d'ouverture de 98% - max 2 par prospect
                </p>
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
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.instagram_dm.bg}`}
              >
                <Instagram className={`w-5 h-5 ${CHANNEL_STYLES.instagram_dm.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-white">Instagram DM</h3>
                <p className="text-sm text-dark-400">
                  Approche sociale pour commerces locaux - max 1 DM
                </p>
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Compte Instagram</label>
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
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${CHANNEL_STYLES.voicemail.bg}`}
              >
                <Mic className={`w-5 h-5 ${CHANNEL_STYLES.voicemail.color}`} />
              </div>
              <div>
                <h3 className="font-medium text-white">Message vocal</h3>
                <p className="text-sm text-dark-400">
                  Voicemail drop - le telephone ne sonne pas - max 1
                </p>
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
                <label className="block text-sm font-medium text-dark-300 mb-2">Voix TTS</label>
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
              Le message vocal est depose directement dans la messagerie sans faire sonner le
              telephone. Duree max : 30 secondes.
            </p>
          </div>
        )}
      </div>

      {/* Courrier postal */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
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
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs">
                    Premium
                  </span>
                </div>
                <p className="text-sm text-dark-400">
                  Carte personnalisee avec QR code - 2.50 EUR/envoi
                </p>
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
                Le courrier postal est reserve aux prospects chauds (score &ge; 70%) ou en derniere
                etape de sequence. Chaque carte inclut un QR code personnalise pour le tracking.
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
