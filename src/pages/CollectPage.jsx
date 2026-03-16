/**
 * CollectPage — Landing page publique pour collecte de documents
 * Route: /collect/:orgSlug?p={prospectId}
 * No auth required (meme pattern que /unsubscribe)
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, storage, functions } from '@/lib/firebase'
import { Upload, CheckCircle, FileText, Loader2, AlertCircle } from 'lucide-react'

export default function CollectPage() {
  const { orgSlug } = useParams()
  const [params] = useSearchParams()
  const prospectId = params.get('p')

  const [orgData, setOrgData] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')

  // Resolve slug -> orgId
  useEffect(() => {
    async function resolve() {
      try {
        // Try slug field first
        const q = query(collection(db, 'organizations'), where('slug', '==', orgSlug))
        const snap = await getDocs(q)

        if (!snap.empty) {
          const orgDoc = snap.docs[0]
          setOrgId(orgDoc.id)
          setOrgData(orgDoc.data())
        } else {
          // Fallback: orgSlug might be the orgId directly
          const directSnap = await getDoc(doc(db, 'organizations', orgSlug))
          if (directSnap.exists()) {
            setOrgId(orgSlug)
            setOrgData(directSnap.data())
          } else {
            setError('Page introuvable')
          }
        }
      } catch (err) {
        setError('Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    if (orgSlug) resolve()
  }, [orgSlug])

  const handleFile = useCallback(async (file) => {
    if (!file || !orgId) return

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      setError('Fichier trop volumineux (max 10 Mo)')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!allowedTypes.includes(file.type)) {
      setError('Format non accepte. PDF, images, Word ou Excel uniquement.')
      return
    }

    setUploading(true)
    setError(null)
    setFileName(file.name)

    try {
      // Upload to Firebase Storage
      const ts = Date.now()
      const ext = file.name.split('.').pop() || 'pdf'
      const storagePath = `organizations/${orgId}/documents/${prospectId || 'anonymous'}/${ts}.${ext}`
      const storageRef = ref(storage, storagePath)

      await uploadBytes(storageRef, file)
      const downloadUrl = await getDownloadURL(storageRef)

      // Record conversion via callable
      if (prospectId) {
        const recordConversion = httpsCallable(functions, 'recordCollectPageConversion')
        await recordConversion({
          orgId,
          prospectId,
          documentUrl: downloadUrl,
          fileName: file.name,
          mimeType: file.type,
        })
      }

      setUploaded(true)
    } catch (err) {
      setError('Erreur lors de l\'envoi. Veuillez reessayer.')
    } finally {
      setUploading(false)
    }
  }, [orgId, prospectId])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileInput = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F6EF7]" />
      </div>
    )
  }

  if (error && !orgData) {
    return (
      <div className="min-h-screen bg-[#FAFBFE] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const ca = orgData?.conversionAction || {}
  const orgName = orgData?.name || orgData?.companyName || ''
  const label = ca.label || 'Deposez votre document'

  return (
    <div className="min-h-screen bg-[#FAFBFE] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Org name */}
        <div className="text-center mb-8">
          {orgData?.logoUrl && (
            <img src={orgData.logoUrl} alt={orgName} className="h-12 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {label}
          </h1>
          {orgName && (
            <p className="text-gray-500 mt-2 text-sm">{orgName}</p>
          )}
          {ca.description && (
            <p className="text-gray-600 mt-3 text-sm">{ca.description}</p>
          )}
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {uploaded ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Document recu !
              </h2>
              <p className="text-gray-600 text-sm">
                Merci, votre document a bien ete envoye. Nous revenons vers vous rapidement.
              </p>
              {fileName && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {/* Drag & drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-[#4F6EF7] bg-indigo-50'
                    : 'border-gray-300 hover:border-[#4F6EF7] hover:bg-gray-50'
                }`}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => document.getElementById('file-input').click()}
              >
                {uploading ? (
                  <div>
                    <Loader2 className="w-10 h-10 animate-spin text-[#4F6EF7] mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Envoi en cours...</p>
                    {fileName && <p className="text-xs text-gray-400 mt-1">{fileName}</p>}
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Glissez votre fichier ici
                    </p>
                    <p className="text-xs text-gray-500">
                      ou cliquez pour selectionner
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      PDF, image, Word ou Excel - max 10 Mo
                    </p>
                  </div>
                )}
              </div>

              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                onChange={onFileInput}
                disabled={uploading}
              />

              {/* Mobile camera shortcut */}
              <button
                type="button"
                className="w-full mt-3 py-2.5 px-4 bg-[#4F6EF7] text-white text-sm font-medium rounded-lg hover:bg-[#3d5bd9] transition-colors disabled:opacity-50"
                onClick={() => document.getElementById('camera-input').click()}
                disabled={uploading}
              >
                Prendre une photo
              </button>
              <input
                id="camera-input"
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={onFileInput}
                disabled={uploading}
              />

              {error && (
                <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Face Media Factory
        </p>
      </div>
    </div>
  )
}
