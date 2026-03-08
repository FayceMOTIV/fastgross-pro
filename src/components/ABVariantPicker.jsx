import { useState, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function ABVariantPicker({ niche, channel, onVariantSelected }) {
  const [testData, setTestData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (niche && channel) loadABTest()
  }, [niche, channel])

  async function loadABTest() {
    setLoading(true)
    try {
      const fn = httpsCallable(getFunctions(), 'getABTestDashboard')
      const res = await fn({ niche })
      const tests = res.data.stats || []
      const activeTest = tests.find(t => t.channel === channel && t.status === 'running')
      setTestData(activeTest || null)
    } catch (err) {
      console.error('AB test load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunchTest() {
    setLoading(true)
    try {
      const fn = httpsCallable(getFunctions(), 'runABTest')
      await fn({ niche, channel })
      await loadABTest()
    } catch (err) {
      console.error('AB test launch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-xs text-gray-400 animate-pulse">Chargement test A/B...</div>

  if (!testData) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700 font-medium mb-2">Aucun test A/B actif pour {niche} / {channel}</p>
        <button
          onClick={handleLaunchTest}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-semibold"
        >
          Lancer un test A/B (3 variantes)
        </button>
      </div>
    )
  }

  const winner = testData.variants?.find(v => v.id === testData.winnerVariantId)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">A/B Test - {niche} / {channel}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          testData.status === 'concluded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {testData.status === 'concluded' ? 'Conclu' : 'En cours'}
        </span>
      </div>

      {winner && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-bold text-green-700 mb-1">Message gagnant ({(winner.convRate * 100).toFixed(1)}% reponse)</p>
          <p className="text-sm text-gray-700 italic">&quot;{winner.message}&quot;</p>
        </div>
      )}

      <div className="space-y-2">
        {testData.variants?.map(v => (
          <div key={v.id} className={`rounded-lg p-3 border ${v.id === testData.winnerVariantId ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600 capitalize">{v.id}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{v.sent} envois</span>
                <span>-</span>
                <span className="font-bold text-blue-600">{(v.convRate * 100).toFixed(1)}% reponse</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic">&quot;{v.message?.slice(0, 80)}...&quot;</p>
            <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(v.convRate * 500, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
