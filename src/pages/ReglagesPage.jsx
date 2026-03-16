/**
 * ReglagesPage — Onglet Reglages unifie
 * 4 sections accordion : Mon business, Canaux, Notifications, Mon compte
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Zap,
  Bell,
  User,
  ChevronDown,
  CreditCard,
  MessageCircle,
  Server,
  Globe,
  Mic,
  CalendarCheck,
  Plug,
  UserPlus,
  Palette,
  AlertTriangle,
  Settings,
} from 'lucide-react'
import {
  ProspectionSettings,
  ChannelsSettings,
  SourcesSettings,
  NotificationsSettings,
  ProfileSettings,
  AppearanceSettings,
  OrganizationSettings,
  BillingSettings,
  DangerSettings,
  ConversionActionSettings,
} from '@/components/settings'
import EmailInfra from '@/pages/EmailInfra'
import VoiceConfig from '@/pages/VoiceConfig'
import BookingSettings from '@/components/settings/BookingSettings'
import Integrations from '@/pages/Integrations'
import WhatsAppSettings from '@/components/settings/WhatsAppSettings'
import WhatsAppLinkSettings from '@/components/settings/WhatsAppLinkSettings'
import Team from '@/pages/Team'

// Section accordion component
function AccordionSection({ id, icon: Icon, label, description, isOpen, onToggle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50/50"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0 border-t border-gray-50">
          <div className="pt-4 space-y-6">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-section for advanced settings (collapsible within a section)
function SubAccordion({ label, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <div className="pt-3 space-y-4">{children}</div>
        </div>
      )}
    </div>
  )
}

export default function ReglagesPage() {
  const [params] = useSearchParams()
  const sectionParam = params.get('section')

  // Map section param to accordion key
  const getInitialOpen = () => {
    if (!sectionParam) return 'business'
    if (['organization', 'billing'].includes(sectionParam)) return 'business'
    if (['channels', 'whatsapp', 'email-infra', 'sources', 'voice', 'booking', 'integrations'].includes(sectionParam)) return 'channels'
    if (['notifications'].includes(sectionParam)) return 'notifications'
    if (['profile', 'team', 'appearance', 'danger', 'account'].includes(sectionParam)) return 'account'
    return 'business'
  }

  const [openSection, setOpenSection] = useState(getInitialOpen)

  const toggle = (id) => {
    setOpenSection(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-gray-400" />
          Reglages
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Configurez votre prospection et votre compte</p>
      </div>

      {/* 1. Mon business */}
      <AccordionSection
        id="business"
        icon={Building2}
        label="Mon business"
        description="Organisation, profil commercial, facturation"
        isOpen={openSection === 'business'}
        onToggle={() => toggle('business')}
      >
        <OrganizationSettings />
        <ProspectionSettings />
        <ConversionActionSettings />
        <BillingSettings />
      </AccordionSection>

      {/* 2. Canaux */}
      <AccordionSection
        id="channels"
        icon={Zap}
        label="Canaux"
        description="Email, SMS, WhatsApp, LinkedIn, Instagram, vocal"
        isOpen={openSection === 'channels'}
        onToggle={() => toggle('channels')}
      >
        <ChannelsSettings />
        <WhatsAppSettings />

        <SubAccordion label="Parametres avances" icon={Settings}>
          <EmailInfra />
          <SourcesSettings />
          <VoiceConfig />
          <BookingSettings />
          <Integrations />
        </SubAccordion>
      </AccordionSection>

      {/* 3. Notifications */}
      <AccordionSection
        id="notifications"
        icon={Bell}
        label="Notifications"
        description="Rapport quotidien, alertes, digest"
        isOpen={openSection === 'notifications'}
        onToggle={() => toggle('notifications')}
      >
        <WhatsAppLinkSettings />
        <NotificationsSettings />
      </AccordionSection>

      {/* 4. Mon compte */}
      <AccordionSection
        id="account"
        icon={User}
        label="Mon compte"
        description="Profil, equipe, apparence"
        isOpen={openSection === 'account'}
        onToggle={() => toggle('account')}
      >
        <ProfileSettings />
        <Team />
        <AppearanceSettings />

        <SubAccordion label="Zone dangereuse" icon={AlertTriangle}>
          <DangerSettings />
        </SubAccordion>
      </AccordionSection>
    </div>
  )
}
