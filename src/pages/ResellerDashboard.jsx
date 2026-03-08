import { useState, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

export default function ResellerDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLink, setInviteLink] = useState(null)
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const fn = httpsCallable(getFunctions(), 'getResellerDashboard')
      const res = await fn({})
      setData(res.data)
    } catch (err) {
      console.error('Reseller dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const fn = httpsCallable(getFunctions(), 'inviteResellerClient')
      const res = await fn({ clientEmail: inviteEmail })
      setInviteLink(res.data.signupUrl)
      setInviteEmail('')
    } catch (err) {
      console.error('Invite error:', err)
    } finally {
      setInviting(false)
    }
  }

  function copyLink() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Espace Revendeur</h2>
          <p className="text-gray-500">Vous n&apos;avez pas encore de compte revendeur. Contactez l&apos;equipe FMF pour en obtenir un.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Espace Revendeur</h1>
        <p className="text-gray-500 text-sm mt-1">Gerez vos clients et suivez vos commissions</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-3xl font-black text-gray-900">{data.clientCount || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Clients actifs</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="text-3xl font-black text-gray-900">{(data.totalMRR || 0).toLocaleString('fr-FR')} EUR</div>
          <div className="text-sm text-gray-500 mt-1">MRR total</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="text-3xl font-black">{(data.totalCommission || 0).toLocaleString('fr-FR')} EUR</div>
          <div className="text-sm text-green-100 mt-1">Commission mensuelle (30%)</div>
        </div>
      </div>

      {/* Inviter un client */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-4">Inviter un nouveau client</h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="Email du client..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? 'Envoi...' : 'Inviter'}
          </button>
        </div>

        {inviteLink && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-medium mb-2">Lien d&apos;invitation genere :</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 bg-white border border-green-300 rounded-lg px-3 py-1.5 text-xs text-gray-700"
              />
              <button
                onClick={copyLink}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-semibold"
              >
                Copier
              </button>
            </div>
            <p className="text-xs text-green-600 mt-1">Valide 7 jours</p>
          </div>
        )}
      </div>

      {/* Liste des clients */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-4">Vos clients ({data.clientCount || 0})</h2>
        {data.clients?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Client</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Forfait</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Prix</th>
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((client, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-700">{client.userId?.slice(0, 12)}...</td>
                    <td className="py-3 px-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                        {client.plan || 'starter'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700">{client.price || 0} EUR</td>
                    <td className="py-3 px-3 text-right font-bold text-green-600">{(client.commission || 0).toFixed(2)} EUR</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">Aucun client pour le moment. Invitez votre premier client !</p>
        )}
      </div>
    </div>
  )
}
