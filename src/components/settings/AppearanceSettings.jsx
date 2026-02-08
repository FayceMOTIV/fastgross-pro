import { Palette, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <Palette className="w-5 h-5 text-brand-400" />
        <h2 className="section-title">Apparence</h2>
      </div>

      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-4">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Mode clair</p>
                <p className="text-xs text-dark-500">Interface lumineuse</p>
              </div>
            </div>
            <div className="w-full h-20 rounded-lg bg-slate-100 border border-slate-200 p-2">
              <div className="w-full h-3 rounded bg-slate-200 mb-1" />
              <div className="w-2/3 h-2 rounded bg-slate-300" />
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 transition-all ${
              theme === 'dark'
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-dark-700 hover:border-dark-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                <Moon className="w-5 h-5 text-brand-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Mode sombre</p>
                <p className="text-xs text-dark-500">Reduit la fatigue oculaire</p>
              </div>
            </div>
            <div className="w-full h-20 rounded-lg bg-dark-900 border border-dark-700 p-2">
              <div className="w-full h-3 rounded bg-dark-700 mb-1" />
              <div className="w-2/3 h-2 rounded bg-dark-600" />
            </div>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className="text-xs text-dark-500">
          Le theme est sauvegarde automatiquement et sera applique a chaque connexion.
        </p>
      </div>
    </div>
  )
}
