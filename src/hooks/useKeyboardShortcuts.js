import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Keyboard shortcut definitions
const shortcuts = [
  { key: 'd', ctrl: true, description: 'Aller au Dashboard', action: 'navigate', path: '/app' },
  {
    key: 'c',
    ctrl: true,
    shift: true,
    description: 'Aller aux Clients',
    action: 'navigate',
    path: '/app/clients',
  },
  {
    key: 's',
    ctrl: true,
    shift: true,
    description: 'Aller au Scanner',
    action: 'navigate',
    path: '/app/scanner',
  },
  {
    key: 'f',
    ctrl: true,
    shift: true,
    description: 'Aller au Forgeur',
    action: 'navigate',
    path: '/app/forgeur',
  },
  {
    key: 'r',
    ctrl: true,
    shift: true,
    description: 'Aller au Radar',
    action: 'navigate',
    path: '/app/radar',
  },
  {
    key: 'p',
    ctrl: true,
    shift: true,
    description: 'Aller à Proof',
    action: 'navigate',
    path: '/app/proof',
  },
  {
    key: 'a',
    ctrl: true,
    shift: true,
    description: 'Aller aux Analytics',
    action: 'navigate',
    path: '/app/analytics',
  },
  {
    key: ',',
    ctrl: true,
    description: 'Aller aux Paramètres',
    action: 'navigate',
    path: '/app/settings',
  },
  {
    key: '?',
    ctrl: false,
    shift: true,
    description: 'Afficher les raccourcis',
    action: 'custom',
    id: 'help',
  },
]

export function useKeyboardShortcuts({ onOpenHelp, onOpenCommandPalette, enabled = true }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleKeyDown = useCallback(
    (e) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Cmd+K is handled by CommandPalette component itself
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenCommandPalette?.()
        return
      }

      // Check for matching shortcuts
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.metaKey || e.ctrlKey : !(e.metaKey || e.ctrlKey)
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (ctrlMatch && shiftMatch && keyMatch) {
          e.preventDefault()

          if (shortcut.action === 'navigate') {
            navigate(shortcut.path)
          } else if (shortcut.action === 'custom') {
            if (shortcut.id === 'help') {
              onOpenHelp?.()
            }
          }
          return
        }
      }
    },
    [navigate, onOpenHelp, onOpenCommandPalette]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return { shortcuts }
}

export { shortcuts }
