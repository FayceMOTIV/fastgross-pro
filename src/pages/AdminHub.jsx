import { useSearchParams } from 'react-router-dom'
import { Shield, Mail, AlertTriangle } from 'lucide-react'
import Admin from '@/pages/Admin'
import TestEmail from '@/pages/TestEmail'
import WarRoom from '@/pages/WarRoom'

const TABS = [
  { id: 'panel', label: 'Panel', icon: Shield, component: Admin },
  { id: 'test-email', label: 'Test Email', icon: Mail, component: TestEmail },
  { id: 'war-room', label: 'War Room', icon: AlertTriangle, component: WarRoom },
]

export default function AdminHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'panel'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'panel' ? {} : { tab: tab.id })}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-warning/10 text-warning border border-warning/20'
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
