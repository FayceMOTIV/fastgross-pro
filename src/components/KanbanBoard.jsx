import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Building2, TrendingUp } from 'lucide-react'

const columns = [
  { id: 'new', label: 'Nouveau', dotColor: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacté', dotColor: 'bg-amber-500' },
  { id: 'opened', label: 'A ouvert', dotColor: 'bg-purple-500' },
  { id: 'replied', label: 'A répondu', dotColor: 'bg-brand-500' },
  { id: 'converted', label: 'Converti', dotColor: 'bg-green-500' },
]

const scoreColor = (score) => {
  if (score >= 8) return 'text-brand-400 bg-brand-500/15 border-brand-500/20'
  if (score >= 5) return 'text-amber-400 bg-amber-500/15 border-amber-500/20'
  return 'text-dark-400 bg-dark-800 border-dark-700'
}

export default function KanbanBoard({ leads = [], onLeadClick, onStatusChange }) {
  const [draggedLead, setDraggedLead] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const getLeadsByStatus = (status) => {
    return leads.filter((lead) => lead.status === status)
  }

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e, newStatus) => {
    e.preventDefault()
    if (draggedLead && draggedLead.status !== newStatus) {
      onStatusChange?.(draggedLead.id, newStatus)
    }
    setDraggedLead(null)
    setDragOverColumn(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnLeads = getLeadsByStatus(column.id)
        const isDragOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`}
                />
                <h3 className="text-sm font-medium text-white">{column.label}</h3>
              </div>
              <span className="text-xs text-dark-500 bg-dark-800 px-2 py-0.5 rounded-full">
                {columnLeads.length}
              </span>
            </div>

            {/* Column content */}
            <div
              className={`space-y-2 min-h-[400px] p-2 rounded-xl transition-colors ${
                isDragOver
                  ? 'bg-brand-500/10 border-2 border-dashed border-brand-500/30'
                  : 'bg-dark-900/30'
              }`}
            >
              {columnLeads.map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  onClick={() => onLeadClick?.(lead)}
                  className={`glass-card p-4 cursor-pointer hover:border-brand-500/30 transition-all ${
                    draggedLead?.id === lead.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-dark-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-[140px]">
                          {lead.firstName} {lead.lastName}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-lg border ${scoreColor(
                        lead.score
                      )}`}
                    >
                      {lead.score}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-dark-500">
                    {lead.company && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3 h-3" />
                        {lead.company}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </div>
                  </div>
                </motion.div>
              ))}

              {columnLeads.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-dark-600">
                    Glissez un lead ici
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
