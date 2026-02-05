import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const NotificationContext = createContext(null)

const STORAGE_KEY = 'fmf_notifications'
const MAX_NOTIFICATIONS = 50

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
        setUnreadCount(parsed.filter(n => !n.read).length)
      }
    } catch (e) {
      console.error('Failed to load notifications:', e)
    }
  }, [])

  // Save notifications to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
      setUnreadCount(notifications.filter(n => !n.read).length)
    } catch (e) {
      console.error('Failed to save notifications:', e)
    }
  }, [notifications])

  // Add a new notification
  const addNotification = useCallback(({ type = 'info', title, message, link }) => {
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: new Date().toISOString(),
    }

    setNotifications(prev => {
      const updated = [notification, ...prev]
      // Keep only the last MAX_NOTIFICATIONS
      return updated.slice(0, MAX_NOTIFICATIONS)
    })

    return notification.id
  }, [])

  // Mark a notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }, [])

  // Remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods for different types
  const notify = {
    info: (title, message, link) => addNotification({ type: 'info', title, message, link }),
    success: (title, message, link) => addNotification({ type: 'success', title, message, link }),
    warning: (title, message, link) => addNotification({ type: 'warning', title, message, link }),
    error: (title, message, link) => addNotification({ type: 'error', title, message, link }),
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        notify,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
