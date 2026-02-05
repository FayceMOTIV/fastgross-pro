import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle({ showLabel = true }) {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', icon: Sun, label: 'Clair' },
    { value: 'dark', icon: Moon, label: 'Sombre' },
  ]

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className="text-sm text-dark-400">Thème</span>
      )}
      <div className="flex rounded-lg border border-dark-700 overflow-hidden">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              theme === value
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ThemeToggleCompact() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
      title={isDark ? 'Passer au mode clair' : 'Passer au mode sombre'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
