import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './AuthContext'
import { useDemo } from './DemoContext'

const OnboardingContext = createContext(null)

const STORAGE_KEY = 'fmf_onboarding_data'

const DEFAULT_DATA = {
  // Step 1: Business info
  businessName: '',
  sector: '',
  offer: '',
  target: '',
  zone: '',
  objective: '',

  // Step 2: Plan selection
  selectedPlan: null,

  // Step 3: Sequence config
  channels: ['email'],
  tone: 'professional',
  frequency: 'balanced',

  // Meta
  currentStep: 1,
  completedSteps: [],
}

export function OnboardingFlowProvider({ children }) {
  const navigate = useNavigate()
  const { user, updateUserProfile } = useAuth()
  const { isDemo } = useDemo()

  // Initialize from localStorage
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_DATA
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_DATA, ...JSON.parse(saved) } : DEFAULT_DATA
    } catch {
      return DEFAULT_DATA
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Persist to localStorage on change
  useEffect(() => {
    if (!isDemo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [data, isDemo])

  // Update data
  const updateData = useCallback((updates) => {
    setData(prev => ({ ...prev, ...updates }))
  }, [])

  // Complete step 1 (business info)
  const completeStep1 = useCallback((businessData) => {
    setData(prev => ({
      ...prev,
      ...businessData,
      currentStep: 2,
      completedSteps: [...new Set([...prev.completedSteps, 1])],
    }))
    navigate('/onboarding/plan')
  }, [navigate])

  // Complete step 2 (plan selection)
  const completeStep2 = useCallback((planId) => {
    setData(prev => ({
      ...prev,
      selectedPlan: planId,
      currentStep: 3,
      completedSteps: [...new Set([...prev.completedSteps, 2])],
    }))
    navigate('/onboarding/sequence')
  }, [navigate])

  // Complete step 3 and finalize (sequence config)
  const completeOnboarding = useCallback(async (sequenceConfig) => {
    setIsLoading(true)
    setError(null)

    const finalData = {
      ...data,
      ...sequenceConfig,
      completedSteps: [1, 2, 3],
    }

    try {
      if (!isDemo && user) {
        // Save onboarding data to Firestore
        await setDoc(doc(db, 'users', user.uid, 'onboarding', 'data'), {
          ...finalData,
          completedAt: serverTimestamp(),
        })

        // Mark user profile as onboarding complete
        await updateUserProfile({
          onboardingComplete: true,
          onboardingData: {
            sector: finalData.sector,
            target: finalData.target,
            zone: finalData.zone,
            objective: finalData.objective,
            selectedPlan: finalData.selectedPlan,
          },
        })
      }

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY)

      // Navigate to app
      if (isDemo) {
        navigate('/app?demo=true')
      } else {
        navigate('/app')
      }
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err.message)
      // Navigate anyway to not block user
      navigate('/app')
    } finally {
      setIsLoading(false)
    }
  }, [data, isDemo, user, navigate, updateUserProfile])

  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    setData(DEFAULT_DATA)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Check if step is accessible
  const canAccessStep = useCallback((step) => {
    if (step === 1) return true
    if (step === 2) return data.completedSteps.includes(1)
    if (step === 3) return data.completedSteps.includes(2)
    return false
  }, [data.completedSteps])

  // Go back to previous step
  const goBack = useCallback(() => {
    if (data.currentStep === 2) {
      setData(prev => ({ ...prev, currentStep: 1 }))
      navigate('/onboarding/chat')
    } else if (data.currentStep === 3) {
      setData(prev => ({ ...prev, currentStep: 2 }))
      navigate('/onboarding/plan')
    }
  }, [data.currentStep, navigate])

  const value = {
    data,
    isLoading,
    error,
    updateData,
    completeStep1,
    completeStep2,
    completeOnboarding,
    resetOnboarding,
    canAccessStep,
    goBack,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboardingFlow() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboardingFlow must be used within an OnboardingFlowProvider')
  }
  return context
}

export default OnboardingContext
