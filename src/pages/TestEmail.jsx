/**
 * Test Email Page
 * Simple page to test Resend email configuration
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Mail,
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  Loader2,
  Shield,
  Globe
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTestEmail, useAdminStatus } from '@/hooks/useCloudFunctions'

export default function TestEmail() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getAdminStatus } = useAdminStatus()
  const {
    sendTestEmail,
    getTestEmailLogs,
    verifyResendConfig,
    sending,
    loading
  } = useTestEmail()

  const [canAccess, setCanAccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const [resendStatus, setResendStatus] = useState(null)
  const [emailLogs, setEmailLogs] = useState([])

  // Form state
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('Test Email - Face Media Factory')
  const [content, setContent] = useState('')
  const [fromName, setFromName] = useState('Face Media Factory')

  // Check access on mount
  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    setChecking(true)
    try {
      const status = await getAdminStatus()

      if (!status.isSuperAdmin && !status.isBetaUser) {
        toast.error('Acces refuse - Super admin ou beta requis')
        navigate('/dashboard')
        return
      }

      setCanAccess(true)
      await loadData()
    } catch (error) {
      console.error('Error checking access:', error)
      toast.error('Erreur de verification')
      navigate('/dashboard')
    } finally {
      setChecking(false)
    }
  }

  const loadData = async () => {
    try {
      const [configResult, logsResult] = await Promise.all([
        verifyResendConfig(),
        getTestEmailLogs({ limit: 20 })
      ])
      setResendStatus(configResult)
      setEmailLogs(logsResult.logs || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSendTest = async (e) => {
    e.preventDefault()
    if (!to.trim()) return

    try {
      const result = await sendTestEmail({
        to: to.trim(),
        subject: subject.trim() || 'Test Email - Face Media Factory',
        content: content.trim() || undefined,
        fromName: fromName.trim() || 'Face Media Factory'
      })

      toast.success(`Email de test envoye a ${to}`)
      setTo('')
      setContent('')
      await loadData()
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error(error.message || 'Erreur lors de l\'envoi')
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto mb-4" />
          <p className="text-dark-400">Verification des droits...</p>
        </div>
      </div>
    )
  }

  if (!canAccess) {
    return null
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <Mail className="w-8 h-8 text-brand-400" />
          Test Email
        </h1>
        <p className="text-dark-400 mt-1">
          Testez la configuration Resend et l'envoi d'emails
        </p>
      </div>

      {/* Resend Status */}
      <div className={`card p-6 ${
        resendStatus?.configured
          ? 'border-green-500/20 bg-green-500/5'
          : 'border-red-500/20 bg-red-500/5'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              resendStatus?.configured
                ? 'bg-green-500/10'
                : 'bg-red-500/10'
            }`}>
              {resendStatus?.configured ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {resendStatus?.configured ? 'Resend configure' : 'Resend non configure'}
              </p>
              <p className="text-sm text-dark-400">
                {resendStatus?.message}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost p-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {resendStatus?.domains?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-dark-700">
            <p className="text-sm text-dark-400 mb-2">Domaines configures:</p>
            <div className="flex flex-wrap gap-2">
              {resendStatus.domains.map((domain, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1 bg-dark-800 rounded-lg"
                >
                  <Globe className="w-4 h-4 text-brand-400" />
                  <span className="text-sm text-white">{domain.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    domain.status === 'verified'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {domain.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Send Test Email Form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-brand-400" />
            Envoyer un email de test
          </h2>

          <form onSubmit={handleSendTest} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Destinataire *
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="test@example.com"
                className="input-field w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Nom d'expediteur
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Face Media Factory"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Sujet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Test Email - Face Media Factory"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-dark-400 mb-2">
                Contenu HTML (optionnel)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<h1>Mon email de test</h1><p>Contenu HTML...</p>"
                className="input-field w-full min-h-[100px]"
                rows={4}
              />
              <p className="text-xs text-dark-500 mt-1">
                Laissez vide pour utiliser le template par defaut
              </p>
            </div>

            <button
              type="submit"
              disabled={sending || !to.trim() || !resendStatus?.configured}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer l'email de test
                </>
              )}
            </button>

            {!resendStatus?.configured && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Configurez Resend pour envoyer des emails
              </div>
            )}
          </form>
        </div>

        {/* Email Logs */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-dark-400" />
              Historique des tests
            </h2>
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-ghost p-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {emailLogs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">Aucun email de test envoye</p>
              <p className="text-sm text-dark-500 mt-1">
                Envoyez un email pour voir l'historique
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {emailLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.success
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm text-white">{log.to}</p>
                        <p className="text-xs text-dark-500">{log.subject}</p>
                      </div>
                    </div>
                    <span className="text-xs text-dark-500">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString('fr-FR')
                        : '-'}
                    </span>
                  </div>
                  {!log.success && log.error && (
                    <p className="text-xs text-red-400 mt-2">
                      {typeof log.error === 'string' ? log.error : log.error.message}
                    </p>
                  )}
                  {log.success && log.resendId && (
                    <p className="text-xs text-dark-500 mt-2">
                      ID: {log.resendId}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-400" />
          Configuration Resend
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-dark-400 mb-2">Pour configurer Resend:</p>
            <ol className="text-sm text-dark-300 space-y-2 list-decimal list-inside">
              <li>Creez un compte sur <span className="text-brand-400">resend.com</span></li>
              <li>Ajoutez et verifiez votre domaine</li>
              <li>Creez une API Key</li>
              <li>Ajoutez la cle dans Firebase Secrets: <code className="bg-dark-800 px-2 py-0.5 rounded">RESEND_API_KEY</code></li>
            </ol>
          </div>
          <div>
            <p className="text-sm text-dark-400 mb-2">Commande Firebase:</p>
            <pre className="text-xs bg-dark-800 p-3 rounded-lg overflow-x-auto">
              <code className="text-green-400">
                firebase functions:secrets:set RESEND_API_KEY
              </code>
            </pre>
            <p className="text-xs text-dark-500 mt-2">
              La cle sera demandee en input apres cette commande
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
