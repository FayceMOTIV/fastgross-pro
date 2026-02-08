import { useState, useRef } from 'react'
import { User, Camera, Save, Loader2, HelpCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import toast from 'react-hot-toast'

export default function ProfileSettings({ saving, setSaving }) {
  const { user, userProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email] = useState(user?.email || '')

  const avatarInputRef = useRef(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas depasser 2MB")
      return
    }

    setUploadingAvatar(true)
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)

      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
      })

      toast.success('Photo de profil mise a jour')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error("Erreur lors de l'upload")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
      })
      toast.success('Profil mis a jour')
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <User className="w-5 h-5 text-brand-400" />
        <h2 className="section-title">Profil</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-2xl font-display font-bold text-dark-950">
              {displayName?.charAt(0) || '?'}
            </div>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center hover:bg-dark-700 transition-colors disabled:opacity-50"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-4 h-4 text-dark-400 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-dark-400" />
            )}
          </button>
        </div>
        <div>
          <p className="text-sm text-dark-500">Photo de profil</p>
          <p className="text-xs text-dark-600 mt-1">JPG, PNG. Max 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">Nom complet</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="Votre nom"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="input-field opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-dark-500 mt-1">L'email ne peut pas etre modifie</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={() => {
            localStorage.removeItem('fmf_tour_completed')
            toast.success('Tour reinitialise. Retournez sur le Dashboard pour le revoir.')
          }}
          className="btn-ghost text-sm flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4" />
          Revoir le tour guide
        </button>
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
