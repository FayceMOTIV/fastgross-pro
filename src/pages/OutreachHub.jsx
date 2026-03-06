import { useSearchParams } from 'react-router-dom'
import { Send, Mail, MessageCircle, Phone } from 'lucide-react'
import Campaigns from '@/pages/Campaigns'
import EmailSequences from '@/pages/EmailSequences'
import SocialOutreach from '@/pages/SocialOutreach'
import WhatsAppDashboard from '@/pages/WhatsAppDashboard'

const TABS = [
  { id: 'campaigns', label: 'Campagnes', icon: Send, component: Campaigns },
  { id: 'email', label: 'Sequences Email', icon: Mail, component: EmailSequences },
  { id: 'social', label: 'Social DM', icon: MessageCircle, component: SocialOutreach },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, component: WhatsAppDashboard },
]

export default function OutreachHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'campaigns'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'campaigns' ? {} : { tab: tab.id })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-text-secondary hover:text-text hover:bg-surface-hover'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  )
}
