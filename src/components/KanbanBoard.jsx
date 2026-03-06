import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Mail,
  Building2,
  MessageCircle,
  Phone,
  Calendar,
  Activity,
  Smartphone,
  Instagram,
  Linkedin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const CRM_COLUMNS = [
  { id: 'NEW', label: 'Nouveau', color: 'bg-blue-500', lightBg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'CONTACTED', label: 'Contacte', color: 'bg-amber-500', lightBg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'INTERESTED', label: 'Interesse', color: 'bg-purple-500', lightBg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'MEETING', label: 'RDV', color: 'bg-indigo-500', lightBg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'SIGNED', label: 'Signe', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'LOST', label: 'Perdu', color: 'bg-gray-400', lightBg: 'bg-gray-50', border: 'border-gray-200', collapsed: true },
]

const CHANNEL_ICONS = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageCircle,
  instagram: Instagram,
  linkedin: Linkedin,
  voicemail: Phone,
}

function scoreColor(score) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100 border-emerald-200'
  if (score >= 60) return 'text-amber-700 bg-amber-100 border-amber-200'
  if (score >= 40) return 'text-orange-700 bg-orange-100 border-orange-200'
  return 'text-gray-600 bg-gray-100 border-gray-200'
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score))
  const barColor =
    pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : pct >= 40 ? 'bg-orange-500' : 'bg-gray-400'

  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function timeAgo(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'A l\'instant'
  if (diffMin < 60) return `${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}j`
}

function LeadCard({ lead, index, onLeadClick, onAction }) {
  const [showActions, setShowActions] = useState(false)
  const initials = `${lead.firstName?.charAt(0) || ''}${lead.lastName?.charAt(0) || ''}`
  const score = lead.score ?? 0
  const normalizedScore = score <= 10 ? score * 10 : score
  const isSequenceActive = lead.sequenceStatus === 'active'
  const lastChannel = lead.replyChannel || lead.lastChannel || 'email'
  const ChannelIcon = CHANNEL_ICONS[lastChannel] || Mail

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onLeadClick?.(lead)}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
          className={`bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-300 rotate-1' : ''
          }`}
        >
          {/* Top row: avatar + name + score */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                {initials || <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {lead.firstName} {lead.lastName}
                </p>
                {lead.company && (
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 shrink-0" />
                    {lead.company}
                  </p>
                )}
              </div>
            </div>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 ${scoreColor(normalizedScore)}`}
            >
              {normalizedScore}
            </span>
          </div>

          {/* Score bar */}
          <ScoreBar score={normalizedScore} />

          {/* Bottom row: source + channel + sequence indicator + time */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              {lead.source && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                  {lead.source}
                </span>
              )}
              <ChannelIcon className="w-3.5 h-3.5 text-gray-400" />
              {isSequenceActive && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
              )}
            </div>
            {lead.intentSignal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 font-medium truncate max-w-[80px]">
                {lead.intentSignal}
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {timeAgo(lead.updatedAt || lead.createdAt)}
            </span>
          </div>

          {/* Hover actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(lead, 'email') }}
                    className="flex-1 text-xs py-1 rounded-md bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 transition-colors flex items-center justify-center gap-1"
                    title="Email"
                  >
                    <Mail className="w-3 h-3" /> Email
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(lead, 'message') }}
                    className="flex-1 text-xs py-1 rounded-md bg-gray-50 hover:bg-green-50 hover:text-green-600 text-gray-500 transition-colors flex items-center justify-center gap-1"
                    title="Message"
                  >
                    <MessageCircle className="w-3 h-3" /> Message
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(lead, 'call') }}
                    className="flex-1 text-xs py-1 rounded-md bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-500 transition-colors flex items-center justify-center gap-1"
                    title="Appel"
                  >
                    <Phone className="w-3 h-3" /> Appel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction?.(lead, 'meeting') }}
                    className="flex-1 text-xs py-1 rounded-md bg-gray-50 hover:bg-purple-50 hover:text-purple-600 text-gray-500 transition-colors flex items-center justify-center gap-1"
                    title="RDV"
                  >
                    <Calendar className="w-3 h-3" /> RDV
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Draggable>
  )
}

export default function KanbanBoard({ leads = [], onLeadClick, onStatusChange, onAction }) {
  const [collapsedColumns, setCollapsedColumns] = useState({ LOST: true })

  const getLeadsByColumn = useCallback(
    (columnId) => {
      return leads.filter((lead) => {
        const col = lead.crmColumn || mapLegacyStatus(lead.status)
        return col === columnId
      })
    },
    [leads]
  )

  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return
      const { draggableId, destination } = result
      const newColumn = destination.droppableId
      onStatusChange?.(draggableId, newColumn)
    },
    [onStatusChange]
  )

  const toggleCollapse = useCallback((columnId) => {
    setCollapsedColumns((prev) => ({ ...prev, [columnId]: !prev[columnId] }))
  }, [])

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 px-1">
        {CRM_COLUMNS.map((column) => {
          const columnLeads = getLeadsByColumn(column.id)
          const isCollapsed = collapsedColumns[column.id]

          return (
            <div key={column.id} className={`flex-shrink-0 ${isCollapsed ? 'w-16' : 'w-72'} transition-all`}>
              {/* Column header */}
              <div
                className={`flex items-center justify-between mb-3 ${isCollapsed ? 'flex-col gap-2' : ''}`}
                onClick={column.collapsed ? () => toggleCollapse(column.id) : undefined}
              >
                <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  {!isCollapsed && (
                    <h3 className="text-sm font-semibold text-gray-700">{column.label}</h3>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                    {columnLeads.length}
                  </span>
                  {column.collapsed && (
                    <button
                      onClick={() => toggleCollapse(column.id)}
                      className="p-0.5 rounded hover:bg-gray-100"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsed view */}
              {isCollapsed ? (
                <div
                  className="bg-gray-50 rounded-xl border border-dashed border-gray-200 min-h-[400px] flex items-center justify-center cursor-pointer"
                  onClick={() => toggleCollapse(column.id)}
                >
                  <span className="text-xs text-gray-400 [writing-mode:vertical-lr] rotate-180">
                    {column.label} ({columnLeads.length})
                  </span>
                </div>
              ) : (
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-2.5 min-h-[400px] p-2 rounded-xl transition-colors ${
                        snapshot.isDraggingOver
                          ? `${column.lightBg} border-2 border-dashed ${column.border}`
                          : 'bg-gray-50/50'
                      }`}
                    >
                      {columnLeads.map((lead, index) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          index={index}
                          onLeadClick={onLeadClick}
                          onAction={onAction}
                        />
                      ))}
                      {provided.placeholder}
                      {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-12">
                          <Activity className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Glissez un lead ici</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

// Map old status values to new CRM columns
function mapLegacyStatus(status) {
  const mapping = {
    new: 'NEW',
    contacted: 'CONTACTED',
    opened: 'CONTACTED',
    clicked: 'CONTACTED',
    replied: 'INTERESTED',
    converted: 'SIGNED',
    lost: 'LOST',
    blacklisted: 'LOST',
  }
  return mapping[status] || 'NEW'
}

export { CRM_COLUMNS, mapLegacyStatus }
