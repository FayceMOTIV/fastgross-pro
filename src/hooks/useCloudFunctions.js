import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

/**
 * Hook générique pour appeler une Cloud Function
 */
export function useCloudFunction(functionName) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const call = async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const fn = httpsCallable(functions, functionName)
      const result = await fn(params)
      setData(result.data)
      return result.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { call, data, loading, error }
}

/**
 * Scanner : analyse un site web client
 */
export function useScanner() {
  const { call, data, loading, error } = useCloudFunction('scanWebsite')

  const scan = async (url, clientId) => {
    return call({ url, clientId })
  }

  return { scan, scanResult: data, scanning: loading, scanError: error }
}

/**
 * Forgeur : génère une séquence email
 */
export function useForgeur() {
  const { call, data, loading, error } = useCloudFunction('generateSequence')

  const generate = async (clientId, scanId, options = {}) => {
    return call({ clientId, scanId, ...options })
  }

  return { generate, sequence: data, generating: loading, generateError: error }
}

/**
 * Proof : génère un rapport PDF
 */
export function useProof() {
  const { call, data, loading, error } = useCloudFunction('generateReport')

  const generateReport = async (clientId, period) => {
    return call({ clientId, period })
  }

  return { generateReport, report: data, generating: loading, reportError: error }
}
