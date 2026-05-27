'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Info, AlertTriangle, CheckCircle, XCircle, X, Check, Trash2 } from 'lucide-react'

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', ring: 'ring-blue-400/20' },
  warning: { icon: AlertTriangle, color: 'text-nova-gold', bg: 'bg-nova-gold/10', ring: 'ring-nova-gold/20' },
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', ring: 'ring-red-400/20' },
}

function timeAgo(date: Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

export function NotificationPanel() {
  const {
    showNotifications,
    setShowNotifications,
    notifications,
    markAsRead,
    clearNotifications,
  } = useNovaStore()

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) markAsRead(n.id)
    })
  }

  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-nova-gold" />
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nova-purple text-white font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </motion.button>
                )}
                {notifications.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearNotifications}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map(notification => {
                    const config = TYPE_CONFIG[notification.type]
                    const Icon = config.icon
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={() => markAsRead(notification.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          notification.read ? 'bg-secondary/10' : 'bg-secondary/20 ring-1 ring-nova-gold/10'
                        } hover:bg-secondary/30`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-semibold text-foreground truncate">{notification.title}</h4>
                              {!notification.read && <div className="w-1.5 h-1.5 rounded-full bg-nova-gold flex-shrink-0" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(notification.createdAt)}</p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
