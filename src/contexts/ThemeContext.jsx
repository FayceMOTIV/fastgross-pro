import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'fmf_theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark')

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && (stored === 'dark' || stored === 'light')) {
        setTheme(stored)
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(prefersDark ? 'dark' : 'light')
      }
    } catch (e) {
      console.error('Failed to load theme:', e)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setDarkTheme = () => setTheme('dark')
  const setLightTheme = () => setTheme('light')

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
        toggleTheme,
        setDarkTheme,
        setLightTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
