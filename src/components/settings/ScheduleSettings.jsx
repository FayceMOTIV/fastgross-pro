import { useState } from 'react'
import { Clock, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const dayLabels = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Jeu',
  friday: 'Ven',
  saturday: 'Sam',
  sunday: 'Dim',
}

export default function ScheduleSettings({ saving, setSaving }) {
  const [sendStartHour, setSendStartHour] = useState(9)
  const [sendEndHour, setSendEndHour] = useState(18)
  const [sendDays, setSendDays] = useState(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  const [timezone, setTimezone] = useState('Europe/Paris')

  const toggleDay = (day) => {
    if (sendDays.includes(day)) {
      setSendDays(sendDays.filter((d) => d !== day))
    } else {
      setSendDays([...sendDays, day])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      toast.success('Planification sauvegardee')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
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
            <label className="block text-sm font-medium text-dark-300 mb-2">Debut</label>
            <select
              value={sendStartHour}
              onChange={(e) => setSendStartHour(parseInt(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Fin</label>
            <select
              value={sendEndHour}
              onChange={(e) => setSendEndHour(parseInt(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
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
