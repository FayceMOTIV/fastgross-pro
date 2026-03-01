/**
 * Composite hook for the Prospecting Sources dashboard
 * Provides: stats, sources, pipeline, config
 * Includes mock data for demo mode
 */

import { useState, useEffect, useCallback } from 'react'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { httpsCallable, getFunctions } from 'firebase/functions'

const functions = getFunctions(undefined, 'europe-west1')

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const MOCK_STATS = {
  kpis: {
    totalCollected: 12847,
    totalPromoted: 3421,
    conversionRate: 27,
    estimatedCostPerLead: '0.003',
    activeSources: 6,
  },
  funnel: {
    collected: 2150,
    normalized: 2080,
    deduped: 1850,
    enriched: 1720,
    scored: 1720,
    promoted: 1280,
    rejected: 340,
    duplicate: 230,
  },
  sourceBreakdown: {
    sirene: { totalRuns: 28, successfulRuns: 27, failedRuns: 1, totalCollected: 4200, totalPromoted: 1100, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'registries' },
    bodacc: { totalRuns: 30, successfulRuns: 30, failedRuns: 0, totalCollected: 1500, totalPromoted: 420, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'registries' },
    france_travail: { totalRuns: 26, successfulRuns: 24, failedRuns: 2, totalCollected: 900, totalPromoted: 280, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'registries' },
    serp_hunting: { totalRuns: 30, successfulRuns: 29, failedRuns: 1, totalCollected: 3500, totalPromoted: 950, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'intent' },
    new_domains: { totalRuns: 28, successfulRuns: 28, failedRuns: 0, totalCollected: 2100, totalPromoted: 500, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'intent' },
    competitor_reviews: { totalRuns: 8, successfulRuns: 7, failedRuns: 1, totalCollected: 647, totalPromoted: 171, lastRunAt: new Date().toISOString(), lastStatus: 'completed', group: 'intent' },
  },
  groupTotals: {
    registries: { collected: 6600, promoted: 1800, sources: 3 },
    intent: { collected: 6247, promoted: 1621, sources: 3 },
  },
  dailyTotals: Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - i))
    return {
      date: date.toISOString().split('T')[0],
      collected: Math.floor(300 + Math.random() * 200),
      promoted: Math.floor(80 + Math.random() * 60),
      sources: {
        sirene: Math.floor(80 + Math.random() * 40),
        bodacc: Math.floor(30 + Math.random() * 20),
        serp_hunting: Math.floor(100 + Math.random() * 50),
        new_domains: Math.floor(60 + Math.random() * 30),
      },
    }
  }),
}

const MOCK_HEALTH = {
  sirene: { health: 'healthy', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 580, recentFailureRate: 4, group: 'registries', frequency: 'daily', estimatedLeadsPerMonth: 15000 },
  bodacc: { health: 'healthy', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 175, recentFailureRate: 0, group: 'registries', frequency: 'daily', estimatedLeadsPerMonth: 5000 },
  france_travail: { health: 'degraded', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 120, recentFailureRate: 8, group: 'registries', frequency: 'daily', estimatedLeadsPerMonth: 3000 },
  serp_hunting: { health: 'healthy', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 350, recentFailureRate: 3, group: 'intent', frequency: 'daily', estimatedLeadsPerMonth: 10000 },
  new_domains: { health: 'healthy', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 480, recentFailureRate: 0, group: 'intent', frequency: 'daily', estimatedLeadsPerMonth: 15000 },
  competitor_reviews: { health: 'healthy', hasApiKey: true, lastRunAt: new Date().toISOString(), lastStatus: 'completed', lastCollected: 140, recentFailureRate: 12, group: 'intent', frequency: 'twice_weekly', estimatedLeadsPerMonth: 4000 },
}

const MOCK_CONFIG = {
  enabled: true,
  scoring: { minScoreToPromote: 40 },
  dedup: { matchFields: ['email', 'phone', 'domain', 'siret'], enableFuzzyCompanyMatch: true, fuzzyThreshold: 0.85, mergeStrategy: 'enrich' },
  limits: { maxRawLeadsPerDay: 5000, maxPromotionsPerDay: 500, rawLeadTTLDays: 30 },
  sources: {},
}

// ─── MAIN HOOK ──────────────────────────────────────────────────────────────

export function useProspectingSources() {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const orgId = currentOrg?.id

  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    if (!orgId && !isDemo) return

    setLoading(true)
    setError(null)

    try {
      if (isDemo) {
        setStats(MOCK_STATS)
        setHealth(MOCK_HEALTH)
        setConfig(MOCK_CONFIG)
        setLoading(false)
        return
      }

      const [dashboardResult, healthResult, configResult] = await Promise.all([
        httpsCallable(functions, 'getProspectingDashboard')({ orgId }),
        httpsCallable(functions, 'getSourceHealthStatus')({ orgId }),
        httpsCallable(functions, 'getSourceConfig')({ orgId }),
      ])

      setStats(dashboardResult.data)
      setHealth(healthResult.data.healthStatuses)
      setConfig(configResult.data.config)
    } catch (err) {
      console.error('Failed to load prospecting data:', err)
      setError(err.message)
      // Fallback to mock on error
      setStats(MOCK_STATS)
      setHealth(MOCK_HEALTH)
      setConfig(MOCK_CONFIG)
    } finally {
      setLoading(false)
    }
  }, [orgId, isDemo])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Trigger a source manually
  const triggerSource = useCallback(async (sourceId) => {
    if (isDemo) {
      return { success: true, message: 'Demo mode - simulation' }
    }

    const result = await httpsCallable(functions, 'runSourceManual')({ orgId, sourceId })
    await loadDashboard()
    return result.data
  }, [orgId, isDemo, loadDashboard])

  // Run pipeline manually
  const triggerPipeline = useCallback(async () => {
    if (isDemo) {
      return { success: true, message: 'Demo mode - simulation' }
    }

    const result = await httpsCallable(functions, 'runPipelineManual')({ orgId, batchSize: 100 })
    await loadDashboard()
    return result.data
  }, [orgId, isDemo, loadDashboard])

  // Update config
  const saveConfig = useCallback(async (newConfig) => {
    if (isDemo) {
      setConfig(prev => ({ ...prev, ...newConfig }))
      return { success: true }
    }

    await httpsCallable(functions, 'updateSourceConfig')({ orgId, config: newConfig })
    setConfig(prev => ({ ...prev, ...newConfig }))
    return { success: true }
  }, [orgId, isDemo])

  return {
    stats,
    health,
    config,
    loading,
    error,
    triggerSource,
    triggerPipeline,
    saveConfig,
    refresh: loadDashboard,
  }
}
