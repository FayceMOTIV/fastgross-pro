/**
 * ChannelStatsBar — Barre stats horizontale par canal
 */

import {
  Mail,
  MessageSquare,
  Phone,
  Instagram,
  Linkedin,
  Send,
  Mic,
  Stamp,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

const channelIcons = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  voicemail: Mic,
  postal: Stamp,
  twitter: Send,
}

const channelLabels = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  voicemail: 'Voicemail',
  postal: 'Postal',
  twitter: 'Twitter',
}

const healthConfig = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

export default function ChannelStatsBar({ channel, stats }) {
  const Icon = channelIcons[channel] || Send
  const label = channelLabels[channel] || channel
  const health = healthConfig[stats?.health] || healthConfig.healthy
  const HealthIcon = health.icon

  const sentToday = stats?.sentToday || 0
  const dailyLimit = stats?.dailyLimit || 1
  const usage = Math.min((sentToday / dailyLimit) * 100, 100)
  const usageColor =
    usage >= 90 ? 'bg-red-500' : usage >= 70 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${health.bg} border-gray-200`}>
      {/* Channel icon + name */}
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>

      {/* Health indicator */}
      <div className="flex items-center gap-1 w-24 flex-shrink-0">
        <HealthIcon className={`w-3.5 h-3.5 ${health.color}`} />
        <span className={`text-xs font-medium capitalize ${health.color}`}>
          {stats?.health || 'healthy'}
        </span>
      </div>

      {/* Usage bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>
            {sentToday} / {dailyLimit} aujourd'hui
          </span>
          <span>{Math.round(usage)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usageColor}`}
            style={{ width: `${usage}%` }}
          />
        </div>
      </div>

      {/* Key metrics */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{stats?.replyRate || 0}%</div>
          <div className="text-xs text-gray-500">Reponses</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">{stats?.bounceRate || 0}%</div>
          <div className="text-xs text-gray-500">Bounces</div>
        </div>
      </div>

      {/* Error count */}
      {(stats?.errors || 0) > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {stats.errors} err
        </span>
      )}
    </div>
  )
}
