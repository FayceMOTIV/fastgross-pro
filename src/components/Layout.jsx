import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { Tooltip } from '@/components/Tooltip'
import CommandPalette from '@/components/CommandPalette'
import NotificationPanel from '@/components/NotificationPanel'
import { ThemeToggleCompact } from '@/components/ThemeToggle'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import {
  LayoutDashboard,
  Scan,
  Mail,
  Radar,
  FileCheck,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Zap,
  BarChart3,
  Search,
} from 'lucide-react'

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/clients', icon: Users, label: 'Clients' },
  { to: '/app/scanner', icon: Scan, label: 'Scanner', dataTour: 'scanner' },
  { to: '/app/forgeur', icon: Mail, label: 'Forgeur', dataTour: 'forgeur' },
  { to: '/app/radar', icon: Radar, label: 'Radar', dataTour: 'radar' },
  { to: '/app/proof', icon: FileCheck, label: 'Proof', dataTour: 'proof' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrg()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onOpenHelp: () => setShortcutsHelpOpen(true),
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
  })

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Erreur déconnexion:', err)
      toast.error('Erreur lors de la déconnexion')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72 
          bg-dark-900/80 backdrop-blur-xl border-r border-dark-800/50
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-dark-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-none">
                Face Media
              </h1>
              <span className="text-xs text-brand-400 font-medium">Factory</span>
            </div>
          </div>

          {/* Org selector */}
          {currentOrg && (
            <button className="mt-4 w-full flex items-center justify-between px-3 py-2 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-colors text-sm">
              <span className="text-dark-300 truncate">{currentOrg.name}</span>
              <ChevronDown className="w-4 h-4 text-dark-500" />
            </button>
          )}

          {/* Search button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dark-700 hover:border-dark-600 hover:bg-dark-800/50 transition-colors text-sm"
          >
            <Search className="w-4 h-4 text-dark-500" />
            <span className="flex-1 text-left text-dark-500">Rechercher...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-dark-500 bg-dark-800 rounded border border-dark-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end, dataTour }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              data-tour={dataTour}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-dark-800/50 space-y-2">
          <NavLink
            to="/app/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Paramètres</span>
          </NavLink>

          {/* User */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm font-medium text-white">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-dark-500 truncate">{user?.email}</p>
            </div>
            <div className="hidden lg:flex items-center gap-1">
              <ThemeToggleCompact />
              <NotificationPanel />
            </div>
            <Tooltip content="Se déconnecter">
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-dark-800/50 bg-dark-900/80 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-400" />
            <span className="font-display font-bold text-white">FMF</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggleCompact />
            <NotificationPanel />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSignOut={handleSignOut}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </div>
  )
}
