import { FileText, Calendar, Euro, ExternalLink, User, Eye, XCircle } from 'lucide-react'

function formatAmount(amount) {
  if (!amount) return 'Non specifie'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDeadline(date) {
  if (!date) return 'Non specifie'
  const d = new Date(date)
  const now = new Date()
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24))

  const formatted = d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (diff < 0) return { text: `Expire (${formatted})`, urgent: true }
  if (diff <= 7) return { text: `${diff}j restants (${formatted})`, urgent: true }
  if (diff <= 30) return { text: `${diff}j restants (${formatted})`, urgent: false }
  return { text: formatted, urgent: false }
}

export default function BOAMPCard({ lead, onImport, onIgnore, onViewDetails }) {
  const {
    title = 'Appel d\'offres',
    amount = null,
    deadline = null,
    officialContact = '',
    reference = '',
    entity = '',
    sector = '',
    fullUrl = '',
    score = 0,
  } = lead

  const deadlineInfo = formatDeadline(deadline)

  return (
    <div className="card p-4 hover:shadow-soft-md transition-all border-l-4 border-l-blue-500">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
            BOAMP
          </span>
          {reference && (
            <span className="text-[10px] text-text-muted font-mono">{reference}</span>
          )}
        </div>
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            score >= 70
              ? 'bg-emerald-100 text-emerald-700'
              : score >= 40
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {score}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-text mb-2 line-clamp-2">{title}</h4>

      {/* Entity & sector */}
      {entity && (
        <p className="text-xs text-text-muted mb-2">
          {entity} {sector && `- ${sector}`}
        </p>
      )}

      {/* Amount & Deadline row */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-1 mb-0.5">
            <Euro className="w-3 h-3 text-emerald-600" />
            <span className="text-[10px] text-emerald-600 font-medium">Montant</span>
          </div>
          <p className="text-sm font-bold text-emerald-700">{formatAmount(amount)}</p>
        </div>

        <div
          className={`p-2 rounded-lg border ${
            deadlineInfo.urgent
              ? 'bg-red-50 border-red-100'
              : 'bg-blue-50 border-blue-100'
          }`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Calendar className="w-3 h-3 ${deadlineInfo.urgent ? 'text-red-600' : 'text-blue-600'}" />
            <span
              className={`text-[10px] font-medium ${
                deadlineInfo.urgent ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              Echeance
            </span>
          </div>
          <p
            className={`text-xs font-bold ${
              deadlineInfo.urgent ? 'text-red-700' : 'text-blue-700'
            }`}
          >
            {deadlineInfo.text}
          </p>
        </div>
      </div>

      {/* Official contact */}
      {officialContact && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
          <User className="w-3 h-3" />
          <span>{officialContact}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          {fullUrl && (
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Voir l'AO
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onViewDetails?.(lead)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Voir details"
          >
            <Eye className="w-4 h-4 text-text-muted" />
          </button>
          <button
            onClick={() => onIgnore?.(lead)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="Ignorer"
          >
            <XCircle className="w-4 h-4 text-red-400" />
          </button>
          <button
            onClick={() => onImport?.(lead)}
            className="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
          >
            Importer
          </button>
        </div>
      </div>
    </div>
  )
}
