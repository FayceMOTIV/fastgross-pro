import { useSearchParams } from 'react-router-dom'
import { Database, Zap, Linkedin, MapPin, Mail } from 'lucide-react'
import ProspectingSources from '@/pages/ProspectingSources'
import Hunter from '@/pages/Hunter'
import LinkedIn from '@/pages/LinkedIn'
import GoogleMapsSourcing from '@/pages/GoogleMapsSourcing'
import EmailEnrichment from '@/pages/EmailEnrichment'

const TABS = [
  { id: 'overview', label: 'Vue globale', icon: Database, component: ProspectingSources },
  { id: 'social', label: 'Social', icon: Zap, component: Hunter },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, component: LinkedIn },
  { id: 'maps', label: 'Google Maps', icon: MapPin, component: GoogleMapsSourcing },
  { id: 'enrichment', label: 'Enrichissement', icon: Mail, component: EmailEnrichment },
]

export default function SourcingHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'overview'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'overview' ? {} : { tab: tab.id })}
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
