import { useEffect, useState, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useProspects, useSequences, useTemplates } from '@/hooks/useFirestore'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  Workflow,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  User,
  Building2,
  Zap,
  LogOut,
  UserPlus,
  Plug,
  Mail,
  Smartphone,
  Instagram,
  MapPin,
  Mic,
  MessageCircle,
  Play,
  Pause,
  Edit3,
  Eye,
  Target,
  TrendingUp,
  Clock,
  Send,
} from 'lucide-react'

// Navigation items for v2.0
const NAV_ITEMS = [
  { path: '/app', label: 'Dashboard', icon: LayoutDashboard, keywords: ['accueil', 'home', 'kpi'] },
  {
    path: '/app/prospects',
    label: 'Prospects',
    icon: Users,
    keywords: ['leads', 'contacts', 'pipeline'],
  },
  {
    path: '/app/templates',
    label: 'Templates',
    icon: FileText,
    keywords: ['modeles', 'email', 'sms'],
  },
  {
    path: '/app/sequences',
    label: 'Sequences',
    icon: Workflow,
    keywords: ['campagnes', 'automation', 'workflow'],
  },
  {
    path: '/app/interactions',
    label: 'Interactions',
    icon: MessageSquare,
    keywords: ['historique', 'timeline', 'reponses'],
  },
  {
    path: '/app/analytics',
    label: 'Analytics',
    icon: BarChart3,
    keywords: ['stats', 'roi', 'performance'],
  },
  {
    path: '/app/team',
    label: 'Equipe',
    icon: UserPlus,
    keywords: ['membres', 'roles', 'invitations'],
    permission: 'team:read',
  },
  {
    path: '/app/integrations',
    label: 'Integrations',
    icon: Plug,
    keywords: ['amazon', 'ses', 'saleshandy', 'windmill', 'evolution', 'sms', 'whatsapp', 'api'],
    permission: 'integrations:read',
  },
  {
    path: '/app/settings',
    label: 'Parametres',
    icon: Settings,
    keywords: ['config', 'profil', 'compte'],
  },
]

// Quick actions
const QUICK_ACTIONS = [
  {
    id: 'new-prospect',
    label: 'Nouveau prospect',
    icon: Plus,
    path: '/app/prospects',
    color: 'text-brand-400',
    keywords: ['ajouter', 'creer', 'lead'],
  },
  {
    id: 'new-template',
    label: 'Nouveau template',
    icon: Plus,
    path: '/app/templates',
    color: 'text-blue-400',
    keywords: ['modele', 'email'],
  },
  {
    id: 'new-sequence',
    label: 'Nouvelle sequence',
    icon: Zap,
    path: '/app/sequences',
    color: 'text-amber-400',
    keywords: ['campagne', 'workflow'],
  },
  {
    id: 'view-analytics',
    label: 'Voir les stats',
    icon: TrendingUp,
    path: '/app/analytics',
    color: 'text-purple-400',
    keywords: ['roi', 'performance'],
  },
]

// Channel icons
const CHANNEL_ICONS = {
  email: { icon: Mail, color: 'text-emerald-400' },
  sms: { icon: Smartphone, color: 'text-blue-400' },
  whatsapp: { icon: MessageCircle, color: 'text-green-400' },
  instagram_dm: { icon: Instagram, color: 'text-pink-400' },
  voicemail: { icon: Mic, color: 'text-purple-400' },
  courrier: { icon: MapPin, color: 'text-amber-400' },
}

// Status colors for prospects
const STATUS_COLORS = {
  new: 'text-blue-400',
  enriched: 'text-purple-400',
  qualified: 'text-amber-400',
  in_sequence: 'text-cyan-400',
  replied: 'text-brand-400',
  converted: 'text-green-400',
  opted_out: 'text-red-400',
}

export default function CommandPalette({ open, onOpenChange, onSignOut }) {
  const navigate = useNavigate()
  const { currentOrg } = useOrg()
  const { can } = usePermissions()
  const { prospects } = useProspects()
  const { sequences } = useSequences()
  const { templates } = useTemplates()
  const [search, setSearch] = useState('')

  // Filter navigation items based on permissions
  const filteredNavItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (!item.permission) return true
      return can(item.permission)
    })
  }, [can])

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = useCallback(
    (command) => {
      onOpenChange(false)
      setSearch('')
      command()
    },
    [onOpenChange]
  )

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl px-4">
        <Command
          className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-dark-800">
            <Search className="w-5 h-5 text-dark-500" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher une page, un prospect, une sequence..."
              className="flex-1 py-4 bg-transparent text-white placeholder:text-dark-500 focus:outline-none text-sm"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-dark-500 bg-dark-800 rounded border border-dark-700">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-dark-500">
              Aucun resultat trouve.
            </Command.Empty>

            {/* Quick actions */}
            {!search && (
              <Command.Group
                heading="Actions rapides"
                className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider"
              >
                {QUICK_ACTIONS.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => runCommand(() => navigate(action.path))}
                    icon={action.icon}
                    iconColor={action.color}
                    keywords={action.keywords}
                  >
                    {action.label}
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Navigation */}
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2"
            >
              {filteredNavItems.map((item) => (
                <CommandItem
                  key={item.path}
                  onSelect={() => runCommand(() => navigate(item.path))}
                  icon={item.icon}
                  keywords={item.keywords}
                >
                  {item.label}
                </CommandItem>
              ))}
            </Command.Group>

            {/* Prospects */}
            {prospects.length > 0 && (
              <Command.Group
                heading={`Prospects (${prospects.length})`}
                className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2"
              >
                {prospects.slice(0, 6).map((prospect) => (
                  <CommandItem
                    key={prospect.id}
                    onSelect={() => runCommand(() => navigate(`/app/prospects?id=${prospect.id}`))}
                    icon={User}
                    iconColor={STATUS_COLORS[prospect.status] || 'text-dark-400'}
                    keywords={[prospect.email, prospect.company, prospect.status]}
                  >
                    <span className="flex-1 flex items-center gap-2">
                      <span>
                        {prospect.firstName} {prospect.lastName}
                      </span>
                      {prospect.company && (
                        <span className="text-dark-500 text-xs">• {prospect.company}</span>
                      )}
                    </span>
                    {prospect.score !== undefined && (
                      <span
                        className={`text-xs font-medium ${
                          prospect.score >= 70
                            ? 'text-brand-400'
                            : prospect.score >= 40
                              ? 'text-amber-400'
                              : 'text-dark-500'
                        }`}
                      >
                        {prospect.score}%
                      </span>
                    )}
                  </CommandItem>
                ))}
                {prospects.length > 6 && (
                  <CommandItem
                    onSelect={() => runCommand(() => navigate('/app/prospects'))}
                    icon={Users}
                    iconColor="text-brand-400"
                  >
                    <span className="text-brand-400">
                      Voir tous les {prospects.length} prospects
                    </span>
                  </CommandItem>
                )}
              </Command.Group>
            )}

            {/* Sequences */}
            {sequences.length > 0 && (
              <Command.Group
                heading={`Sequences (${sequences.length})`}
                className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2"
              >
                {sequences.slice(0, 4).map((sequence) => (
                  <CommandItem
                    key={sequence.id}
                    onSelect={() => runCommand(() => navigate(`/app/sequences?id=${sequence.id}`))}
                    icon={sequence.status === 'active' ? Play : Pause}
                    iconColor={sequence.status === 'active' ? 'text-brand-400' : 'text-dark-400'}
                    keywords={[sequence.description]}
                  >
                    <span className="flex-1 flex items-center gap-2">
                      <span>{sequence.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          sequence.status === 'active'
                            ? 'bg-brand-500/10 text-brand-400'
                            : 'bg-dark-800 text-dark-400'
                        }`}
                      >
                        {sequence.status === 'active' ? 'Active' : 'Pause'}
                      </span>
                    </span>
                    <span className="text-xs text-dark-500">
                      {sequence.stats?.active || 0} en cours
                    </span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Templates */}
            {templates.length > 0 && (
              <Command.Group
                heading={`Templates (${templates.length})`}
                className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2"
              >
                {templates.slice(0, 4).map((template) => {
                  const channelConfig = CHANNEL_ICONS[template.channel] || {
                    icon: Mail,
                    color: 'text-dark-400',
                  }
                  const ChannelIcon = channelConfig.icon
                  return (
                    <CommandItem
                      key={template.id}
                      onSelect={() =>
                        runCommand(() => navigate(`/app/templates?id=${template.id}`))
                      }
                      icon={ChannelIcon}
                      iconColor={channelConfig.color}
                      keywords={[template.subject, template.category]}
                    >
                      <span className="flex-1 flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.category && (
                          <span className="text-dark-500 text-xs">• {template.category}</span>
                        )}
                      </span>
                      {template.stats?.used !== undefined && (
                        <span className="text-xs text-dark-500">
                          {template.stats.used}x utilise
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </Command.Group>
            )}

            {/* Account actions */}
            <Command.Group
              heading="Compte"
              className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2"
            >
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/settings/profile'))}
                icon={User}
              >
                Mon profil
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/settings'))}
                icon={Settings}
              >
                Parametres
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(onSignOut)}
                icon={LogOut}
                iconColor="text-red-400"
              >
                Se deconnecter
              </CommandItem>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-dark-800 flex items-center justify-between text-xs text-dark-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700">↑↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700">↵</kbd>
                selectionner
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700">K</kbd>
              ouvrir/fermer
            </span>
          </div>
        </Command>
      </div>
    </div>
  )
}

function CommandItem({
  children,
  onSelect,
  icon: Icon,
  iconColor = 'text-dark-400',
  keywords = [],
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={typeof children === 'string' ? children : undefined}
      keywords={keywords}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-300 cursor-pointer
                 data-[selected=true]:bg-dark-800 data-[selected=true]:text-white
                 transition-colors"
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <span className="flex-1 flex items-center min-w-0">{children}</span>
    </Command.Item>
  )
}
