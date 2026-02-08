import { useState } from 'react'
import { Building2, Save, Loader2 } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function OrganizationSettings({ saving, setSaving }) {
  const { currentOrg } = useOrg()
  const [orgName, setOrgName] = useState(currentOrg?.name || '')

  const handleSave = async () => {
    if (!currentOrg) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'organizations', currentOrg.id), {
        name: orgName,
      })
      toast.success('Organisation mise a jour')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
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
          <label className="block text-sm font-medium text-dark-300 mb-2">Identifiant</label>
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
