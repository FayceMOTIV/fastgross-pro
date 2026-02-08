import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'
import { shortcuts } from '@/hooks/useKeyboardShortcuts'

const formatKey = (key) => {
  const keyMap = {
    ',': ',',
    '?': '?',
  }
  return keyMap[key] || key.toUpperCase()
}

export default function KeyboardShortcutsHelp({ open, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  // Group shortcuts by category
  const navigationShortcuts = shortcuts.filter((s) => s.action === 'navigate')
  const actionShortcuts = shortcuts.filter((s) => s.action === 'custom')

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
            <div className="flex items-center gap-3">
              <Keyboard className="w-5 h-5 text-brand-400" />
              <h2 className="font-display font-semibold text-white">Raccourcis clavier</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Global shortcut */}
            <div>
              <h3 className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-3">
                Global
              </h3>
              <div className="space-y-2">
                <ShortcutRow keys={['⌘', 'K']} description="Ouvrir la recherche globale" />
                <ShortcutRow keys={['Shift', '?']} description="Afficher les raccourcis" />
              </div>
            </div>

            {/* Navigation shortcuts */}
            <div>
              <h3 className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <div className="space-y-2">
                {navigationShortcuts.map((shortcut, i) => (
                  <ShortcutRow
                    key={i}
                    keys={[
                      shortcut.ctrl && '⌘',
                      shortcut.shift && 'Shift',
                      formatKey(shortcut.key),
                    ].filter(Boolean)}
                    description={shortcut.description}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-800 bg-dark-900/50">
            <p className="text-xs text-dark-500 text-center">
              Appuyez sur{' '}
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700 text-dark-400">
                ESC
              </kbd>{' '}
              pour fermer
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-dark-300">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i}>
            <kbd className="px-2 py-1 text-xs font-medium text-dark-300 bg-dark-800 rounded border border-dark-700">
              {key}
            </kbd>
            {i < keys.length - 1 && <span className="text-dark-600 mx-0.5">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
