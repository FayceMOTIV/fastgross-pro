/**
 * CountrySettings — Configuration pays cibles + templates par langue
 */

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { Globe, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const AVAILABLE_COUNTRIES = [
  { code: 'FR', name: 'France', flag: '🇫🇷', language: 'Francais' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', language: 'Francais' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', language: 'Francais' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', language: 'Francais' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', language: 'Francais' },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', language: 'Francais' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', language: 'Francais' },
  { code: 'CI', name: 'Cote d\'Ivoire', flag: '🇨🇮', language: 'Francais' },
]

export default function CountrySettings() {
  const { currentOrg } = useOrg()
  const [selectedCountries, setSelectedCountries] = useState(['FR'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!currentOrg?.id) return

    const loadConfig = async () => {
      try {
        const snap = await getDoc(
          doc(db, 'organizations', currentOrg.id, 'settings', 'countries')
        )
        if (snap.exists()) {
          setSelectedCountries(snap.data().targetCountries || ['FR'])
        }
      } catch (err) {
        console.error('Load country config error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [currentOrg?.id])

  const toggleCountry = (code) => {
    setSelectedCountries((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev
        return prev.filter((c) => c !== code)
      }
      return [...prev, code]
    })
  }

  const handleSave = async () => {
    if (!currentOrg?.id) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'organizations', currentOrg.id, 'settings', 'countries'),
        {
          targetCountries: selectedCountries,
          updatedAt: new Date(),
        },
        { merge: true }
      )
      toast.success('Pays cibles mis a jour')
    } catch (err) {
      toast.error('Erreur: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-5 h-5 text-indigo-500" />
        <div>
          <h3 className="text-lg font-display font-semibold text-gray-900">
            Pays cibles
          </h3>
          <p className="text-sm text-gray-500">
            Selectionnez les pays ou vous prospectez. Alex adaptera automatiquement la langue, les horaires et la compliance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {AVAILABLE_COUNTRIES.map((country) => {
          const isSelected = selectedCountries.includes(country.code)
          return (
            <button
              key={country.code}
              onClick={() => toggleCountry(country.code)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-2xl">{country.flag}</span>
              <span className="text-sm font-medium text-gray-900">{country.name}</span>
              <span className="text-xs text-gray-500">{country.language}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {selectedCountries.length} pays selectionne{selectedCountries.length > 1 ? 's' : ''}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Sauvegarder
        </button>
      </div>
    </div>
  )
}
