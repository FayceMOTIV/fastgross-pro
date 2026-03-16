/**
 * EmailSetupSettings — Configuration email 2 niveaux
 *
 * Niveau 1 (auto) : {orgSlug}@outreach.facemedia.tech — aucune config requise
 * Niveau 2 (custom) : domaine custom avec DNS SPF/DKIM/DMARC
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Mail, CheckCircle2, AlertCircle, Loader2, Copy, Shield,
  Globe, RefreshCw, ChevronDown, ChevronUp, Zap, ArrowRight,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { functions } from '@/lib/firebase'
import { httpsCallable } from 'firebase/functions'
import toast from 'react-hot-toast'

function DNSRecord({ type, name, value, purpose, copied, onCopy }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-mono font-medium">
            {type}
          </span>
          <span className="text-xs text-gray-500">{purpose}</span>
        </div>
        <button
          onClick={() => onCopy(value)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-10">Nom</span>
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{name}</code>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] text-gray-400 w-10 pt-0.5">Valeur</span>
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded break-all flex-1 font-mono">{value}</code>
        </div>
      </div>
    </div>
  )
}

export default function EmailSetupSettings() {
  const { currentOrg } = useOrg()
  const orgId = currentOrg?.id
  const orgSlug = currentOrg?.slug || orgId?.slice(0, 8) || 'votre-org'
  const orgName = currentOrg?.name || 'FMF'

  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [copiedValue, setCopiedValue] = useState(null)

  const autoEmail = `${orgSlug}@outreach.facemedia.tech`

  // Load config
  useEffect(() => {
    if (!orgId) return
    const load = async () => {
      try {
        const fn = httpsCallable(functions, 'getOrgEmailDomainConfig')
        const result = await fn({ orgId })
        setConfig(result.data)
        if (result.data.customDomain) {
          setCustomDomain(result.data.customDomain)
          setShowCustom(true)
        }
      } catch {
        // Default to auto
        setConfig({ mode: 'automatic', autoEmail, verified: true })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orgId, autoEmail])

  const handleCopy = useCallback((value) => {
    navigator.clipboard.writeText(value)
    setCopiedValue(value)
    toast.success('Copie !')
    setTimeout(() => setCopiedValue(null), 2000)
  }, [])

  const saveAutoMode = useCallback(async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const fn = httpsCallable(functions, 'saveCustomEmailDomain')
      const result = await fn({ orgId, domain: null })
      setConfig(prev => ({ ...prev, mode: 'automatic', verified: true, customDomain: null }))
      setShowCustom(false)
      toast.success('Mode automatique active')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }, [orgId])

  const saveCustomDomain = useCallback(async () => {
    if (!orgId || !customDomain) return
    setSaving(true)
    try {
      const fn = httpsCallable(functions, 'saveCustomEmailDomain')
      await fn({ orgId, domain: customDomain })
      setConfig(prev => ({ ...prev, mode: 'custom', customDomain, verified: false }))
      toast.success('Domaine enregistre. Configurez vos DNS puis verifiez.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }, [orgId, customDomain])

  const verifyDNS = useCallback(async () => {
    if (!orgId) return
    setVerifying(true)
    try {
      const fn = httpsCallable(functions, 'verifyCustomDomainDNS')
      const result = await fn({ orgId })

      setConfig(prev => ({
        ...prev,
        verified: result.data.verified,
        dnsResults: {
          spf: result.data.spf?.configured,
          dkim: result.data.dkim?.configured,
          dmarc: result.data.dmarc?.configured,
          score: result.data.score,
        },
      }))

      if (result.data.verified) {
        toast.success(`DNS verifie ! Score: ${result.data.score}/100`)
      } else {
        toast.error(`DNS incomplet (${result.data.score}/100). Verifiez vos enregistrements.`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setVerifying(false)
    }
  }, [orgId])

  const dnsRecords = customDomain ? [
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.resend.com include:amazonses.com ~all',
      purpose: 'SPF',
    },
    {
      type: 'TXT',
      name: 'resend._domainkey',
      value: 'Generee dans votre dashboard Resend > Domains',
      purpose: 'DKIM',
    },
    {
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${customDomain}`,
      purpose: 'DMARC',
    },
  ] : []

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  const isAuto = config?.mode !== 'custom'
  const isVerified = config?.verified === true

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-600" />
          Domaine email
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Alex envoie depuis cette adresse. Les reponses sont routees automatiquement.
        </p>
      </div>

      {/* ─── Niveau 1 : Automatique ─── */}
      <div
        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
          isAuto ? 'border-[#4F6EF7] bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => { if (!isAuto) saveAutoMode() }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAuto ? 'bg-[#4F6EF7] text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Automatique
                {isAuto && <span className="ml-2 text-xs text-[#4F6EF7]">(actif)</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Pret a envoyer immediatement, aucune configuration requise
              </p>
            </div>
          </div>
          {isAuto && <CheckCircle2 className="w-5 h-5 text-[#4F6EF7]" />}
        </div>

        {isAuto && (
          <div className="mt-3 ml-11">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
              <code className="text-sm text-gray-800 flex-1">{autoEmail}</code>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(autoEmail) }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {copiedValue === autoEmail ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Les reponses arrivent sur reply+...@inbound.facemedia.tech et sont routees automatiquement.
            </p>
          </div>
        )}
      </div>

      {/* ─── Niveau 2 : Domaine custom ─── */}
      <div
        className={`rounded-lg border-2 transition-all ${
          !isAuto ? 'border-[#4F6EF7] bg-indigo-50/50' : 'border-gray-200'
        }`}
      >
        <button
          className="w-full p-4 flex items-center justify-between"
          onClick={() => setShowCustom(!showCustom)}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!isAuto ? 'bg-[#4F6EF7] text-white' : 'bg-gray-100 text-gray-400'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                Domaine personnalise
                {!isAuto && isVerified && <span className="ml-2 text-xs text-emerald-600">(verifie)</span>}
                {!isAuto && !isVerified && <span className="ml-2 text-xs text-amber-600">(non verifie)</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Envoyez depuis votre propre domaine pour plus de credibilite
              </p>
            </div>
          </div>
          {showCustom ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showCustom && (
          <div className="px-4 pb-4 space-y-4">
            {/* Domain input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Votre domaine</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  placeholder="outreach.votre-entreprise.com"
                  className="input-field flex-1 text-sm"
                />
                <button
                  onClick={saveCustomDomain}
                  disabled={saving || !customDomain}
                  className="btn-primary text-sm px-4 flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Configurer
                </button>
              </div>
            </div>

            {/* DNS Records */}
            {config?.customDomain && (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Ajoutez ces 3 enregistrements DNS chez votre hebergeur :
                  </p>
                  <div className="space-y-2">
                    {dnsRecords.map((record, i) => (
                      <DNSRecord
                        key={i}
                        {...record}
                        copied={copiedValue === record.value}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                </div>

                {/* Verify button */}
                <button
                  onClick={verifyDNS}
                  disabled={verifying}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
                >
                  {verifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Verifier la configuration DNS
                </button>

                {/* DNS Results */}
                {config.dnsResults && (
                  <div className="space-y-1.5">
                    {[
                      { key: 'spf', label: 'SPF' },
                      { key: 'dkim', label: 'DKIM' },
                      { key: 'dmarc', label: 'DMARC' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        {config.dnsResults[key] ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className={config.dnsResults[key] ? 'text-emerald-700' : 'text-amber-700'}>
                          {label} {config.dnsResults[key] ? 'configure' : 'manquant'}
                        </span>
                      </div>
                    ))}
                    {config.dnsResults.score != null && (
                      <p className="text-xs text-gray-500 mt-1">Score: {config.dnsResults.score}/100</p>
                    )}
                  </div>
                )}

                {/* Help */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <Shield className="w-3.5 h-3.5 inline mr-1" />
                    Si vous preferez, envoyez-nous l'acces a votre panel DNS et on s'en occupe en 5 minutes.
                    Contactez-nous via le chat ou a support@facemedia.tech.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
