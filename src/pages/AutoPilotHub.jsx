import { useSearchParams } from 'react-router-dom'
import { Rocket, CalendarCheck, Sparkles, TestTube } from 'lucide-react'
import AutoPilotDashboard from '@/pages/AutoPilotDashboard'
import DailyProspects from '@/pages/DailyProspects'
import AutoPilotSetup from '@/pages/AutoPilotSetup'
import TestAutopilot from '@/pages/TestAutopilot'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Rocket, component: AutoPilotDashboard },
  { id: 'daily', label: 'Prospects du jour', icon: CalendarCheck, component: DailyProspects },
  { id: 'setup', label: 'Configuration', icon: Sparkles, component: AutoPilotSetup },
  { id: 'test', label: 'Test', icon: TestTube, component: TestAutopilot },
]

export default function AutoPilotHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'dashboard'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'dashboard' ? {} : { tab: tab.id })}
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
