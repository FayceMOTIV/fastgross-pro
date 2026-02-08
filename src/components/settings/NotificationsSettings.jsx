import { useState } from 'react'
import { Bell, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function NotificationsSettings({ saving, setSaving }) {
  const { user } = useAuth()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifyOnReply, setNotifyOnReply] = useState(true)
  const [notifyOnOpen, setNotifyOnOpen] = useState(false)
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)

  const handleSave = async () => {
    setSaving(true)
    try {
      toast.success('Notifications sauvegardees')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
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
