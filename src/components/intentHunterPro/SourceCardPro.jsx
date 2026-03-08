import { Lock, CheckCircle, XCircle } from 'lucide-react'

const STATUS_STYLES = {
  active: { bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Actif' },
  disabled: { bg: 'bg-gray-100', color: 'text-gray-500', label: 'Inactif' },
  locked: { bg: 'bg-amber-100', color: 'text-amber-600', label: 'Verrouille' },
}

export default function SourceCardPro({ source }) {
  const {
    name = 'Source',
    icon: Icon = CheckCircle,
    status = 'active',
    count = 0,
    description = '',
    planRequired = null,
    color = 'text-accent',
    bgColor = 'bg-accent/10',
  } = source

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.disabled
  const isLocked = status === 'locked'

  return (
    <div
      className={`card p-4 hover:shadow-soft-md transition-all relative ${
        isLocked ? 'opacity-70' : ''
      }`}
    >
      {isLocked && (
        <div className="absolute top-2 right-2">
          <Lock className="w-4 h-4 text-amber-500" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text truncate">{name}</h4>
          {description && (
            <p className="text-xs text-text-muted truncate mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {status === 'active' ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          <span className={`text-xs font-medium ${statusStyle.color}`}>
            {statusStyle.label}
          </span>
        </div>

        <span className="text-sm font-bold text-text">{count}</span>
      </div>

      {planRequired && isLocked && (
        <div className="mt-2 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <p className="text-[10px] text-amber-700 font-medium text-center">
            Forfait {planRequired} requis
          </p>
        </div>
      )}
    </div>
  )
}
