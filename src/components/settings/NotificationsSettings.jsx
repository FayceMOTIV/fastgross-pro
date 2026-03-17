import { useState, useEffect } from 'react'
import { Bell, Save, Loader2, ToggleLeft, ToggleRight, Smartphone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { updateOrganization } from '@/services/organization'
import toast from 'react-hot-toast'

export default function NotificationsSettings({ saving, setSaving }) {
  const { user } = useAuth()
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifyOnReply, setNotifyOnReply] = useState(true)
  const [notifyOnOpen, setNotifyOnOpen] = useState(false)
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true)
  const [notifyWeeklyReport, setNotifyWeeklyReport] = useState(true)
  const [ownerPhone, setOwnerPhone] = useState(currentOrg?.ownerPhone || '')

  useEffect(() => {
    if (!currentOrg?.id || isDemo) return
    getDoc(doc(db, 'organizations', currentOrg.id, 'settings', 'notifications')).then((snap) => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.emailNotifications !== undefined) setEmailNotifications(d.emailNotifications)
        if (d.notifyOnReply !== undefined) setNotifyOnReply(d.notifyOnReply)
        if (d.notifyOnOpen !== undefined) setNotifyOnOpen(d.notifyOnOpen)
        if (d.notifyDailyDigest !== undefined) setNotifyDailyDigest(d.notifyDailyDigest)
        if (d.notifyWeeklyReport !== undefined) setNotifyWeeklyReport(d.notifyWeeklyReport)
      }
    }).catch(() => {})
  }, [currentOrg?.id])

  const saveOwnerPhone = async () => {
    const clean = ownerPhone.replace(/[\s.-]/g, '')
    if (clean && !/^(?:\+33|0)[67]\d{8}$/.test(clean)) {
      toast.error('Numero invalide (format: 06 ou +33)')
      return
    }
    const normalized = clean.startsWith('0') ? '+33' + clean.slice(1) : clean
    try {
      await updateOrganization(currentOrg.id, { ownerPhone: normalized || null })
      toast.success('Numero WhatsApp enregistre')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (currentOrg?.id && !isDemo) {
        await setDoc(doc(db, 'organizations', currentOrg.id, 'settings', 'notifications'), {
          emailNotifications, notifyOnReply, notifyOnOpen,
          notifyDailyDigest, notifyWeeklyReport, updatedAt: new Date()
        }, { merge: true })
      }
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

      {/* WhatsApp owner alerts */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-green-500" />
          <h3 className="font-medium text-white">Alertes WhatsApp</h3>
        </div>
        <p className="text-xs text-gray-500">
          Recevez une notification WhatsApp quand un prospect depose un document
        </p>
        <div className="flex gap-2">
          <input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            className="input-field flex-1"
          />
          <button
            onClick={saveOwnerPhone}
            className="btn-primary text-sm px-4"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Email notifications toggle */}
      <div className="p-5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Notifications par email</h3>
            <p className="text-sm text-gray-500 mt-1">
              Recevoir les notifications sur {user?.email}
            </p>
          </div>
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              emailNotifications ? 'bg-brand-500' : 'bg-gray-200'
            }`}
          >
            {emailNotifications ? (
              <ToggleRight className="w-8 h-8 text-white" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {emailNotifications && (
        <div className="space-y-3 ml-4">
          {/* Notify on reply */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-white">Nouvelles reponses</p>
              <p className="text-xs text-gray-400">Quand un prospect repond a votre email</p>
            </div>
            <button
              onClick={() => setNotifyOnReply(!notifyOnReply)}
              className={`p-0.5 rounded-full transition-colors ${
                notifyOnReply ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            >
              {notifyOnReply ? (
                <ToggleRight className="w-6 h-6 text-white" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-500" />
              )}
            </button>
          </div>

          {/* Notify on open */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-white">Ouvertures d'email</p>
              <p className="text-xs text-gray-400">Quand un prospect ouvre votre email</p>
            </div>
            <button
              onClick={() => setNotifyOnOpen(!notifyOnOpen)}
              className={`p-0.5 rounded-full transition-colors ${
                notifyOnOpen ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            >
              {notifyOnOpen ? (
                <ToggleRight className="w-6 h-6 text-white" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-500" />
              )}
            </button>
          </div>

          {/* Daily digest */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-white">Resume quotidien</p>
              <p className="text-xs text-gray-400">Recap de la journee chaque soir a 18h</p>
            </div>
            <button
              onClick={() => setNotifyDailyDigest(!notifyDailyDigest)}
              className={`p-0.5 rounded-full transition-colors ${
                notifyDailyDigest ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            >
              {notifyDailyDigest ? (
                <ToggleRight className="w-6 h-6 text-white" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-500" />
              )}
            </button>
          </div>

          {/* Weekly report */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-white">Rapport hebdomadaire</p>
              <p className="text-xs text-gray-400">Statistiques de la semaine chaque lundi</p>
            </div>
            <button
              onClick={() => setNotifyWeeklyReport(!notifyWeeklyReport)}
              className={`p-0.5 rounded-full transition-colors ${
                notifyWeeklyReport ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            >
              {notifyWeeklyReport ? (
                <ToggleRight className="w-6 h-6 text-white" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-gray-500" />
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
