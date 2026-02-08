import { useState } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Building2,
  CreditCard,
  AlertTriangle,
  Palette,
  Clock,
  Bell,
  Search,
  Globe,
  Zap,
  Wrench,
} from 'lucide-react'
import {
  ProspectionSettings,
  ChannelsSettings,
  SourcesSettings,
  ScheduleSettings,
  NotificationsSettings,
  ProfileSettings,
  AppearanceSettings,
  OrganizationSettings,
  BillingSettings,
  DangerSettings,
  DevSettings,
} from '@/components/settings'

const isDevMode = import.meta.env.VITE_USE_EMULATORS === 'true' || import.meta.env.DEV

const baseTabs = [
  { id: 'prospection', label: 'Prospection', icon: Search },
  { id: 'channels', label: 'Canaux', icon: Zap },
  { id: 'sources', label: 'Sources emails', icon: Globe },
  { id: 'schedule', label: 'Planification', icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'billing', label: 'Plan & Facturation', icon: CreditCard },
  { id: 'danger', label: 'Zone dangereuse', icon: AlertTriangle },
]

const devTab = { id: 'dev', label: 'Dev Tools', icon: Wrench }
const tabs = isDevMode ? [...baseTabs, devTab] : baseTabs

export default function Settings() {
  const [activeTab, setActiveTab] = useState('prospection')
  const [saving, setSaving] = useState(false)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'prospection':
        return <ProspectionSettings saving={saving} setSaving={setSaving} />
      case 'channels':
        return <ChannelsSettings saving={saving} setSaving={setSaving} />
      case 'sources':
        return <SourcesSettings saving={saving} setSaving={setSaving} />
      case 'schedule':
        return <ScheduleSettings saving={saving} setSaving={setSaving} />
      case 'notifications':
        return <NotificationsSettings saving={saving} setSaving={setSaving} />
      case 'profile':
        return <ProfileSettings saving={saving} setSaving={setSaving} />
      case 'appearance':
        return <AppearanceSettings />
      case 'organization':
        return <OrganizationSettings saving={saving} setSaving={setSaving} />
      case 'billing':
        return <BillingSettings />
      case 'danger':
        return <DangerSettings />
      case 'dev':
        return isDevMode ? <DevSettings /> : null
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-dark-400" />
          Parametres
        </h1>
        <p className="text-dark-400 mt-1">Configurez votre outil de prospection</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : tab.id === 'danger'
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderTabContent()}</div>
      </div>
    </div>
  )
}
