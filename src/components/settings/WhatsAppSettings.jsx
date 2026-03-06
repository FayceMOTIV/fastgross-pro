/**
 * WhatsApp Settings Component
 * Evolution API Multi-Tenant — QR Code Connection
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useOrg } from '../../contexts/OrgContext'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCloudFunction } from '../../hooks/useCloudFunctions'
import { toast } from 'react-hot-toast'
import {
  MessageCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  FileText,
  Smartphone,
  QrCode,
  Unplug,
  Wifi,
  WifiOff,
  Clock,
  Loader2,
} from 'lucide-react'

const POLLING_INTERVAL_MS = 3000
const QR_EXPIRY_SECONDS = 60

export default function WhatsAppSettings() {
  const { currentOrg } = useOrg()
  const [connectionStatus, setConnectionStatus] = useState('loading')
  const [phoneNumber, setPhoneNumber] = useState(null)
  const [connectedAt, setConnectedAt] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [pairingCode, setPairingCode] = useState(null)
  const [qrTimer, setQrTimer] = useState(QR_EXPIRY_SECONDS)
  const [templates, setTemplates] = useState([])
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('config')
  const [syncing, setSyncing] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const pollingRef = useRef(null)
  const qrTimerRef = useRef(null)

  const { call: callCreateInstance, loading: creatingInstance } =
    useCloudFunction('createWhatsAppInstance')
  const { call: callGetQRCode, loading: loadingQR } = useCloudFunction('getWhatsAppQRCode')
  const { call: callGetStatus } = useCloudFunction('getWhatsAppConnectionStatus')
  const { call: callDisconnect, loading: disconnecting } = useCloudFunction('disconnectWhatsApp')

  // --- Load initial state ---
  useEffect(() => {
    if (currentOrg?.id) {
      checkStatus()
      loadTemplates()
      loadStats()
    }
    return () => {
      stopPolling()
      stopQrTimer()
    }
  }, [currentOrg?.id])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const stopQrTimer = useCallback(() => {
    if (qrTimerRef.current) {
      clearInterval(qrTimerRef.current)
      qrTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const result = await callGetStatus({ orgId: currentOrg.id })
        if (result?.status === 'connected') {
          setConnectionStatus('connected')
          setPhoneNumber(result.phoneNumber || null)
          setConnectedAt(result.connectedAt || null)
          setQrCode(null)
          setPairingCode(null)
          stopPolling()
          stopQrTimer()
          toast.success('WhatsApp connecte avec succes !')
        }
      } catch {
        // Ignorer les erreurs de polling
      }
    }, POLLING_INTERVAL_MS)
  }, [currentOrg?.id])

  const startQrTimer = useCallback(() => {
    stopQrTimer()
    setQrTimer(QR_EXPIRY_SECONDS)
    qrTimerRef.current = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          stopQrTimer()
          setQrCode(null)
          setPairingCode(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const checkStatus = async () => {
    try {
      setConnectionStatus('loading')
      const result = await callGetStatus({ orgId: currentOrg.id })
      setConnectionStatus(result?.status || 'not_configured')
      setPhoneNumber(result?.phoneNumber || null)
      setConnectedAt(result?.connectedAt || null)
    } catch {
      setConnectionStatus('not_configured')
    }
  }

  const handleConnect = async () => {
    try {
      // Creer l'instance
      await callCreateInstance({ orgId: currentOrg.id })
      setConnectionStatus('connecting')
      toast.success('Instance WhatsApp creee')

      // Recuperer le QR code
      await fetchQRCode()
    } catch (error) {
      toast.error(error.message || "Erreur lors de la creation de l'instance")
    }
  }

  const fetchQRCode = async () => {
    try {
      const result = await callGetQRCode({ orgId: currentOrg.id })

      if (result?.status === 'connected') {
        setConnectionStatus('connected')
        setQrCode(null)
        setPairingCode(null)
        stopPolling()
        stopQrTimer()
        toast.success('WhatsApp deja connecte !')
        await checkStatus()
        return
      }

      if (result?.base64) {
        setQrCode(result.base64)
        setPairingCode(result.pairingCode || null)
        setConnectionStatus('connecting')
        startPolling()
        startQrTimer()
      } else {
        toast.error('QR code non disponible. Reessayez.')
      }
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la recuperation du QR code')
    }
  }

  const handleDisconnect = async () => {
    try {
      await callDisconnect({ orgId: currentOrg.id })
      setConnectionStatus('disconnected')
      setPhoneNumber(null)
      setConnectedAt(null)
      setQrCode(null)
      setPairingCode(null)
      setConfirmDisconnect(false)
      stopPolling()
      stopQrTimer()
      toast.success('WhatsApp deconnecte')
    } catch (error) {
      toast.error(error.message || 'Erreur lors de la deconnexion')
    }
  }

  const loadTemplates = async () => {
    try {
      const templatesRef = collection(db, 'organizations', currentOrg.id, 'whatsappTemplates')
      const templatesSnap = await getDocs(templatesRef)
      setTemplates(templatesSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch {
      // Silently fail
    }
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const analyticsRef = doc(db, 'organizations', currentOrg.id, 'channelAnalytics', today)
      const analyticsSnap = await getDoc(analyticsRef)
      if (analyticsSnap.exists()) {
        setStats(analyticsSnap.data().channels?.whatsapp || null)
      }
    } catch {
      // Silently fail
    }
  }

  const handleSyncTemplates = async () => {
    setSyncing(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/syncWhatsAppTemplates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(`${result.synced} templates synchronises`)
        loadTemplates()
      } else {
        toast.error(result.error || 'Echec synchronisation')
      }
    } catch {
      toast.error('Erreur de synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp?.toDate
      ? timestamp.toDate()
      : new Date(timestamp._seconds ? timestamp._seconds * 1000 : timestamp)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  const isConnected = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <MessageCircle
              className={`w-6 h-6 ${isConnected ? 'text-green-600' : 'text-gray-500'}`}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Configuration WhatsApp</h3>
            <p className="text-sm text-gray-500">Evolution API — Connexion par QR code</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Connecte</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>Non connecte</span>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Envoyes</p>
            <p className="text-2xl font-bold text-gray-900">{stats.sent || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Delivres</p>
            <p className="text-2xl font-bold text-green-600">{stats.delivered || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Lus</p>
            <p className="text-2xl font-bold text-blue-600">{stats.read || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Reponses</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.replied || 0}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Smartphone className="w-4 h-4 inline mr-2" />
            Connexion
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Templates ({templates.length})
          </button>
        </nav>
      </div>

      {activeTab === 'config' && (
        <>
          {/* Etat Connecte */}
          {isConnected && (
            <div className="bg-white border border-green-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">WhatsApp connecte</h4>
                  <p className="text-sm text-gray-500">
                    Votre numero est pret a envoyer des messages
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">Numero</p>
                  <p className="text-lg font-medium text-gray-900">
                    {phoneNumber ? `+${phoneNumber}` : 'Non disponible'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Connecte depuis</p>
                  <p className="text-lg font-medium text-gray-900">
                    {connectedAt ? formatDate(connectedAt) : 'Maintenant'}
                  </p>
                </div>
              </div>

              {/* Bouton deconnecter */}
              {!confirmDisconnect ? (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Unplug className="w-4 h-4" />
                  Deconnecter
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700 flex-1">
                    Confirmer la deconnexion ? Les envois WhatsApp seront desactives.
                  </p>
                  <button onClick={() => setConfirmDisconnect(false)} className="btn-ghost text-sm">
                    Annuler
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-2"
                  >
                    {disconnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Etat Non connecte / Connecting */}
          {!isConnected && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
              {/* Pas encore de QR code */}
              {!qrCode && !isConnecting && (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Connectez votre WhatsApp
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Scannez un QR code depuis votre telephone pour connecter votre numero WhatsApp
                      a Face Media Factory
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={creatingInstance || loadingQR}
                    className="btn-primary flex items-center gap-2 mx-auto"
                  >
                    {creatingInstance || loadingQR ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Smartphone className="w-4 h-4" />
                    )}
                    Connecter votre WhatsApp
                  </button>
                </div>
              )}

              {/* QR Code affiche */}
              {(qrCode || (isConnecting && !qrCode)) && (
                <div className="text-center space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Scannez le QR code</h4>
                  <p className="text-sm text-gray-500">
                    Ouvrez WhatsApp sur votre telephone &gt; Appareils connectes &gt; Connecter un
                    appareil
                  </p>

                  {qrCode ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white border-2 border-gray-200 rounded-2xl inline-block">
                        <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                      </div>

                      {/* Timer */}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>Expire dans {qrTimer}s</span>
                      </div>

                      {/* Pairing code */}
                      {pairingCode && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Code d'appairage (alternative)
                          </p>
                          <p className="text-xl font-mono font-bold tracking-wider text-gray-900">
                            {pairingCode}
                          </p>
                        </div>
                      )}

                      {/* Polling indicator */}
                      <div className="flex items-center gap-2 text-sm text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>En attente de connexion...</span>
                      </div>

                      {/* Bouton refresh QR */}
                      <button
                        onClick={fetchQRCode}
                        disabled={loadingQR}
                        className="btn-secondary flex items-center gap-2"
                      >
                        {loadingQR ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Actualiser le QR code
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-8 bg-gray-50 rounded-2xl">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                      </div>
                      <p className="text-sm text-gray-500">Chargement du QR code...</p>
                      <button
                        onClick={fetchQRCode}
                        disabled={loadingQR}
                        className="btn-secondary flex items-center gap-2"
                      >
                        {loadingQR ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Recuperer le QR code
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Evolution API */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Evolution API — WhatsApp gratuit</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>Pas de limitation 24h — messages libres a tout moment</li>
                  <li>Pas besoin de templates approuves par Meta</li>
                  <li>Instance dediee par organisation</li>
                  <li>Votre numero WhatsApp personnel ou professionnel</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Conformite WhatsApp</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>Maximum 2 WhatsApp par prospect sur 30 jours</li>
                  <li>Opt-in specifique WhatsApp requis</li>
                  <li>Respectez les heures ouvrables configurees</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Templates pour vos envois WhatsApp</p>
            <button
              onClick={handleSyncTemplates}
              disabled={syncing}
              className="btn-secondary flex items-center gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Synchroniser
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Aucun template synchronise</p>
              <p className="text-sm text-gray-500 mt-1">
                Cliquez sur "Synchroniser" pour importer vos templates
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((template) => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">{template.name}</h5>
                      <p className="text-sm text-gray-500 mt-1">
                        {template.language} {template.category}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        template.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : template.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>
                  {template.body && (
                    <p className="text-sm text-gray-600 mt-3 bg-gray-50 p-3 rounded">
                      {template.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
