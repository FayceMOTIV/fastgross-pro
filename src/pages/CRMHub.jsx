import { useSearchParams } from 'react-router-dom'
import { Kanban, Users, Database } from 'lucide-react'
import CRM from '@/pages/CRM'
import Prospects from '@/pages/Prospects'
import LeadPipeline from '@/pages/LeadPipeline'

const TABS = [
  { id: 'kanban', label: 'Kanban', icon: Kanban, component: CRM },
  { id: 'prospects', label: 'Prospects', icon: Users, component: Prospects },
  { id: 'pipeline', label: 'Pipeline', icon: Database, component: LeadPipeline },
]

export default function CRMHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'kanban'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'kanban' ? {} : { tab: tab.id })}
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
