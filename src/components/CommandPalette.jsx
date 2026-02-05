import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useClients, useLeads } from '@/hooks/useFirestore'
import {
  Search,
  LayoutDashboard,
  Users,
  Scan,
  Mail,
  Radar,
  FileCheck,
  BarChart3,
  Settings,
  Plus,
  User,
  Building2,
  Zap,
  LogOut,
} from 'lucide-react'

export default function CommandPalette({ open, onOpenChange, onSignOut }) {
  const navigate = useNavigate()
  const { clients } = useClients()
  const { leads } = useLeads()
  const [search, setSearch] = useState('')

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
      // Escape to close
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const runCommand = useCallback((command) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
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
              placeholder="Rechercher une page, un client, un lead..."
              className="flex-1 py-4 bg-transparent text-white placeholder:text-dark-500 focus:outline-none text-sm"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-dark-500 bg-dark-800 rounded border border-dark-700">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-dark-500">
              Aucun résultat trouvé.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider">
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app'))}
                icon={LayoutDashboard}
              >
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/clients'))}
                icon={Users}
              >
                Clients
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/scanner'))}
                icon={Scan}
              >
                Scanner
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/forgeur'))}
                icon={Mail}
              >
                Forgeur
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/radar'))}
                icon={Radar}
              >
                Radar
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/proof'))}
                icon={FileCheck}
              >
                Proof
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/analytics'))}
                icon={BarChart3}
              >
                Analytics
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/settings'))}
                icon={Settings}
              >
                Paramètres
              </CommandItem>
            </Command.Group>

            {/* Quick actions */}
            <Command.Group heading="Actions rapides" className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2">
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/scanner'))}
                icon={Plus}
                iconColor="text-brand-400"
              >
                Nouveau scan
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/clients'))}
                icon={Plus}
                iconColor="text-blue-400"
              >
                Ajouter un client
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate('/app/forgeur'))}
                icon={Zap}
                iconColor="text-amber-400"
              >
                Créer une séquence
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(onSignOut)}
                icon={LogOut}
                iconColor="text-red-400"
              >
                Se déconnecter
              </CommandItem>
            </Command.Group>

            {/* Clients */}
            {clients.length > 0 && (
              <Command.Group heading="Clients" className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2">
                {clients.slice(0, 5).map((client) => (
                  <CommandItem
                    key={client.id}
                    onSelect={() => runCommand(() => navigate(`/app/clients/${client.id}`))}
                    icon={Building2}
                    iconColor="text-blue-400"
                  >
                    {client.name}
                    {client.website && (
                      <span className="ml-2 text-dark-500 text-xs">{client.website}</span>
                    )}
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Leads */}
            {leads.length > 0 && (
              <Command.Group heading="Leads" className="px-2 py-1.5 text-xs font-medium text-dark-500 uppercase tracking-wider mt-2">
                {leads.slice(0, 5).map((lead) => (
                  <CommandItem
                    key={lead.id}
                    onSelect={() => runCommand(() => navigate('/app/radar'))}
                    icon={User}
                    iconColor={lead.score >= 7 ? 'text-brand-400' : lead.score >= 4 ? 'text-amber-400' : 'text-dark-400'}
                  >
                    {lead.firstName} {lead.lastName}
                    <span className="ml-2 text-dark-500 text-xs">{lead.company}</span>
                    <span className={`ml-auto text-xs font-medium ${
                      lead.score >= 7 ? 'text-brand-400' : lead.score >= 4 ? 'text-amber-400' : 'text-dark-500'
                    }`}>
                      {lead.score}/10
                    </span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}
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
                sélectionner
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

function CommandItem({ children, onSelect, icon: Icon, iconColor = 'text-dark-400' }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-dark-300 cursor-pointer
                 data-[selected=true]:bg-dark-800 data-[selected=true]:text-white
                 transition-colors"
    >
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className="flex-1 flex items-center">{children}</span>
    </Command.Item>
  )
}
