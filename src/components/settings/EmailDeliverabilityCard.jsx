/**
 * EmailDeliverabilityCard — Carte score delivrabilite + recommandations
 * Module 10: Email Deliverability Grade A+
 */

import { useState } from 'react'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import { Shield, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const GRADE_COLORS = {
  'A+': { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500', bar: 'bg-green-500' },
  A: { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500', bar: 'bg-green-500' },
  B: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-500', bar: 'bg-blue-500' },
  C: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-500', bar: 'bg-amber-500' },
  D: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500', bar: 'bg-orange-500' },
  F: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500', bar: 'bg-red-500' },
}

function GradeGauge({ grade, score }) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.F
  return (
    <div className="flex flex-col items-center">
      <div className={`w-20 h-20 rounded-full ${colors.bg} ring-4 ${colors.ring} flex items-center justify-center`}>
        <span className={`text-2xl font-bold ${colors.text}`}>{grade}</span>
      </div>
      <p className="text-sm text-gray-500 mt-2">{score}/100</p>
    </div>
  )
}

function DNSCheckRow({ label, check }) {
  if (!check) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        {check.valid ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : check.configured ? (
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="text-right">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          check.valid ? 'bg-green-100 text-green-700' :
          check.configured ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700'
        }`}>
          {check.score}/{label === 'MX' ? '10' : '20'}
        </span>
      </div>
    </div>
  )
}

export default function EmailDeliverabilityCard({ orgId, account }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(account?.deliverabilityDetails || null)
  const { callFunction } = useCloudFunction()

  const domain = account?.email?.split('@')[1] || account?.domain || ''
  const grade = result?.grade || account?.deliverabilityGrade || null
  const score = result?.score || account?.deliverabilityScore || 0

  const checkNow = async () => {
    if (!orgId || !domain) return
    setLoading(true)
    try {
      const res = await callFunction('getDeliverabilityScore', { orgId, domain })
      setResult(res)
      toast.success(`Score: ${res.grade} (${res.dnsScore}/70)`)
    } catch (err) {
      toast.error(`Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          <h3 className="font-medium text-gray-900">Score Delivrabilite</h3>
        </div>
        <button
          onClick={checkNow}
          disabled={loading || !domain}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Verifier
        </button>
      </div>

      {grade ? (
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <GradeGauge grade={grade} score={score} />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>DNS</span>
                <span>{result?.dnsScore || 0}/70</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${(GRADE_COLORS[grade] || GRADE_COLORS.F).bar}`}
                  style={{ width: `${((result?.dnsScore || 0) / 70) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Bounce</span>
                <span>{result?.bounceScore || 0}/15</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${((result?.bounceScore || 0) / 15) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Warmup</span>
                <span>{result?.warmupScore || 0}/15</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${((result?.warmupScore || 0) / 15) * 100}%` }} />
              </div>
            </div>
          </div>

          {result?.dns && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Verification DNS — {domain}</p>
              <DNSCheckRow label="SPF" check={result.dns.spf} />
              <DNSCheckRow label="DKIM" check={result.dns.dkim} />
              <DNSCheckRow label="DMARC" check={result.dns.dmarc} />
              <DNSCheckRow label="MX" check={result.dns.mx} />
            </div>
          )}

          {score < 60 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Score critique</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Vos emails risquent d'atterrir en spam. Verifiez votre configuration DNS.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Cliquez sur "Verifier" pour analyser la delivrabilite</p>
          {domain && <p className="text-xs text-gray-400 mt-1">{domain}</p>}
        </div>
      )}
    </div>
  )
}
