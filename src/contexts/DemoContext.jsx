import { createContext, useContext, useState, useEffect } from 'react'

const DemoContext = createContext(null)

export function DemoProvider({ children }) {
  // Initialize from URL or sessionStorage
  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window === 'undefined') return false

    // Check URL first
    if (window.location.search.includes('demo=true')) {
      sessionStorage.setItem('fmf_demo_mode', 'true')
      return true
    }

    // Fall back to sessionStorage
    return sessionStorage.getItem('fmf_demo_mode') === 'true'
  })

  // Watch for URL changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkDemo = () => {
      if (window.location.search.includes('demo=true')) {
        sessionStorage.setItem('fmf_demo_mode', 'true')
        setIsDemo(true)
      }
    }

    checkDemo()
    window.addEventListener('popstate', checkDemo)
    return () => window.removeEventListener('popstate', checkDemo)
  }, [])

  const exitDemo = () => {
    sessionStorage.removeItem('fmf_demo_mode')
    setIsDemo(false)
  }

  return (
    <DemoContext.Provider value={{ isDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)
  if (!context) {
    // Return default if outside provider
    return { isDemo: false, exitDemo: () => {} }
  }
  return context
}

export default DemoContext
