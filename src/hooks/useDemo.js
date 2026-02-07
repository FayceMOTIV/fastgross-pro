import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Hook pour detecter le mode demo
 *
 * Mode demo active si :
 * - L'email est demo@facemediafactory.com
 * - OU ?demo=true dans l'URL
 * - OU pas d'utilisateur connecte
 */
export const useDemo = () => {
  const { user } = useAuth()

  const isDemo = useMemo(() => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const demoParam = urlParams.get('demo')

    // Demo mode conditions
    const isDemoAccount = user?.email === 'demo@facemediafactory.com'
    const isDemoUrl = demoParam === 'true'
    const isNoUser = !user

    return isDemoAccount || isDemoUrl || isNoUser
  }, [user])

  return { isDemo }
}

/**
 * Hook pour obtenir les donnees selon le mode (demo ou reel)
 *
 * @param {any} realData - Donnees reelles de Firestore
 * @param {any} demoData - Donnees de demonstration
 * @returns {any} - Donnees appropriees selon le mode
 */
export const useDemoData = (realData, demoData) => {
  const { isDemo } = useDemo()
  return isDemo ? demoData : realData
}

export default useDemo
