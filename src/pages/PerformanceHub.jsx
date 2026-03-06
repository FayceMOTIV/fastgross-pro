import { useSearchParams } from 'react-router-dom'
import { BarChart3, Award, Activity } from 'lucide-react'
import Analytics from '@/pages/Analytics'
import Proof from '@/pages/Proof'
import MonitoringDashboard from '@/pages/MonitoringDashboard'

const TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3, component: Analytics },
  { id: 'proof', label: 'ROI / Proof', icon: Award, component: Proof },
  { id: 'monitoring', label: 'Monitoring', icon: Activity, component: MonitoringDashboard },
]

export default function PerformanceHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'analytics'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'analytics' ? {} : { tab: tab.id })}
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
