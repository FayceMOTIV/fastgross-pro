import { useSearchParams } from 'react-router-dom'
import {
  Search,
  Zap,
  Globe,
  Clock,
  Server,
  BookOpen,
  Workflow,
  Mic,
  CalendarCheck,
  Plug,
  UserPlus,
  Bell,
  User,
  Building2,
  Palette,
  CreditCard,
  Wrench,
  AlertTriangle,
  MessageCircle,
  Settings as SettingsIcon,
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
} from '@/components/settings'
import EmailInfra from '@/pages/EmailInfra'
import KnowledgeBase from '@/pages/KnowledgeBase'
import SequenceBuilder from '@/pages/SequenceBuilder'
import VoiceConfig from '@/pages/VoiceConfig'
import BookingSettings from '@/components/settings/BookingSettings'
import Integrations from '@/pages/Integrations'
import WhatsAppSettings from '@/components/settings/WhatsAppSettings'
import Team from '@/pages/Team'
import ClientSetup from '@/pages/ClientSetup'

const SECTIONS = [
  { id: 'prospection', label: 'Prospection', icon: Search, group: 'general' },
  { id: 'channels', label: 'Canaux', icon: Zap, group: 'general' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, group: 'general' },
  { id: 'sources', label: 'Sources emails', icon: Globe, group: 'general' },
  { id: 'schedule', label: 'Planification', icon: Clock, group: 'general' },
  { id: 'email-infra', label: 'Infra Email', icon: Server, group: 'general' },
  { id: 'knowledge', label: 'Base de connaissances', icon: BookOpen, group: 'tools' },
  { id: 'sequences', label: 'Sequences Templates', icon: Workflow, group: 'tools' },
  { id: 'voice', label: 'Agent vocal', icon: Mic, group: 'tools' },
  { id: 'booking', label: 'Rendez-vous', icon: CalendarCheck, group: 'tools' },
  { id: 'integrations', label: 'Integrations', icon: Plug, group: 'tools' },
  { id: 'team', label: 'Equipe', icon: UserPlus, group: 'account' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'account' },
  { id: 'profile', label: 'Profil', icon: User, group: 'account' },
  { id: 'organization', label: 'Organisation', icon: Building2, group: 'account' },
  { id: 'appearance', label: 'Apparence', icon: Palette, group: 'account' },
  { id: 'billing', label: 'Facturation', icon: CreditCard, group: 'account' },
  { id: 'setup', label: 'Setup client', icon: Wrench, group: 'account' },
  { id: 'danger', label: 'Zone dangereuse', icon: AlertTriangle, group: 'danger' },
]

const GROUPS = [
  { id: 'general', label: 'General' },
  { id: 'tools', label: 'Outils' },
  { id: 'account', label: 'Compte' },
  { id: 'danger', label: '' },
]

export default function ConfigHub() {
  const [params, setParams] = useSearchParams()
  const activeSection = params.get('section') || 'prospection'

  const renderContent = () => {
    switch (activeSection) {
      case 'prospection':
        return <ProspectionSettings />
      case 'channels':
        return <ChannelsSettings />
      case 'whatsapp':
        return <WhatsAppSettings />
      case 'sources':
        return <SourcesSettings />
      case 'schedule':
        return <ScheduleSettings />
      case 'email-infra':
        return <EmailInfra />
      case 'knowledge':
        return <KnowledgeBase />
      case 'sequences':
        return <SequenceBuilder />
      case 'voice':
        return <VoiceConfig />
      case 'booking':
        return <BookingSettings />
      case 'integrations':
        return <Integrations />
      case 'team':
        return <Team />
      case 'notifications':
        return <NotificationsSettings />
      case 'profile':
        return <ProfileSettings />
      case 'organization':
        return <OrganizationSettings />
      case 'appearance':
        return <AppearanceSettings />
      case 'billing':
        return <BillingSettings />
      case 'setup':
        return <ClientSetup />
      case 'danger':
        return <DangerSettings />
      default:
        return <ProspectionSettings />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-text flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-text-muted" />
          Configuration
        </h1>
        <p className="text-text-muted mt-1">Gerez tous les parametres de votre prospection</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="space-y-4">
            {GROUPS.map((group) => {
              const items = SECTIONS.filter((s) => s.group === group.id)
              if (items.length === 0) return null
              return (
                <div key={group.id}>
                  {group.label && (
                    <p className="px-3 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {items.map((section) => (
                      <button
                        key={section.id}
                        onClick={() =>
                          setParams(section.id === 'prospection' ? {} : { section: section.id })
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          activeSection === section.id
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : section.id === 'danger'
                              ? 'text-danger hover:bg-danger/5'
                              : 'text-text-secondary hover:text-text hover:bg-surface-hover'
                        }`}
                      >
                        <section.icon className="w-4 h-4" />
                        {section.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  )
}
