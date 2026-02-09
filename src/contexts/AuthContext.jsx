import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        setLoading(false) // Stop loading immediately so UI can render

        // Fetch user profile from Firestore (non-blocking)
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )

          const profileDoc = await Promise.race([
            getDoc(doc(db, 'users', firebaseUser.uid)),
            timeoutPromise
          ])

          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data())
          } else {
            // Create profile if it doesn't exist
            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              onboardingComplete: false,
              createdAt: new Date(),
            }
            setUserProfile(newProfile)
            // Try to save to Firestore in background
            setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newProfile,
              createdAt: serverTimestamp(),
            }).catch(console.error)
          }
        } catch (err) {
          console.error('Error fetching user profile:', err)
          // Set default profile so app can continue
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            onboardingComplete: false,
          })
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Create or update user profile in Firestore
  const createUserProfile = async (firebaseUser, extraData = {}) => {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || extraData.displayName || '',
      firstName: extraData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
      lastName: extraData.lastName || firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
      photoURL: firebaseUser.photoURL || '',
      phone: extraData.phone || null,

      // Onboarding
      onboardingComplete: false,
      onboardingStep: 0,

      // Preferences
      preferences: {
        language: 'fr',
        timezone: 'Europe/Paris',
        emailNotifications: true,
        pushNotifications: true,
        weeklyReport: true,
      },

      // Default org (set during onboarding)
      defaultOrgId: null,

      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      ...extraData,
    }
    await setDoc(userRef, profile, { merge: true })
    setUserProfile(profile)
    return profile
  }

  // Update user profile
  const updateUserProfile = useCallback(
    async (updates) => {
      if (!user) throw new Error('Not authenticated')

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      setUserProfile((prev) => ({ ...prev, ...updates }))
    },
    [user]
  )

  // Update last login
  const updateLastLogin = useCallback(async () => {
    if (!user) return

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error updating last login:', err)
    }
  }, [user])

  // Sign up with email/password
  const signUp = async (email, password, userData = {}) => {
    setError(null)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      const displayName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData.displayName || email.split('@')[0]

      await updateProfile(result.user, { displayName })
      await createUserProfile(result.user, {
        displayName,
        ...userData,
      })

      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Sign in with email/password
  const signIn = async (email, password) => {
    setError(null)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await updateLastLogin()
      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      const result = await signInWithPopup(auth, provider)

      // Create profile if it doesn't exist
      const profileDoc = await getDoc(doc(db, 'users', result.user.uid))
      if (!profileDoc.exists()) {
        await createUserProfile(result.user)
      } else {
        await updateLastLogin()
      }

      return result.user
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Sign out
  const signOut = async () => {
    setError(null)
    try {
      await firebaseSignOut(auth)
      localStorage.removeItem('fmf_current_org')
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Send password reset email
  const resetPassword = async (email) => {
    setError(null)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Change password (requires recent login)
  const changePassword = async (currentPassword, newPassword) => {
    setError(null)
    if (!user) throw new Error('Not authenticated')

    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Update password
      await updatePassword(user, newPassword)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  // Complete onboarding step
  const completeOnboardingStep = useCallback(
    async (step, data = {}) => {
      if (!user) throw new Error('Not authenticated')

      const updates = {
        onboardingStep: step,
        ...data,
      }

      // Mark complete if final step
      if (step >= 3) {
        updates.onboardingComplete = true
      }

      await updateUserProfile(updates)
    },
    [user, updateUserProfile]
  )

  // Set default organization
  const setDefaultOrg = useCallback(
    async (orgId) => {
      if (!user) throw new Error('Not authenticated')

      await updateUserProfile({ defaultOrgId: orgId })
    },
    [user, updateUserProfile]
  )

  // Check if onboarding needed
  // Returns true if user exists but hasn't completed onboarding
  // Returns null if we don't know yet (profile still loading)
  const needsOnboarding = user
    ? userProfile === null
      ? null // Still loading profile
      : !userProfile.onboardingComplete
    : false

  // Full name helper
  const fullName =
    userProfile?.displayName ||
    (userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : user?.email?.split('@')[0] || 'Utilisateur')

  // Initials helper
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const value = {
    // User data
    user,
    userProfile,
    loading,
    error,

    // Computed
    fullName,
    initials,
    needsOnboarding,
    isAuthenticated: !!user,

    // Auth actions
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    changePassword,

    // Profile actions
    updateUserProfile,
    createUserProfile,
    completeOnboardingStep,
    setDefaultOrg,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
