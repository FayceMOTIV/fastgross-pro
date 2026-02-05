import { createContext, useContext, useEffect, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './AuthContext'

const OrgContext = createContext(null)

export function OrgProvider({ children }) {
  const { user } = useAuth()
  const [currentOrg, setCurrentOrg] = useState(null)
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch user's organizations
  useEffect(() => {
    if (!user) {
      setOrgs([])
      setCurrentOrg(null)
      setLoading(false)
      return
    }

    const fetchOrgs = async () => {
      try {
        // Get all orgs where user is a member
        const orgsSnapshot = await getDocs(collection(db, 'organizations'))
        const userOrgs = []

        for (const orgDoc of orgsSnapshot.docs) {
          const memberDoc = await getDoc(
            doc(db, 'organizations', orgDoc.id, 'members', user.uid)
          )
          if (memberDoc.exists()) {
            userOrgs.push({ id: orgDoc.id, ...orgDoc.data(), role: memberDoc.data().role })
          }
        }

        setOrgs(userOrgs)

        // Auto-select first org or saved preference
        const savedOrgId = localStorage.getItem('fmf_current_org')
        const savedOrg = userOrgs.find((o) => o.id === savedOrgId)
        setCurrentOrg(savedOrg || userOrgs[0] || null)
      } catch (error) {
        console.error('Error fetching organizations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrgs()
  }, [user])

  // Create a new organization
  const createOrg = async (name) => {
    if (!user) throw new Error('Must be authenticated')

    const orgRef = doc(collection(db, 'organizations'))
    const orgData = {
      name,
      ownerId: user.uid,
      plan: 'solo', // Default plan
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: {
        emailsPerMonth: 200,
        maxClients: 1,
        features: ['scanner', 'forgeur', 'radar'],
      },
    }

    await setDoc(orgRef, orgData)

    // Add creator as owner member
    await setDoc(doc(db, 'organizations', orgRef.id, 'members', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: 'owner',
      joinedAt: serverTimestamp(),
    })

    const newOrg = { id: orgRef.id, ...orgData, role: 'owner' }
    setOrgs((prev) => [...prev, newOrg])
    setCurrentOrg(newOrg)
    localStorage.setItem('fmf_current_org', orgRef.id)

    return newOrg
  }

  // Switch organization
  const switchOrg = (orgId) => {
    const org = orgs.find((o) => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('fmf_current_org', orgId)
    }
  }

  const value = {
    currentOrg,
    orgs,
    loading,
    createOrg,
    switchOrg,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return context
}

export default OrgContext
