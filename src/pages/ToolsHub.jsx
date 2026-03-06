import { useSearchParams } from 'react-router-dom'
import { Scan, Target, Wand2, Send } from 'lucide-react'
import Scanner from '@/pages/Scanner'
import Forgeur from '@/pages/Forgeur'
import Radar from '@/pages/Radar'
import AIPersonalization from '@/pages/AIPersonalization'
import MultiPlatformPosting from '@/pages/MultiPlatformPosting'

const TABS = [
  { id: 'scanner', label: 'Scanner', icon: Scan, component: Scanner },
  { id: 'forgeur', label: 'Forgeur', icon: Target, component: Forgeur },
  { id: 'radar', label: 'Radar', icon: Target, component: Radar },
  { id: 'ai', label: 'Generation IA', icon: Wand2, component: AIPersonalization },
  { id: 'posting', label: 'Posting', icon: Send, component: MultiPlatformPosting },
]

export default function ToolsHub() {
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'scanner'
  const current = TABS.find((t) => t.id === activeTab) || TABS[0]
  const ActiveComponent = current.component

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams(tab.id === 'scanner' ? {} : { tab: tab.id })}
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
