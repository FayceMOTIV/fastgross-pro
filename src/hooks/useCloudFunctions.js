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

// ============================================
// Admin Functions
// ============================================

/**
 * Check first user / admin status
 */
export function useAdminStatus() {
  const checkFirst = useCloudFunction('checkFirstUser')
  const getStatus = useCloudFunction('getAdminStatus')

  return {
    checkFirstUser: checkFirst.call,
    getAdminStatus: getStatus.call,
    loading: checkFirst.loading || getStatus.loading,
    error: checkFirst.error || getStatus.error
  }
}

/**
 * Beta users management (super admin only)
 */
export function useBetaUsers() {
  const add = useCloudFunction('addBetaUser')
  const remove = useCloudFunction('removeBetaUser')
  const list = useCloudFunction('listBetaUsers')
  const check = useCloudFunction('checkBetaStatus')
  const listAdmins = useCloudFunction('listSuperAdmins')

  return {
    addBetaUser: add.call,
    removeBetaUser: remove.call,
    listBetaUsers: list.call,
    checkBetaStatus: check.call,
    listSuperAdmins: listAdmins.call,
    betaUsers: list.data?.betaUsers || [],
    superAdmins: listAdmins.data?.superAdmins || [],
    loading: add.loading || remove.loading || list.loading,
    error: add.error || remove.error || list.error
  }
}

/**
 * Test email functions
 */
export function useTestEmail() {
  const send = useCloudFunction('sendTestEmail')
  const logs = useCloudFunction('getTestEmailLogs')
  const verify = useCloudFunction('verifyResendConfig')

  return {
    sendTestEmail: send.call,
    getTestEmailLogs: logs.call,
    verifyResendConfig: verify.call,
    emailLogs: logs.data?.logs || [],
    resendConfig: verify.data,
    sending: send.loading,
    loading: logs.loading || verify.loading,
    error: send.error || logs.error || verify.error
  }
}
