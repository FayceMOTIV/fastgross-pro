import { useSearchParams } from 'react-router-dom'
import { MessageSquare, ShieldAlert } from 'lucide-react'
import Inbox from '@/pages/Inbox'
import HumanInLoop from '@/pages/HumanInLoop'

const TABS = [
  { id: 'replies', label: 'Reponses', icon: MessageSquare, component: Inbox },
  { id: 'escalations', label: 'Escalades', icon: ShieldAlert, component: HumanInLoop },
]

export default function InboxHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'replies'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'replies' ? {} : { tab: tab.id })}
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
