import { useEffect, useState, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Search,
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  User,
  Zap,
  LogOut,
  Target,
  TrendingUp,
  Send,
} from 'lucide-react'

// Navigation items for v5.0
const NAV_ITEMS = [
  { path: '/app', label: 'Dashboard', icon: LayoutDashboard, keywords: ['accueil', 'home', 'kpi'] },
  {
    path: '/app/autopilot',
    label: 'AutoPilot',
    icon: Zap,
    keywords: ['auto', 'pilot', 'ia', 'automatique'],
  },
  {
    path: '/app/sourcing',
    label: 'Sourcing',
    icon: Users,
    keywords: ['leads', 'hunter', 'linkedin', 'google maps', 'enrichment', 'sources'],
  },
  {
    path: '/app/tools',
    label: 'Outils IA',
    icon: Target,
    keywords: ['scanner', 'forgeur', 'radar', 'generation', 'posting'],
  },
  {
    path: '/app/crm',
    label: 'CRM',
    icon: Users,
    keywords: ['prospects', 'pipeline', 'kanban', 'leads', 'contacts'],
  },
  {
    path: '/app/outreach',
    label: 'Outreach',
    icon: Send,
    keywords: ['campagnes', 'sequences', 'email', 'whatsapp', 'social', 'dm'],
  },
  {
    path: '/app/inbox',
    label: 'Inbox',
    icon: MessageSquare,
    keywords: ['reponses', 'escalades', 'messages'],
  },
  {
    path: '/app/performance',
    label: 'Performance',
    icon: BarChart3,
    keywords: ['analytics', 'stats', 'roi', 'proof', 'monitoring'],
  },
  {
    path: '/app/config',
    label: 'Configuration',
    icon: Settings,
    keywords: [
      'parametres',
      'config',
      'profil',
      'compte',
      'equipe',
      'integrations',
      'email',
      'facturation',
    ],
  },
]

// Quick actions
const QUICK_ACTIONS = [
  {
    id: 'new-prospect',
    label: 'Nouveau prospect',
    icon: Plus,
    path: '/app/crm?tab=prospects',
    color: 'text-indigo-500',
    keywords: ['ajouter', 'creer', 'lead'],
  },
  {
    id: 'new-template',
    label: 'Nouveau template',
    icon: Plus,
    path: '/app/outreach?tab=email',
    color: 'text-blue-500',
    keywords: ['modele', 'email'],
  },
  {
    id: 'new-sequence',
    label: 'Nouvelle sequence',
    icon: Zap,
    path: '/app/config?section=sequences',
    color: 'text-amber-500',
    keywords: ['campagne', 'workflow'],
  },
  {
    id: 'view-analytics',
    label: 'Voir les stats',
    icon: TrendingUp,
    path: '/app/performance',
    color: 'text-purple-500',
    keywords: ['roi', 'performance'],
  },
]

export default function CommandPalette({ open, onOpenChange, onSignOut }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[15%] -translate-x-1/2 w-full max-w-2xl px-4">
        <Command
          className="bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-100">
            <Search className="w-5 h-5 text-gray-400" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher une page, une action..."
              className="flex-1 py-4 bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none text-sm"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 bg-gray-50 rounded border border-gray-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-400">
              Aucun resultat trouve.
            </Command.Empty>

            {/* Quick actions */}
            {!search && (
              <Command.Group
                heading="Actions rapides"
                className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider"
              >
                {QUICK_ACTIONS.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.label}
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
              className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider mt-2"
            >
              {filteredNavItems.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`nav-${item.label}`}
                  onSelect={() => runCommand(() => navigate(item.path))}
                  icon={item.icon}
                  keywords={item.keywords}
                >
                  {item.label}
                </CommandItem>
              ))}
            </Command.Group>

            {/* Account actions */}
            <Command.Group
              heading="Compte"
              className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider mt-2"
            >
              <CommandItem
                value="mon-profil"
                onSelect={() => runCommand(() => navigate('/app/config?section=profile'))}
                icon={User}
              >
                Mon profil
              </CommandItem>
              <CommandItem
                value="configuration"
                onSelect={() => runCommand(() => navigate('/app/config'))}
                icon={Settings}
              >
                Configuration
              </CommandItem>
              <CommandItem
                value="deconnexion"
                onSelect={() => runCommand(onSignOut)}
                icon={LogOut}
                iconColor="text-red-400"
              >
                Se deconnecter
              </CommandItem>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">↑↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">↵</kbd>
                selectionner
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200">K</kbd>
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
  value,
  icon: Icon,
  iconColor = 'text-gray-400',
  keywords = [],
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={value || (typeof children === 'string' ? children : 'item')}
      keywords={keywords}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 cursor-pointer
                 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-gray-900
                 transition-colors"
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <span className="flex-1 flex items-center min-w-0">{children}</span>
    </Command.Item>
  )
}
