import { useState } from 'react'

export default function Tabs({ tabs, defaultTab, onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  const activeTabData = tabs.find((t) => t.id === activeTab)

  return (
    <div>
      {/* Tab headers */}
      <div className="flex items-center gap-1 p-1 bg-dark-900/50 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-dark-800 text-white'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-dark-700 text-dark-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTabData?.content && (
        <div className="mt-6">{activeTabData.content}</div>
      )}
    </div>
  )
}

export function TabPanel({ children, className = '' }) {
  return <div className={className}>{children}</div>
}
