import { motion } from 'framer-motion'
import {
  Mail,
  MessageSquare,
  Phone,
  Send,
  Linkedin,
  Globe,
  TrendingUp,
  Users,
  Calendar,
  Zap,
  Target,
  DollarSign,
  Lightbulb,
} from 'lucide-react'

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  linkedin: Linkedin,
  instagram: Globe,
  phone: Phone,
}

const channelColors = {
  email: 'text-blue-600 bg-blue-50',
  sms: 'text-purple-600 bg-purple-50',
  whatsapp: 'text-emerald-600 bg-emerald-50',
  linkedin: 'text-sky-600 bg-sky-50',
  instagram: 'text-pink-600 bg-pink-50',
  phone: 'text-orange-600 bg-orange-50',
}

export default function StrategyPreview({ strategy, estimate, icp }) {
  if (!strategy) return null

  return (
    <div className="space-y-4">
      {/* Strategy header */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-text">Strategie generee par l'IA</h2>
            <p className="text-sm text-text-muted">
              {strategy.channels?.length || 0} canaux •{' '}
              {strategy.sequenceSteps?.length || 0} etapes •{' '}
              {strategy.tone?.replace(/_/g, ' ') || 'professionnel'}
            </p>
          </div>
        </div>

        {/* KPIs row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-accent/5 text-center">
            <p className="text-2xl font-bold text-accent">{strategy.dailyTarget || 30}</p>
            <p className="text-xs text-text-muted">Contacts/jour</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {Math.round((strategy.expectedReplyRate || 0.08) * 100)}%
            </p>
            <p className="text-xs text-text-muted">Taux reponse</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round((strategy.expectedMeetingRate || 0.02) * 100)}%
            </p>
            <p className="text-xs text-text-muted">Taux RDV</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {strategy.sequenceSteps?.[strategy.sequenceSteps.length - 1]?.day || 14}j
            </p>
            <p className="text-xs text-text-muted">Duree sequence</p>
          </div>
        </div>

        {/* Channels */}
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-accent" />
          Canaux actives
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(strategy.channels || []).map((ch, i) => {
            const Icon = channelIcons[ch.name] || Globe
            const colors = channelColors[ch.name] || 'text-gray-600 bg-gray-50'
            return (
              <motion.div
                key={ch.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-hover p-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text capitalize">{ch.name}</p>
                    <p className="text-xs text-text-muted">Priorite {ch.priority}</p>
                  </div>
                </div>
                <p className="text-xs text-text-muted">{ch.role}</p>
                <p className="text-xs text-text-muted mt-1">{ch.dailyLimit} messages/jour</p>
              </motion.div>
            )
          })}
        </div>

        {/* Sequence timeline */}
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          Sequence de prospection
        </h3>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-3">
            {(strategy.sequenceSteps || []).map((step, i) => {
              const Icon = channelIcons[step.channel] || Globe
              const colors = channelColors[step.channel] || 'text-gray-600 bg-gray-50'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 pl-1"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center z-10 ${colors}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text">{step.description}</p>
                      <span className="text-xs text-text-muted">J+{step.day}</span>
                    </div>
                    <p className="text-xs text-text-muted capitalize">
                      {step.channel} • {step.type}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Prospect estimate */}
      {estimate && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-text">Estimation prospects</h2>
              <p className="text-sm text-text-muted">
                Confiance: {Math.round((estimate.confidence || 0) * 100)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-emerald-50">
              <p className="text-2xl font-bold text-emerald-600">
                {estimate.total?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-text-muted">Total estime</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">
                {estimate.existingInCRM?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-text-muted">Deja en CRM</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-purple-50">
              <p className="text-2xl font-bold text-purple-600">
                {estimate.newFromSources?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-text-muted">Nouvelles sources</p>
            </div>
          </div>

          {/* Sources breakdown */}
          {estimate.bySource && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                Repartition par source
              </h4>
              <div className="space-y-2">
                {Object.entries(estimate.bySource)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-24 capitalize">
                        {source.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{
                            width: `${Math.min(100, (count / (estimate.total || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-text w-12 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {strategy.tips?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Conseils de l'IA
          </h3>
          <ul className="space-y-1">
            {strategy.tips.map((tip, i) => (
              <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
