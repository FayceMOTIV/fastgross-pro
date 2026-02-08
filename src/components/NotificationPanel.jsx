import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/contexts/NotificationContext'
import { useDemo } from '@/hooks/useDemo'
import { demoNotifications } from '@/data/demoData'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Bell,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  CheckCheck,
  MessageSquare,
  Users,
  Euro,
} from 'lucide-react'

const typeConfig = {
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  reply: {
    icon: MessageSquare,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
  prospect: {
    icon: Users,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  converted: {
    icon: Euro,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
  },
}

export default function NotificationPanel() {
  const navigate = useNavigate()
  const { isDemo } = useDemo()
  const {
    notifications: realNotifications,
    unreadCount: realUnreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)

  // Use demo or real notifications
  const demoFormattedNotifications = demoNotifications.map((n) => ({
    ...n,
    createdAt: n.timestamp,
    read: n.read,
  }))

  const notifications = isDemo ? demoFormattedNotifications : realNotifications
  const unreadCount = isDemo ? demoNotifications.filter((n) => !n.read).length : realUnreadCount

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    if (notification.link) {
      navigate(notification.link)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-500 text-dark-950 text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-dark-800 flex items-center justify-between">
            <h3 className="font-medium text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Tout supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                <p className="text-dark-500 text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-800/50">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type] || typeConfig.info
                  const Icon = config.icon

                  return (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-3 hover:bg-dark-800/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-dark-800/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Unread indicator */}
                      {!notification.read && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-500 rounded-full" />
                      )}

                      <div className="flex gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-dark-400 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-[10px] text-dark-500 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(notification.id)
                          }}
                          className="p-1 rounded text-dark-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
