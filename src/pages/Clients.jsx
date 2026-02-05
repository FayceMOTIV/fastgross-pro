import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients } from '@/hooks/useFirestore'
import toast from 'react-hot-toast'
import { Users, Plus, Globe, Scan, Mail, MoreHorizontal, Search } from 'lucide-react'

export default function Clients() {
  const navigate = useNavigate()
  const { clients, loading, add } = useClients()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = clients.filter(
    (c) =>
      !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.url?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName) return
    try {
      await add({ name: newName, url: newUrl, status: 'new' })
      toast.success(`Client "${newName}" ajouté`)
      setNewName('')
      setNewUrl('')
      setShowAdd(false)
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du client')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Clients
          </h1>
          <p className="text-dark-400 mt-1">Gérez vos clients et leurs campagnes</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Ajouter un client
        </button>
      </div>

      {/* Add client modal */}
      {showAdd && (
        <div className="glass-card p-6 max-w-lg border-brand-500/20">
          <h3 className="section-title mb-4">Nouveau client</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Nom</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" placeholder="Nom du client" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Site web (optionnel)</label>
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input-field" placeholder="https://..." />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary text-sm">Ajouter</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10 py-2.5"
          placeholder="Rechercher..."
        />
      </div>

      {/* Client grid */}
      {filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Users className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-dark-400">Aucun client</h3>
          <p className="text-dark-500 text-sm mt-2">Ajoutez votre premier client pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="glass-card-hover p-6 space-y-4 cursor-pointer"
              onClick={() => navigate(`/app/clients/${client.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400/20 to-blue-400/20 flex items-center justify-center text-lg font-display font-bold text-brand-400">
                    {client.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{client.name}</h3>
                    {client.url && (
                      <p className="text-xs text-dark-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {client.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </p>
                    )}
                  </div>
                </div>
                <button className="p-1 rounded-lg hover:bg-dark-700 text-dark-500">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-dark-500">
                <span className="flex items-center gap-1">
                  <Scan className="w-3.5 h-3.5" />
                  {client.status === 'scanned' ? 'Analysé' : 'Non analysé'}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  0 séquences
                </span>
              </div>

              <span className={client.status === 'scanned' ? 'badge-success' : client.status === 'scanning' ? 'badge-warning' : 'badge-info'}>
                {client.status === 'scanned' ? 'Actif' : client.status === 'scanning' ? 'En analyse' : 'Nouveau'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
