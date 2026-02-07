import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import CommandPalette from '@/components/CommandPalette'
import NotificationPanel from '@/components/NotificationPanel'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Workflow,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Zap,
  BarChart3,
  Search,
  Bell,
  UserPlus,
  Building2,
  Check,
  Plus,
  Crown,
  Shield,
  User,
  Eye,
  Plug,
} from 'lucide-react'

// Navigation items with permissions
const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/prospects', icon: Users, label: 'Prospects' },
  { to: '/app/templates', icon: FileText, label: 'Templates' },
  { to: '/app/sequences', icon: Workflow, label: 'Sequences' },
  { to: '/app/interactions', icon: MessageSquare, label: 'Interactions' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
]

const bottomNavItems = [
  { to: '/app/team', icon: UserPlus, label: 'Equipe', permission: 'team:read' },
  { to: '/app/integrations', icon: Plug, label: 'Integrations', permission: 'integrations:read' },
  { to: '/app/settings', icon: Settings, label: 'Parametres' },
]

// Role icons
const roleIcons = {
  owner: Crown,
  admin: Shield,
  manager: Users,
  member: User,
  viewer: Eye,
}

export default function Layout() {
  const { user, signOut, fullName, initials } = useAuth()
  const { currentOrg, orgs, switchOrg, roleInfo, currentRole, isTrialActive, trialDaysRemaining, limits } = useOrg()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const orgDropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setOrgDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      console.error('Erreur deconnexion:', err)
      toast.error('Erreur lors de la deconnexion')
    }
  }

  const handleSwitchOrg = (orgId) => {
    switchOrg(orgId)
    setOrgDropdownOpen(false)
    toast.success('Organisation changee')
  }

  // Get current page title
  const getPageTitle = () => {
    const path = location.pathname
    const allItems = [...navItems, ...bottomNavItems]
    const item = allItems.find((item) =>
      item.end ? path === item.to : path.startsWith(item.to)
    )
    return item?.label || 'Dashboard'
  }

  const RoleIcon = roleIcons[currentRole] || User

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
          bg-dark-900 border-r border-dark-800
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-dark-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Zap className="w-5 h-5 text-dark-950" />
              </div>
              <div>
                <h1 className="font-display font-bold text-white text-lg leading-none">
                  Face Media
                </h1>
                <span className="text-xs text-brand-400 font-medium">Factory</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Org selector */}
          {currentOrg && (
            <div className="relative mt-4" ref={orgDropdownRef}>
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors text-sm border border-dark-700"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-white truncate font-medium">{currentOrg.name}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {orgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-dark-800 rounded-lg border border-dark-700 shadow-xl z-50">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                        org.id === currentOrg.id
                          ? 'bg-brand-500/10 text-brand-400'
                          : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="flex-1 text-left truncate">{org.name}</span>
                      {org.id === currentOrg.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                  <div className="border-t border-dark-700 mt-2 pt-2 px-2">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false)
                        navigate('/app/settings/organization')
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-dark-400 hover:text-brand-400 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Creer une organisation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dark-700 hover:border-dark-600 hover:bg-dark-800 transition-colors text-sm"
          >
            <Search className="w-4 h-4 text-dark-500" />
            <span className="flex-1 text-left text-dark-500">Rechercher...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-dark-500 bg-dark-800 rounded border border-dark-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Trial banner */}
        {isTrialActive && trialDaysRemaining <= 7 && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-medium">
              Essai: {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''} restant{trialDaysRemaining > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => navigate('/app/settings/billing')}
              className="mt-1 text-xs text-amber-300 hover:text-amber-200 underline"
            >
              Passer au plan {limits.label}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-semibold text-dark-500 uppercase tracking-wider">
            Menu principal
          </p>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'text-dark-400 hover:text-white hover:bg-dark-800'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-dark-800 space-y-1">
          <p className="px-3 py-2 text-[10px] font-semibold text-dark-500 uppercase tracking-wider">
            Configuration
          </p>
          {bottomNavItems.map(({ to, icon: Icon, label, permission }) => {
            // Check permission if required
            if (permission && !can(permission)) return null

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-dark-800 text-white'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-dark-800">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400/20 to-blue-400/20 flex items-center justify-center text-sm font-bold text-brand-400 border border-brand-500/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">{fullName}</p>
                <div className="flex items-center gap-1.5">
                  <RoleIcon className={`w-3 h-3 ${roleInfo?.color || 'text-dark-400'}`} />
                  <span className={`text-xs ${roleInfo?.color || 'text-dark-400'}`}>
                    {roleInfo?.label || 'Membre'}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 py-2 bg-dark-800 rounded-lg border border-dark-700 shadow-xl">
                <div className="px-3 py-2 border-b border-dark-700">
                  <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/app/settings/profile')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4" />
                  Mon profil
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/app/settings')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Parametres
                </button>
                <div className="border-t border-dark-700 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleSignOut()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Se deconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-dark-800 bg-dark-900/80 backdrop-blur-xl">
          {/* Left: Mobile menu + Page title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-display font-bold text-white">{getPageTitle()}</h2>
            </div>
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-400" />
              <span className="font-display font-bold text-white">FMF</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search (desktop) */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-700 hover:border-dark-600 hover:bg-dark-800 transition-colors text-sm text-dark-400"
            >
              <Search className="w-4 h-4" />
              <span>Rechercher</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-dark-800 rounded border border-dark-700">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <NotificationPanel />

            {/* Mobile search */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-dark-950">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
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
