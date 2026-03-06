import { createContext, useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DemoContext = createContext(null)

export function DemoProvider({ children }) {
  const location = useLocation()

  const [demoPersisted, setDemoPersisted] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.location.search.includes('demo=true')) {
      sessionStorage.setItem('fmf_demo_mode', 'true')
      return true
    }
    return sessionStorage.getItem('fmf_demo_mode') === 'true'
  })

  // Synchronous: detect demo from URL during render (not useEffect)
  const urlHasDemo = location.search.includes('demo=true')
  const isDemo = demoPersisted || urlHasDemo

  // Persist to sessionStorage when detected from URL
  useEffect(() => {
    if (urlHasDemo && !demoPersisted) {
      sessionStorage.setItem('fmf_demo_mode', 'true')
      setDemoPersisted(true)
    }
  }, [urlHasDemo, demoPersisted])

  const exitDemo = () => {
    sessionStorage.removeItem('fmf_demo_mode')
    setDemoPersisted(false)
  }

  return <DemoContext.Provider value={{ isDemo, exitDemo }}>{children}</DemoContext.Provider>
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
