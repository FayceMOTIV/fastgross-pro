import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Loader2,
  Eye,
  Mail,
  MessageSquare,
  Phone,
  DollarSign,
  Users,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useDemo } from '@/contexts/DemoContext'
import { useCloudFunction } from '@/hooks/useCloudFunctions'
import toast from 'react-hot-toast'

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
}

const DEMO_DRY_RUN = {
  previewLeads: [
    {
      name: 'Sophie Martin',
      company: 'TechVision SAS',
      score: 92,
      channel: 'email',
      preview: 'Bonjour Sophie, j\'ai vu que TechVision recrute des devs React...',
      cost: 0.001,
    },
    {
      name: 'Pierre Durand',
      company: 'GreenEnergy',
      score: 85,
      channel: 'email',
      preview: 'Bonjour Pierre, felicitations pour votre levee de fonds...',
      cost: 0.001,
    },
    {
      name: 'Claire Dupont',
      company: 'Mairie Lyon',
      score: 78,
      channel: 'email',
      preview: 'Madame Dupont, concernant votre appel d\'offres...',
      cost: 0.001,
    },
    {
      name: 'Jean Lefebvre',
      company: 'DataFlow',
      score: 72,
      channel: 'sms',
      preview: 'Jean, decouvrez comment DataFlow peut accelerer sa croissance...',
      cost: 0.045,
    },
    {
      name: 'Marie Blanc',
      company: 'FinTech Pro',
      score: 68,
      channel: 'whatsapp',
      preview: 'Bonjour Marie, votre entreprise recemment creee pourrait beneficier...',
      cost: 0.0,
    },
  ],
  totalProspectsFound: 1250,
  estimatedDaily: 30,
  estimatedCost: 0.95,
  channelBreakdown: { email: 20, sms: 5, whatsapp: 5 },
}

export default function DryRunPreview({ campaignId }) {
  const { currentOrg } = useOrg()
  const { isDemo } = useDemo()
  const { call: runDryRun, loading: running } = useCloudFunction('runDryRun')

  const [result, setResult] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const handleRun = useCallback(async () => {
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 2000))
        setResult(DEMO_DRY_RUN)
        setExpanded(true)
        toast.success('Dry run termine')
        return
      }

      const res = await runDryRun({ orgId: currentOrg.id, campaignId })
      setResult(res.dryRun)
      setExpanded(true)
      toast.success('Dry run termine')
    } catch (error) {
      toast.error('Erreur dry run: ' + (error?.message || 'Echec'))
    }
  }, [isDemo, currentOrg?.id, campaignId, runDryRun])

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-semibold text-text">Mode Dry Run</h3>
          <span className="text-xs text-text-muted">(test sans envoi)</span>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Lancer le test
        </button>
      </div>

      <AnimatePresence>
        {result && expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-accent/5 text-center">
                <Users className="w-4 h-4 text-accent mx-auto mb-1" />
                <p className="text-lg font-bold text-accent">
                  {result.totalProspectsFound?.toLocaleString()}
                </p>
                <p className="text-xs text-text-muted">Prospects trouves</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 text-center">
                <Zap className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-emerald-600">{result.estimatedDaily}</p>
                <p className="text-xs text-text-muted">Envois/jour estimes</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-center">
                <DollarSign className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-600">
                  {result.estimatedCost?.toFixed(2)} EUR
                </p>
                <p className="text-xs text-text-muted">Cout/jour estime</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 text-center">
                <Mail className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-600">
                  {Object.keys(result.channelBreakdown || {}).length}
                </p>
                <p className="text-xs text-text-muted">Canaux actifs</p>
              </div>
            </div>

            {/* Channel breakdown */}
            {result.channelBreakdown && (
              <div className="flex items-center gap-4 text-sm">
                {Object.entries(result.channelBreakdown).map(([ch, count]) => {
                  const Icon = channelIcons[ch] || Mail
                  return (
                    <div key={ch} className="flex items-center gap-1.5 text-text-muted">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="capitalize">{ch}:</span>
                      <span className="font-medium text-text">{count}/j</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Preview leads */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                Apercu des 5 premiers leads
              </h4>
              <div className="space-y-2">
                {(result.previewLeads || []).map((lead, i) => {
                  const Icon = channelIcons[lead.channel] || Mail
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-xl bg-gray-50 flex items-start gap-3"
                    >
                      {/* Score */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          lead.score >= 80
                            ? 'bg-emerald-500'
                            : lead.score >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-400'
                        }`}
                      >
                        {lead.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text">{lead.name}</p>
                          <span className="text-xs text-text-muted">{lead.company}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{lead.preview}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="capitalize">{lead.channel}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 text-yellow-700 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Ceci est une simulation. Aucun message n'a ete envoye. Les chiffres sont des
                estimations basees sur votre ICP et les sources disponibles.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
