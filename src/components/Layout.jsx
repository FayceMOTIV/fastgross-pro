import { useState, useRef, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdminStatus } from '@/hooks/useCloudFunctions'
import CommandPalette from '@/components/CommandPalette'
import NotificationPanel from '@/components/NotificationPanel'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import {
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Zap,
  BarChart3,
  Search,
  Building2,
  Check,
  Plus,
  Crown,
  Shield,
  User,
  Eye,
  Users,
  Bot,
} from 'lucide-react'

// Navigation — Alex au centre, chaque item a sa couleur
const navItems = [
  { to: '/app', icon: Bot, label: 'Alex', end: true, color: 'indigo', activeBg: 'bg-indigo-50', activeText: 'text-indigo-600', activeBorder: 'border-indigo-500', iconBg: 'bg-indigo-100' },
  { to: '/app/crm', icon: Users, label: 'Prospects', color: 'emerald', activeBg: 'bg-emerald-50', activeText: 'text-emerald-600', activeBorder: 'border-emerald-500', iconBg: 'bg-emerald-100' },
  { to: '/app/inbox', icon: MessageSquare, label: 'Inbox', color: 'purple', activeBg: 'bg-purple-50', activeText: 'text-purple-600', activeBorder: 'border-purple-500', iconBg: 'bg-purple-100' },
  { to: '/app/performance', icon: BarChart3, label: 'Analytics', color: 'amber', activeBg: 'bg-amber-50', activeText: 'text-amber-600', activeBorder: 'border-amber-500', iconBg: 'bg-amber-100' },
]

// Role icons
const roleIcons = {
  owner: Crown,
  admin: Shield,
  manager: Users,
  member: User,
  viewer: Eye,
}

// Page titles for top bar
const pageTitles = {
  '/app': 'Alex',
  '/app/autopilot': 'AutoPilot',
  '/app/sourcing': 'Sourcing',
  '/app/tools': 'Outils IA',
  '/app/crm': 'CRM',
  '/app/outreach': 'Outreach',
  '/app/inbox': 'Inbox',
  '/app/intent-hunter': 'Intent Hunter',
  '/app/intent-hunter/pro': 'Intent Hunter Pro',
  '/app/intent-hunter/particuliers': 'Intent Hunter Particuliers',
  '/app/intent-hunter/stats': 'Intent Hunter Stats',
  '/app/performance': 'Performance',
  '/app/config': 'Configuration',
  '/app/admin': 'Admin',
  '/app/templates': 'Templates',
  '/app/sequences': 'Sequences',
  '/app/interactions': 'Interactions',
  '/app/crm/list': 'Prospects CRM',
  '/app/crm/kanban': 'Pipeline CRM',
  '/app/crm/lead': 'Detail Prospect',
  '/app/campaigns/wizard': 'Nouvelle Campagne',
  '/app/campaigns/list': 'Campagnes',
  '/app/campaigns/settings': 'Parametres Campagne',
  '/app/campaigns/hitl': "File d'approbation",
  '/app/roi': 'Tableau de bord ROI',
  '/app/reseller': 'Espace Revendeur',
}

export default function Layout() {
  const { user, signOut, fullName, initials } = useAuth()
  const {
    currentOrg,
    orgs,
    switchOrg,
    roleInfo,
    currentRole,
    isTrialActive,
    trialDaysRemaining,
    limits,
  } = useOrg()
  const { can } = usePermissions()
  const { getAdminStatus } = useAdminStatus()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [adminStatus, setAdminStatus] = useState({ isSuperAdmin: false, isBetaUser: false })

  const orgDropdownRef = useRef(null)
  const userMenuRef = useRef(null)

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const status = await getAdminStatus()
        setAdminStatus(status)
      } catch (error) {
        // Silently fail - user is not admin
      }
    }
    if (user) {
      checkAdmin()
    }
  }, [user])

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
    // Exact match first
    if (pageTitles[path]) return pageTitles[path]
    // Prefix match
    const match = Object.entries(pageTitles).find(
      ([route]) => route !== '/app' && path.startsWith(route)
    )
    return match ? match[1] : 'Dashboard'
  }

  const RoleIcon = roleIcons[currentRole] || User

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-text/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-72
          bg-white border-r border-accent/5 shadow-soft-sm
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-accent/5 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 text-lg leading-none">
                  Face Media
                </h1>
                <span className="text-xs text-purple-500 font-semibold tracking-wide">Factory</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Org selector */}
          {currentOrg && (
            <div className="relative mt-4" ref={orgDropdownRef}>
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-hover hover:bg-accent/5 transition-colors text-sm border border-accent/5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-text truncate font-medium">{currentOrg.name}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown */}
              {orgDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white rounded-xl border border-accent/10 shadow-soft-lg z-50">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                        org.id === currentOrg.id
                          ? 'bg-accent/10 text-accent'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="flex-1 text-left truncate">{org.name}</span>
                      {org.id === currentOrg.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                  <div className="border-t border-accent/5 mt-2 pt-2 px-2">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false)
                        navigate('/app/config?section=organization')
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm text-text-muted hover:text-accent hover:bg-accent/5 rounded-lg transition-colors"
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
            className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-accent/5 hover:border-accent/20 hover:bg-accent/5 transition-colors text-sm"
          >
            <Search className="w-4 h-4 text-text-muted" />
            <span className="flex-1 text-left text-text-muted">Rechercher...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-surface-hover rounded border border-accent/10">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Trial banner */}
        {isTrialActive && trialDaysRemaining <= 7 && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <p className="text-xs text-warning-dark font-medium">
              Essai: {trialDaysRemaining} jour{trialDaysRemaining > 1 ? 's' : ''} restant
              {trialDaysRemaining > 1 ? 's' : ''}
            </p>
            <button
              onClick={() => navigate('/app/config?section=billing')}
              className="mt-1 text-xs text-warning-dark hover:underline"
            >
              Passer au plan {limits.label}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end, activeBg, activeText, activeBorder, iconBg }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? `${activeBg} ${activeText} border-l-3 ${activeBorder} shadow-sm`
                    : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? iconBg : 'bg-transparent'}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="flex-1">{label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-accent/5 space-y-1">
          <NavLink
            to="/app/config"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-surface-hover text-text'
                  : 'text-text-secondary hover:text-text hover:bg-surface-hover'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            <span>Configuration</span>
          </NavLink>

          {/* Admin links - only for super admins */}
          {adminStatus.isSuperAdmin && (
            <>
              <div className="pt-2 mt-2 border-t border-accent/10">
                <p className="px-3 py-2 text-[10px] font-semibold text-warning uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </p>
              </div>
              <NavLink
                to="/app/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-warning/10 text-warning'
                      : 'text-warning/70 hover:text-warning hover:bg-warning/5'
                  }`
                }
              >
                <Shield className="w-5 h-5" />
                <span>Panel Admin</span>
              </NavLink>
            </>
          )}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-accent/5">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-hover transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-purple-500/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-text truncate">{fullName}</p>
                <div className="flex items-center gap-1.5">
                  <RoleIcon className={`w-3 h-3 ${roleInfo?.color || 'text-text-muted'}`} />
                  <span className={`text-xs ${roleInfo?.color || 'text-text-muted'}`}>
                    {roleInfo?.label || 'Membre'}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-text-muted transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 py-2 bg-white rounded-xl border border-accent/10 shadow-soft-lg">
                <div className="px-3 py-2 border-b border-accent/5">
                  <p className="text-xs text-text-muted truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/app/config?section=profile')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
                >
                  <User className="w-4 h-4" />
                  Mon profil
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/app/config')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Parametres
                </button>
                <div className="border-t border-accent/5 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleSignOut()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
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
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-accent/5 bg-white/90 backdrop-blur-xl">
          {/* Left: Mobile menu + Page title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-display font-bold text-text">{getPageTitle()}</h2>
            </div>
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-text">FMF</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search (desktop) */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-accent/10 hover:border-accent/20 hover:bg-accent/5 transition-colors text-sm text-text-muted"
            >
              <Search className="w-4 h-4" />
              <span>Rechercher</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-surface-hover rounded border border-accent/10">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <NotificationPanel />

            {/* Mobile search */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-surface-muted">
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
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
    </div>
  )
}
