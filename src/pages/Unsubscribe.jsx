import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '../lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { MailX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function Unsubscribe() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading, confirm, success, error
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const email = searchParams.get('e')
  const orgId = searchParams.get('o')

  useEffect(() => {
    if (!email || !orgId) {
      setStatus('error')
      setErrorMessage('Lien invalide. Parametres manquants.')
    } else {
      setStatus('confirm')
    }
  }, [email, orgId])

  const handleUnsubscribe = async () => {
    if (!email || !orgId) return

    setProcessing(true)

    try {
      // Ajouter a la blacklist
      const blacklistRef = doc(db, 'organizations', orgId, 'blacklist', email.toLowerCase())
      await setDoc(blacklistRef, {
        email: email.toLowerCase(),
        reason: 'unsubscribed',
        addedAt: serverTimestamp()
      })

      setStatus('success')
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setStatus('error')
      setErrorMessage('Une erreur est survenue. Veuillez reessayer.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <Loader2 className="w-12 h-12 mx-auto text-brand-500 animate-spin" />
        )}

        {status === 'confirm' && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <MailX className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Desinscription</h1>
            <p className="text-dark-300 mb-2">
              Vous etes sur le point de vous desinscrire des emails de prospection envoyes a :
            </p>
            <p className="text-white font-medium mb-6">{email}</p>
            <p className="text-dark-400 text-sm mb-8">
              Apres confirmation, vous ne recevrez plus de messages de notre part.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={processing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                'Confirmer la desinscription'
              )}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-brand-400 mb-4">Desinscription confirmee</h1>
            <p className="text-dark-300 mb-2">
              L'adresse email suivante a ete retiree de nos listes :
            </p>
            <p className="text-white font-medium mb-6">{email}</p>
            <p className="text-dark-400 text-sm">
              Vous ne recevrez plus de messages de notre part.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Erreur</h1>
            <p className="text-dark-300">{errorMessage}</p>
          </>
        )}
      </div>
    </div>
  )
}
