import { CheckCircle } from 'lucide-react'

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-[#FAFBFE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        {/* Logo / Branding */}
        <div className="mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-display font-bold text-white">F</span>
          </div>
          <h2 className="text-sm font-medium text-text-muted">Face Media Factory</h2>
        </div>

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-display font-bold text-text mb-3">
          Desinscription confirmee
        </h1>
        <p className="text-text-secondary mb-6">
          Votre desinscription a ete prise en compte. Vous ne recevrez plus de messages de prospection de notre part.
        </p>

        {/* Divider */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-text-muted">
            Si vous pensez que c'est une erreur, contactez-nous a{' '}
            <a
              href="mailto:support@facemedia.tech"
              className="text-accent hover:underline"
            >
              support@facemedia.tech
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
