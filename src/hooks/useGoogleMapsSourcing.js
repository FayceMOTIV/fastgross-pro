/**
 * useGoogleMapsSourcing — Hook Google Maps Sourcing
 *
 * Sub-hooks :
 * - useGoogleMapsSearch(orgId) : lancement recherche + resultats
 * - useGoogleMapsLeads(orgId) : prospects Google Maps Firestore
 * - useGoogleMapsStats(orgId) : stats sourcing
 * - useGoogleMapsSourcing() : composite hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/hooks/useDemo'

// ============================================
// MOCK DATA
// ============================================

const MOCK_GMAPS_LEADS = [
  {
    id: 'gm_1',
    name: 'Restaurant Le Petit Bistrot',
    address: '12 Rue de la Paix, 75002 Paris',
    phone: '+33145678901',
    website: 'https://lepetitbistrot.fr',
    email: 'contact@lepetitbistrot.fr',
    rating: 4.6,
    reviewCount: 342,
    category: 'Restaurant',
    placeId: 'ChIJN1t_tDeuEmsR0',
    source: 'google_maps',
    score: 78,
    status: 'qualified',
    scrapedAt: new Date(Date.now() - 3600000).toISOString(),
    enriched: true,
    socialLinks: { instagram: '@lepetitbistrot' },
  },
  {
    id: 'gm_2',
    name: 'Agence Web PixelPerfect',
    address: '45 Avenue des Champs-Elysees, 75008 Paris',
    phone: '+33156789012',
    website: 'https://pixelperfect.fr',
    email: 'hello@pixelperfect.fr',
    rating: 4.8,
    reviewCount: 89,
    category: 'Agence web',
    placeId: 'ChIJN1t_tDeuEmsR1',
    source: 'google_maps',
    score: 92,
    status: 'hot',
    scrapedAt: new Date(Date.now() - 7200000).toISOString(),
    enriched: true,
    socialLinks: { linkedin: 'pixelperfect-agency', instagram: '@pixelperfect' },
  },
  {
    id: 'gm_3',
    name: 'Salon de Coiffure Elegance',
    address: '78 Boulevard Haussmann, 75009 Paris',
    phone: '+33167890123',
    website: 'https://elegance-coiffure.fr',
    email: null,
    rating: 4.3,
    reviewCount: 156,
    category: 'Salon de coiffure',
    placeId: 'ChIJN1t_tDeuEmsR2',
    source: 'google_maps',
    score: 55,
    status: 'warm',
    scrapedAt: new Date(Date.now() - 14400000).toISOString(),
    enriched: false,
    socialLinks: {},
  },
  {
    id: 'gm_4',
    name: 'Cabinet Comptable Dupont & Associes',
    address: '23 Rue de Rivoli, 75004 Paris',
    phone: '+33178901234',
    website: 'https://dupont-associes.fr',
    email: 'cabinet@dupont-associes.fr',
    rating: 4.5,
    reviewCount: 67,
    category: 'Cabinet comptable',
    placeId: 'ChIJN1t_tDeuEmsR3',
    source: 'google_maps',
    score: 85,
    status: 'qualified',
    scrapedAt: new Date(Date.now() - 28800000).toISOString(),
    enriched: true,
    socialLinks: { linkedin: 'dupont-associes' },
  },
  {
    id: 'gm_5',
    name: 'Auto-Ecole Conduite Plus',
    address: '56 Rue Saint-Lazare, 75009 Paris',
    phone: '+33189012345',
    website: null,
    email: null,
    rating: 3.9,
    reviewCount: 214,
    category: 'Auto-ecole',
    placeId: 'ChIJN1t_tDeuEmsR4',
    source: 'google_maps',
    score: 35,
    status: 'cold',
    scrapedAt: new Date(Date.now() - 43200000).toISOString(),
    enriched: false,
    socialLinks: {},
  },
  {
    id: 'gm_6',
    name: 'Clinique Veterinaire du Parc',
    address: '89 Avenue de Wagram, 75017 Paris',
    phone: '+33190123456',
    website: 'https://veto-duparc.fr',
    email: 'rdv@veto-duparc.fr',
    rating: 4.7,
    reviewCount: 298,
    category: 'Veterinaire',
    placeId: 'ChIJN1t_tDeuEmsR5',
    source: 'google_maps',
    score: 72,
    status: 'warm',
    scrapedAt: new Date(Date.now() - 57600000).toISOString(),
    enriched: true,
    socialLinks: { instagram: '@vetoduparc' },
  },
]

const MOCK_GMAPS_STATS = {
  totalScraped: 1847,
  totalQualified: 623,
  totalSaved: 412,
  totalEnriched: 298,
  totalConverted: 45,
  conversionRate: 10.9,
  avgRating: 4.4,
  avgScore: 68,
  lastRun: new Date(Date.now() - 3600000).toISOString(),
  runsToday: 3,
  runsThisWeek: 18,
  topCategories: [
    { category: 'Restaurant', count: 187 },
    { category: 'Agence web', count: 89 },
    { category: 'Salon de coiffure', count: 76 },
    { category: 'Cabinet comptable', count: 52 },
    { category: 'Auto-ecole', count: 43 },
  ],
  byCity: [
    { city: 'Paris', count: 534 },
    { city: 'Lyon', count: 187 },
    { city: 'Marseille', count: 134 },
    { city: 'Bordeaux', count: 89 },
  ],
}

const MOCK_SEARCH_HISTORY = [
  {
    id: 'sh_1',
    query: 'restaurant gastronomique',
    location: 'Paris',
    radius: 10,
    resultsCount: 47,
    qualifiedCount: 23,
    savedCount: 18,
    executedAt: new Date(Date.now() - 3600000).toISOString(),
    filters: { minRating: 4.0, minReviews: 50 },
  },
  {
    id: 'sh_2',
    query: 'agence web',
    location: 'Lyon',
    radius: 20,
    resultsCount: 32,
    qualifiedCount: 19,
    savedCount: 15,
    executedAt: new Date(Date.now() - 86400000).toISOString(),
    filters: { minRating: 4.0, hasWebsite: true },
  },
  {
    id: 'sh_3',
    query: 'cabinet comptable',
    location: 'Paris',
    radius: 15,
    resultsCount: 28,
    qualifiedCount: 14,
    savedCount: 11,
    executedAt: new Date(Date.now() - 172800000).toISOString(),
    filters: { minRating: 3.5, minReviews: 20 },
  },
]

// ============================================
// useGoogleMapsSearch
// ============================================

export function useGoogleMapsSearch(orgId) {
  const { isDemo } = useDemo()
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isDemo) {
      setSearchHistory(MOCK_SEARCH_HISTORY)
    }
  }, [isDemo])

  const search = useCallback(
    async (params = {}) => {
      const { query: searchQuery, location, radius, limit: maxResults, filters } = params

      if (isDemo) {
        setSearching(true)
        await new Promise((r) => setTimeout(r, 2500))
        const filtered = MOCK_GMAPS_LEADS.filter((l) => {
          if (filters?.minRating && l.rating < filters.minRating) return false
          if (filters?.minReviews && l.reviewCount < filters.minReviews) return false
          if (filters?.hasWebsite && !l.website) return false
          if (filters?.hasPhone && !l.phone) return false
          return true
        })
        setResults(filtered)
        setSearchHistory((prev) => [
          {
            id: `sh_${Date.now()}`,
            query: searchQuery,
            location,
            radius,
            resultsCount: filtered.length,
            qualifiedCount: filtered.filter((l) => l.score >= 50).length,
            savedCount: 0,
            executedAt: new Date().toISOString(),
            filters,
          },
          ...prev,
        ])
        setSearching(false)
        return { success: true, results: filtered, total: filtered.length }
      }

      setSearching(true)
      setError(null)
      try {
        const fn = httpsCallable(functions, 'runGoogleMapsSourcingManual')
        const result = await fn({
          orgId,
          query: searchQuery,
          location,
          radius: radius || 10,
          limit: maxResults || 50,
          filters: filters || {},
          enrichLeads: params.enrichLeads || false,
        })
        const data = result.data
        setResults(data?.prospects || data?.results || [])
        return data
      } catch (err) {
        console.error('Error running Google Maps search:', err)
        setError(err)
        return { success: false, error: err.message }
      } finally {
        setSearching(false)
      }
    },
    [orgId, isDemo]
  )

  const enrichLead = useCallback(
    async (prospectId) => {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 2000))
        setResults((prev) =>
          prev.map((r) =>
            r.id === prospectId
              ? { ...r, enriched: true, email: 'contact@example.com' }
              : r
          )
        )
        return { success: true }
      }

      const fn = httpsCallable(functions, 'runGoogleMapsSourcingManual')
      return (await fn({ orgId, action: 'enrich', prospectId })).data
    },
    [orgId, isDemo]
  )

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    searching,
    searchHistory,
    error,
    search,
    enrichLead,
    clearResults,
  }
}

// ============================================
// useGoogleMapsLeads
// ============================================

export function useGoogleMapsLeads(orgId) {
  const { isDemo } = useDemo()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId || isDemo) {
      setLeads(MOCK_GMAPS_LEADS)
      setLoading(false)
      return
    }

    const prospectsRef = collection(db, 'organizations', orgId, 'prospects')
    const q = query(
      prospectsRef,
      where('source', 'in', ['google_maps', 'serper_maps', 'apify_gmaps']),
      orderBy('scrapedAt', 'desc'),
      limit(200)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          scrapedAt: d.data().scrapedAt?.toDate?.()?.toISOString() || null,
        }))
        setLeads(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to Google Maps leads:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [orgId, isDemo])

  const qualifiedLeads = useMemo(() => leads.filter((l) => l.score >= 50), [leads])
  const hotLeads = useMemo(() => leads.filter((l) => l.score >= 80), [leads])
  const enrichedLeads = useMemo(() => leads.filter((l) => l.enriched), [leads])

  return {
    leads,
    loading,
    qualifiedLeads,
    hotLeads,
    enrichedLeads,
  }
}

// ============================================
// useGoogleMapsStats
// ============================================

export function useGoogleMapsStats(orgId) {
  const { isDemo } = useDemo()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!orgId || isDemo) {
      setStats(MOCK_GMAPS_STATS)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const fn = httpsCallable(functions, 'getGoogleMapsHunterStats')
      const result = await fn({ orgId })
      setStats(result.data?.stats || result.data || {})
    } catch (err) {
      console.error('Error fetching Google Maps stats:', err)
      try {
        const statsDoc = await getDoc(
          doc(db, 'organizations', orgId, 'hunterStats', 'googleMaps')
        )
        if (statsDoc.exists()) {
          setStats(statsDoc.data())
        }
      } catch (fbErr) {
        console.error('Google Maps stats fallback failed:', fbErr)
      }
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}

// ============================================
// useGoogleMapsSourcing (composite)
// ============================================

export default function useGoogleMapsSourcing() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id

  const searchData = useGoogleMapsSearch(orgId)
  const leadsData = useGoogleMapsLeads(orgId)
  const statsData = useGoogleMapsStats(orgId)

  const loading = leadsData.loading || statsData.loading

  const refreshAll = useCallback(async () => {
    await statsData.refresh()
  }, [statsData])

  return {
    orgId,
    search: searchData,
    leads: leadsData,
    stats: statsData.stats,
    statsLoading: statsData.loading,
    loading,
    refreshAll,
  }
}
