/**
 * ProductProfileEditor
 * Permet au client FMF de configurer ce qu'Alex vend et comment.
 * Sauvegarde via Cloud Function updateProductProfile.
 */
import { useState, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import toast from 'react-hot-toast'

const ANGLES = [
  { value: 'avis_google', label: 'Avis Google / e-reputation' },
  { value: 'ca_manque', label: 'CA ou clients manques' },
  { value: 'facturation', label: 'Reduction de facture (energie, etc.)' },
  { value: 'recrutement', label: 'Difficulte a recruter' },
  { value: 'urgence_reglementaire', label: 'Obligation reglementaire' },
  { value: 'opportunite_marche', label: 'Opportunite de marche' },
]

const TONALITES = [
  { value: 'chaleureux_direct', label: 'Chaleureux et direct (artisans, TPE)' },
  { value: 'professionnel_direct', label: 'Professionnel et concis (PME, cadres)' },
  { value: 'bienveillant_voisin', label: 'Voisin bienveillant (B2C local)' },
  { value: 'expert_conseil', label: 'Expert qui conseille (ETI, grandes PME)' },
]

export default function ProductProfileEditor() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const [profile, setProfile] = useState({
    product: {
      nom: '',
      valeurPrincipale: '',
      preuves: [],
      angleAccroche: 'avis_google',
    },
    target: {
      description: '',
      painPoint: '',
      tonalite: 'chaleureux_direct',
    },
    objections: {
      pas_interesse: '',
      trop_cher: '',
      pas_le_temps: '',
      deja_gere: '',
      concurrent: '',
    },
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const getProfile = httpsCallable(functions, 'getProductProfileCallable')
    getProfile({ orgId })
      .then((r) => {
        if (r.data?.profile) setProfile(r.data.profile)
      })
      .catch((e) => console.warn('Could not load profile:', e))
      .finally(() => setLoading(false))
  }, [orgId])

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const updateProfile = httpsCallable(functions, 'updateProductProfile')
      await updateProfile({ orgId, profile })
      toast.success('Profil Alex sauvegarde')
    } catch (e) {
      toast.error('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (path, value) => {
    const keys = path.split('.')
    setProfile((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]]
      }
      obj[keys[keys.length - 1]] = value
      return next
    })
  }

  if (loading) {
    return <div className="card p-6 text-text-muted">Chargement du profil...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-1">Profil produit d'Alex</h2>
        <p className="text-sm text-text-muted">
          Configurez ce qu'Alex vend et pour qui — il s'adapte automatiquement a votre offre.
        </p>
      </div>

      {/* Produit */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Ce qu'Alex vend</h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Nom du produit / service</label>
          <input
            className="input-field w-full"
            placeholder="Ex : Courtage en energie, Recrutement, Logiciel RH..."
            value={profile.product?.nom || ''}
            onChange={(e) => update('product.nom', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Valeur principale (en 1 phrase)</label>
          <input
            className="input-field w-full"
            placeholder="Ex : Reduire la facture energetique de 15 a 30% sans engagement"
            value={profile.product?.valeurPrincipale || ''}
            onChange={(e) => update('product.valeurPrincipale', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Angle d'accroche</label>
          <select
            className="input-field w-full"
            value={profile.product?.angleAccroche || 'avis_google'}
            onChange={(e) => update('product.angleAccroche', e.target.value)}
          >
            {ANGLES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cible */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Votre cible</h3>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Description de la cible</label>
          <input
            className="input-field w-full"
            placeholder="Ex : PME industrielles et logistique avec plus de 2M de CA"
            value={profile.target?.description || ''}
            onChange={(e) => update('target.description', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Leur probleme principal</label>
          <input
            className="input-field w-full"
            placeholder="Ex : Facture energetique trop elevee et mal optimisee"
            value={profile.target?.painPoint || ''}
            onChange={(e) => update('target.painPoint', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Tonalite d'Alex</label>
          <select
            className="input-field w-full"
            value={profile.target?.tonalite || 'chaleureux_direct'}
            onChange={(e) => update('target.tonalite', e.target.value)}
          >
            {TONALITES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Objections */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text uppercase tracking-wide">Reponses aux objections</h3>
        {Object.entries(profile.objections || {}).map(([key, val]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wide">
              Si "{key.replace(/_/g, ' ')}"
            </label>
            <input
              className="input-field w-full"
              placeholder="Reponse d'Alex..."
              value={val || ''}
              onChange={(e) => update(`objections.${key}`, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder le profil Alex'}
      </button>
    </div>
  )
}
