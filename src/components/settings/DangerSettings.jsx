import { useState } from 'react'
import { AlertTriangle, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { doc, deleteDoc } from 'firebase/firestore'
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import Modal from '@/components/Modal'
import toast from 'react-hot-toast'

export default function DangerSettings() {
  const { user } = useAuth()
  const { currentOrg } = useOrg()

  const [exporting, setExporting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleExportData = async () => {
    setExporting(true)
    try {
      const exportData = {
        user: {
          email: user.email,
          displayName: user.displayName,
          createdAt: user.metadata?.creationTime,
        },
        organization: currentOrg
          ? {
              name: currentOrg.name,
              id: currentOrg.id,
              plan: currentOrg.plan,
            }
          : null,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `face-media-factory-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('Donnees exportees')
    } catch (error) {
      console.error('Export error:', error)
      toast.error("Erreur lors de l'export")
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Veuillez entrer votre mot de passe')
      return
    }

    setDeleting(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(auth.currentUser)
      toast.success('Compte supprime')
    } catch (error) {
      console.error('Delete error:', error)
      if (error.code === 'auth/wrong-password') {
        toast.error('Mot de passe incorrect')
      } else {
        toast.error('Erreur lors de la suppression du compte')
      }
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeletePassword('')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white/5 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-display font-semibold text-white">Zone dangereuse</h3>
          </div>
          <p className="text-sm text-dark-400 mb-6">
            Ces actions sont irreversibles. Procedez avec precaution.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-800">
              <div>
                <p className="text-sm font-medium text-white">Exporter mes donnees</p>
                <p className="text-xs text-dark-500 mt-1">
                  Telechargez toutes vos donnees au format JSON
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {exporting ? 'Export...' : 'Exporter'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-red-500/20">
              <div>
                <p className="text-sm font-medium text-red-400">Supprimer mon compte</p>
                <p className="text-xs text-dark-500 mt-1">
                  Supprime definitivement votre compte et toutes vos donnees
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletePassword('')
        }}
        title="Supprimer mon compte"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">
              <strong>Attention :</strong> Cette action est irreversible. Toutes vos donnees seront
              supprimees definitivement.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Confirmez avec votre mot de passe
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input-field"
              placeholder="Votre mot de passe"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false)
                setDeletePassword('')
              }}
              className="btn-secondary flex-1"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting || !deletePassword}
              className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
