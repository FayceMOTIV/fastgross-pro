const GROUP_CONFIG = [
  { key: 'all', label: 'Toutes' },
  { key: 'registries', label: 'Registres Publics' },
  { key: 'intent', label: 'Signaux d\'Intention' },
]

export default function SourceGroupTabs({ activeGroup, onGroupChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {GROUP_CONFIG.map(group => (
        <button
          key={group.key}
          onClick={() => onGroupChange(group.key)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeGroup === group.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {group.label}
        </button>
      ))}
    </div>
  )
}
