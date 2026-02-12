/**
 * Admin Page
 * Super admin panel for managing beta users
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Shield,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useBetaUsers, useAdminStatus } from '@/hooks/useCloudFunctions'

export default function Admin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getAdminStatus } = useAdminStatus()
  const {
    addBetaUser,
    removeBetaUser,
    listBetaUsers,
    listSuperAdmins,
    loading
  } = useBetaUsers()

  const [adminStatus, setAdminStatus] = useState(null)
  const [betaUsers, setBetaUsers] = useState([])
  const [superAdmins, setSuperAdmins] = useState([])
  const [checking, setChecking] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newReason, setNewReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)

  // Check admin status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setChecking(true)
    try {
      const status = await getAdminStatus()
      setAdminStatus(status)

      if (!status.isSuperAdmin) {
        toast.error('Acces refuse - Super admin requis')
        navigate('/dashboard')
        return
      }

      // Load beta users and super admins
      await loadData()
    } catch (error) {
      console.error('Error checking admin status:', error)
      toast.error('Erreur de verification')
      navigate('/dashboard')
    } finally {
      setChecking(false)
    }
  }

  const loadData = async () => {
    try {
      const [betaResult, adminsResult] = await Promise.all([
        listBetaUsers(),
        listSuperAdmins()
      ])
      setBetaUsers(betaResult.betaUsers || [])
      setSuperAdmins(adminsResult.superAdmins || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Erreur de chargement')
    }
  }

  const handleAddBetaUser = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setAdding(true)
    try {
      await addBetaUser({
        email: newEmail.trim(),
        reason: newReason.trim() || 'Added by super admin'
      })
      toast.success(`${newEmail} ajoute comme utilisateur beta`)
      setNewEmail('')
      setNewReason('')
      await loadData()
    } catch (error) {
      console.error('Error adding beta user:', error)
      toast.error(error.message || 'Erreur lors de l\'ajout')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveBetaUser = async (userId, email) => {
    if (!confirm(`Retirer ${email} des utilisateurs beta ?`)) return

    setRemoving(userId)
    try {
      await removeBetaUser({ userId })
      toast.success(`${email} retire des utilisateurs beta`)
      await loadData()
    } catch (error) {
      console.error('Error removing beta user:', error)
      toast.error(error.message || 'Erreur lors de la suppression')
    } finally {
      setRemoving(null)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-4" />
          <p className="text-dark-400">Verification des droits...</p>
        </div>
      </div>
    )
  }

  if (!adminStatus?.isSuperAdmin) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Shield className="w-8 h-8 text-brand-400" />
          Administration
        </h1>
        <p className="text-dark-400 mt-1">
          Gestion des utilisateurs beta et super admins
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/10 rounded-xl">
              <Crown className="w-6 h-6 text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{superAdmins.length}</p>
              <p className="text-sm text-dark-400">Super Admins</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{betaUsers.length}</p>
              <p className="text-sm text-dark-400">Utilisateurs Beta</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <CheckCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Illimite</p>
              <p className="text-sm text-dark-400">Quotas Beta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Beta User Form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-400" />
            Ajouter un utilisateur beta
          </h2>

          <form onSubmit={handleAddBetaUser} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Email de l'utilisateur
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="utilisateur@example.com"
                  className="input-field pl-10 w-full"
                  required
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">
                L'utilisateur doit deja avoir un compte
              </p>
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Raison (optionnel)
              </label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Early adopter, VIP, etc."
                className="input-field w-full"
              />
            </div>

            <button
              type="submit"
              disabled={adding || !newEmail.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Ajouter comme beta
                </>
              )}
            </button>
          </form>
        </div>

        {/* Super Admins List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Super Admins
            </h2>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-ghost p-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {superAdmins.length === 0 ? (
              <p className="text-dark-500 text-center py-4">Aucun super admin</p>
            ) : (
              superAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{admin.email}</p>
                      <p className="text-xs text-dark-500">
                        {admin.isFirstUser ? 'Premier utilisateur' : 'Super admin'}
                      </p>
                    </div>
                  </div>
                  {admin.id === user?.uid && (
                    <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded">
                      Vous
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Beta Users List */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Utilisateurs Beta ({betaUsers.length})
          </h2>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost p-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {betaUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">Aucun utilisateur beta</p>
            <p className="text-sm text-dark-500 mt-1">
              Ajoutez des utilisateurs pour leur donner un acces illimite
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left text-sm text-dark-400 pb-3 font-medium">Email</th>
                  <th className="text-left text-sm text-dark-400 pb-3 font-medium">Raison</th>
                  <th className="text-left text-sm text-dark-400 pb-3 font-medium">Ajoute par</th>
                  <th className="text-left text-sm text-dark-400 pb-3 font-medium">Date</th>
                  <th className="text-right text-sm text-dark-400 pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {betaUsers.map((betaUser) => (
                  <tr key={betaUser.id} className="border-b border-dark-800">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white">{betaUser.email}</span>
                        {betaUser.id === user?.uid && (
                          <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded">
                            Vous
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-dark-400 text-sm">
                      {betaUser.reason || '-'}
                    </td>
                    <td className="py-3 text-dark-400 text-sm">
                      {betaUser.addedBy === 'system' ? (
                        <span className="text-amber-400">Systeme</span>
                      ) : (
                        betaUser.addedByEmail || '-'
                      )}
                    </td>
                    <td className="py-3 text-dark-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {betaUser.addedAt
                          ? new Date(betaUser.addedAt).toLocaleDateString('fr-FR')
                          : '-'}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRemoveBetaUser(betaUser.id, betaUser.email)}
                        disabled={removing === betaUser.id}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Retirer des beta"
                      >
                        {removing === betaUser.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Beta Benefits Info */}
      <div className="card p-6 border-green-500/20 bg-green-500/5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Avantages Beta
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Prospects illimites</p>
              <p className="text-sm text-dark-400">Pas de limite sur le nombre de prospects</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Search className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Campagnes illimitees</p>
              <p className="text-sm text-dark-400">Creez autant de campagnes que necessaire</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Tous les canaux</p>
              <p className="text-sm text-dark-400">Acces a tous les canaux de communication</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
