import { useState, useEffect } from 'react'
import { X, Cookie, Check } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'fmf_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Delay showing banner for better UX
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        accepted: true,
        date: new Date().toISOString(),
        analytics: true,
        functional: true,
      })
    )
    setVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        accepted: false,
        date: new Date().toISOString(),
        analytics: false,
        functional: true, // Functional cookies are required
      })
    )
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-brand-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold mb-1">Nous utilisons des cookies</h3>
            <p className="text-dark-400 text-sm mb-4">
              Ce site utilise des cookies pour ameliorer votre experience, analyser le trafic et
              personnaliser le contenu. En cliquant sur "Accepter", vous consentez a l'utilisation
              de tous les cookies.{' '}
              <a href="/legal/privacy" className="text-brand-400 hover:underline">
                Politique de confidentialite
              </a>
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleAccept}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-dark-950 font-semibold rounded-xl hover:bg-brand-400 transition-colors"
              >
                <Check className="w-4 h-4" />
                Accepter tout
              </button>

              <button
                onClick={handleDecline}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-800 text-dark-200 font-medium rounded-xl border border-dark-700 hover:bg-dark-700 hover:text-white transition-colors"
              >
                Refuser
              </button>

              <a
                href="/legal/cookies"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-dark-400 hover:text-white transition-colors text-sm"
              >
                Personnaliser
              </a>
            </div>
          </div>

          <button
            onClick={handleDecline}
            className="flex-shrink-0 p-2 text-dark-500 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
