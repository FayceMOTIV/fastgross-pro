import { ExternalLink, Mail, MoreHorizontal, ArrowUpRight } from 'lucide-react'
import { Tooltip } from '@/components/Tooltip'

const scoreColor = (score) => {
  if (score >= 8) return 'text-brand-400 bg-brand-500/15 border-brand-500/20'
  if (score >= 5) return 'text-amber-400 bg-amber-500/15 border-amber-500/20'
  return 'text-dark-400 bg-dark-800 border-dark-700'
}

const statusBadge = (status) => {
  const map = {
    new: { label: 'Nouveau', class: 'badge-info' },
    contacted: { label: 'Contacté', class: 'badge-warning' },
    opened: { label: 'A ouvert', class: 'badge-warning' },
    replied: { label: 'A répondu', class: 'badge-success' },
    converted: { label: 'Converti', class: 'badge-success' },
    lost: { label: 'Perdu', class: 'badge-danger' },
  }
  return map[status] || { label: status, class: 'badge-info' }
}

export default function LeadTable({ leads = [], onLeadClick, compact = false }) {
  if (leads.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-dark-400 text-sm">Aucun lead pour le moment</p>
        <p className="text-dark-500 text-xs mt-1">
          Lancez le Scanner pour commencer à générer des leads
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-800/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">
                Lead
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">
                Entreprise
              </th>
              {!compact && (
                <th className="text-left px-5 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">
                  Statut
                </th>
              )}
              <th className="text-center px-5 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">
                Score
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-dark-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/30">
            {leads.map((lead) => {
              const { label, class: badgeClass } = statusBadge(lead.status)
              return (
                <tr
                  key={lead.id}
                  className="hover:bg-dark-800/30 transition-colors cursor-pointer group"
                  onClick={() => onLeadClick?.(lead)}
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-dark-500">{lead.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm text-dark-300">{lead.company}</p>
                      {lead.jobTitle && (
                        <p className="text-xs text-dark-500">{lead.jobTitle}</p>
                      )}
                    </div>
                  </td>
                  {!compact && (
                    <td className="px-5 py-4">
                      <span className={badgeClass}>{label}</span>
                    </td>
                  )}
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold border ${scoreColor(
                        lead.score
                      )}`}
                    >
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip content="Envoyer un email">
                        <button
                          className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Voir le profil">
                        <button
                          className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
