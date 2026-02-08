import { useState } from 'react'
import { Wrench, Database, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DevSettings() {
  const [seeding, setSeeding] = useState(false)

  const handleSeedData = async () => {
    setSeeding(true)
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project'
      const response = await fetch(`http://localhost:5001/${projectId}/europe-west1/seedData`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        toast.success(
          `Donnees de demo creees : ${data.data.leads} leads, ${data.data.clients} clients`
        )
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Seed error:', error)
      toast.error('Erreur : verifiez que les emulateurs Firebase sont lances')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-semibold text-white">Outils de developpement</h3>
        </div>
        <p className="text-sm text-dark-400 mb-6">
          Ces outils sont disponibles uniquement en environnement de developpement.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-amber-500/20">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Peupler avec des donnees de demo
              </p>
              <p className="text-xs text-dark-500 mt-1">
                Cree 1 organisation, 3 clients, 20 leads, 2 campagnes, 50 events email
              </p>
            </div>
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors flex items-center gap-2"
            >
              {seeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {seeding ? 'En cours...' : 'Seed Data'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-800">
            <p className="text-sm font-medium text-white mb-3">Liens rapides</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="http://localhost:4000"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Firebase Emulator UI
              </a>
              <a
                href="http://localhost:4000/firestore"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Firestore Data
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
