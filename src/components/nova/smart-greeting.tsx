'use client'

import { useNovaStore, PERSONALITIES } from '@/lib/nova-store'
import { getPersonalizedGreeting, getSmartSuggestions } from '@/lib/adaptive-learning'
import { motion } from 'framer-motion'
import { Sparkles, Sun, Moon, CloudSun, CloudMoon, CheckSquare, Bell } from 'lucide-react'
import { useMemo } from 'react'

function TimeIcon() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return <Sun className="w-5 h-5 text-nova-gold" />
  if (hour >= 12 && hour < 17) return <CloudSun className="w-5 h-5 text-nova-gold" />
  if (hour >= 17 && hour < 21) return <CloudMoon className="w-5 h-5 text-nova-purple-light" />
  return <Moon className="w-5 h-5 text-nova-purple-light" />
}

export function SmartGreeting({ onSuggestionClick }: { onSuggestionClick?: (text: string) => void }) {
  const { personality, tasks, notifications, smartSuggestionsEnabled } = useNovaStore()

  const greeting = useMemo(() => getPersonalizedGreeting(), [])
  const suggestions = useMemo(() => smartSuggestionsEnabled ? getSmartSuggestions() : [], [smartSuggestionsEnabled])

  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done').length, [tasks])
  const unreadNotifications = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  const personalityInfo = PERSONALITIES[personality]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center h-full text-center px-4"
    >
      {/* Main greeting */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20 mb-4 mx-auto">
          <TimeIcon />
        </div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold gold-gradient-text mb-2"
      >
        {greeting.split('!')[0]}!
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground max-w-md mb-2"
      >
        {greeting.split('!').slice(1).join('!').trim()}
      </motion.p>

      {/* Pending items */}
      {(pendingTasks > 0 || unreadNotifications > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4 mb-6"
        >
          {pendingTasks > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card">
              <CheckSquare className="w-3.5 h-3.5 text-nova-gold" />
              <span className="text-xs text-foreground">{pendingTasks} task{pendingTasks !== 1 ? 's' : ''} pending</span>
            </div>
          )}
          {unreadNotifications > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card">
              <Bell className="w-3.5 h-3.5 text-nova-purple-light" />
              <span className="text-xs text-foreground">{unreadNotifications} unread</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Personality indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-2 mb-6"
      >
        <span className="text-lg">{personalityInfo.emoji}</span>
        <span className="text-xs text-muted-foreground">Speaking as {personalityInfo.name}</span>
      </motion.div>

      {/* Smart suggestions */}
      {smartSuggestionsEnabled && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-2 max-w-sm w-full"
        >
          <div className="flex items-center gap-1.5 justify-center mb-3">
            <Sparkles className="w-3.5 h-3.5 text-nova-gold" />
            <span className="text-xs font-medium text-nova-gold">Smart Suggestions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.slice(0, 4).map(suggestion => (
              <motion.button
                key={suggestion.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSuggestionClick?.(suggestion.text)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-nova-gold flex-shrink-0" />
                <span className="truncate text-xs">{suggestion.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
