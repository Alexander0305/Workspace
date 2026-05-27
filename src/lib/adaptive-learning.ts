// NOVA Adaptive Learning System — Pattern detection & personalization

export interface WorkflowPattern {
  id: string
  pattern: string
  frequency: number
  lastOccurrence: Date
  category: string
  suggestedAction: string
}

export interface UserPreference {
  id: string
  key: string
  value: string
  learned: boolean // true if auto-detected
  confidence: number
}

export interface Suggestion {
  id: string
  text: string
  type: 'action' | 'info' | 'automation'
  icon: string
  priority: number
}

export interface TrackedAction {
  action: string
  timestamp: Date
  context: Record<string, unknown>
}

// ── Action Tracking ─────────────────────────────────────────────────

const MAX_ACTIONS = 500
let actionHistory: TrackedAction[] = []

export function trackUserAction(action: string, context: Record<string, unknown> = {}): void {
  actionHistory.push({
    action,
    timestamp: new Date(),
    context,
  })

  // Trim old actions
  if (actionHistory.length > MAX_ACTIONS) {
    actionHistory = actionHistory.slice(-MAX_ACTIONS)
  }

  // Save to localStorage
  try {
    localStorage.setItem('nova-action-history', JSON.stringify(actionHistory))
  } catch {
    // Storage full or unavailable
  }
}

export function loadActionHistory(): void {
  try {
    const stored = localStorage.getItem('nova-action-history')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        actionHistory = parsed.map((a: TrackedAction) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }))
      }
    }
  } catch {
    // Invalid data
  }
}

export function getActionHistory(): TrackedAction[] {
  return [...actionHistory]
}

// ── Pattern Detection ───────────────────────────────────────────────

const PATTERN_DEFINITIONS: Array<{
  pattern: string
  category: string
  suggestedAction: string
  detect: (actions: TrackedAction[]) => { found: boolean; frequency: number }
}> = [
  {
    pattern: 'Morning crypto check',
    category: 'finance',
    suggestedAction: 'Create automation to fetch crypto prices at 9am',
    detect: (actions) => {
      const morningCrypto = actions.filter(a =>
        a.action === 'view_switch' &&
        a.context.view === 'dashboard' &&
        isMorning(new Date(a.timestamp))
      )
      return { found: morningCrypto.length >= 3, frequency: morningCrypto.length }
    },
  },
  {
    pattern: 'Daily task review',
    category: 'productivity',
    suggestedAction: 'Create automation to show tasks every morning',
    detect: (actions) => {
      const taskViews = actions.filter(a =>
        a.action === 'view_switch' && a.context.view === 'tasks'
      )
      return { found: taskViews.length >= 5, frequency: taskViews.length }
    },
  },
  {
    pattern: 'Evening knowledge session',
    category: 'learning',
    suggestedAction: 'Schedule daily learning reminders for evening',
    detect: (actions) => {
      const eveningKnowledge = actions.filter(a =>
        a.action === 'view_switch' &&
        a.context.view === 'knowledge' &&
        isEvening(new Date(a.timestamp))
      )
      return { found: eveningKnowledge.length >= 3, frequency: eveningKnowledge.length }
    },
  },
  {
    pattern: 'Frequent chat usage',
    category: 'communication',
    suggestedAction: 'Enable keyboard shortcuts for faster chat access',
    detect: (actions) => {
      const chatActions = actions.filter(a => a.action === 'chat_send')
      return { found: chatActions.length >= 10, frequency: chatActions.length }
    },
  },
  {
    pattern: 'Voice command preference',
    category: 'accessibility',
    suggestedAction: 'Enable voice-first mode for hands-free operation',
    detect: (actions) => {
      const voiceActions = actions.filter(a => a.action === 'voice_command')
      return { found: voiceActions.length >= 5, frequency: voiceActions.length }
    },
  },
  {
    pattern: 'Code generation focus',
    category: 'development',
    suggestedAction: 'Set up code snippets library for quick access',
    detect: (actions) => {
      const codeActions = actions.filter(a =>
        a.action === 'view_switch' && a.context.view === 'code'
      )
      return { found: codeActions.length >= 4, frequency: codeActions.length }
    },
  },
  {
    pattern: 'Focus timer routine',
    category: 'productivity',
    suggestedAction: 'Auto-start focus timer at your preferred time',
    detect: (actions) => {
      const focusActions = actions.filter(a =>
        a.action === 'view_switch' && a.context.view === 'focus'
      )
      return { found: focusActions.length >= 3, frequency: focusActions.length }
    },
  },
  {
    pattern: 'Note-taking habit',
    category: 'organization',
    suggestedAction: 'Create quick-note keyboard shortcut',
    detect: (actions) => {
      const noteActions = actions.filter(a =>
        a.action === 'view_switch' && a.context.view === 'notes'
      )
      return { found: noteActions.length >= 4, frequency: noteActions.length }
    },
  },
]

export function detectPatterns(): WorkflowPattern[] {
  const patterns: WorkflowPattern[] = []

  for (const def of PATTERN_DEFINITIONS) {
    const result = def.detect(actionHistory)
    if (result.found) {
      const lastOccurrence = actionHistory
        .filter(a => a.action === 'view_switch' || a.action === 'chat_send' || a.action === 'voice_command')
        .reduce((latest, a) => (a.timestamp > latest ? a.timestamp : latest), new Date(0))

      patterns.push({
        id: `pattern-${def.pattern.toLowerCase().replace(/\s+/g, '-')}`,
        pattern: def.pattern,
        frequency: result.frequency,
        lastOccurrence: lastOccurrence > new Date(0) ? lastOccurrence : new Date(),
        category: def.category,
        suggestedAction: def.suggestedAction,
      })
    }
  }

  // View frequency patterns
  const viewCounts: Record<string, number> = {}
  for (const action of actionHistory) {
    if (action.action === 'view_switch' && action.context.view) {
      const view = String(action.context.view)
      viewCounts[view] = (viewCounts[view] || 0) + 1
    }
  }

  return patterns
}

// ── Preference Detection ────────────────────────────────────────────

export function detectPreferences(): UserPreference[] {
  const preferences: UserPreference[] = []
  const prefId = (key: string) => `pref-${key.toLowerCase().replace(/\s+/g, '-')}`

  // Most used view
  const viewCounts: Record<string, number> = {}
  for (const action of actionHistory) {
    if (action.action === 'view_switch' && action.context.view) {
      const view = String(action.context.view)
      viewCounts[view] = (viewCounts[view] || 0) + 1
    }
  }
  const topView = Object.entries(viewCounts).sort((a, b) => b[1] - a[1])[0]
  if (topView) {
    preferences.push({
      id: prefId('favorite-view'),
      key: 'Favorite View',
      value: topView[0],
      learned: true,
      confidence: Math.min(topView[1] / 10, 1),
    })
  }

  // Time preference
  const hourCounts: Record<string, number> = {}
  for (const action of actionHistory) {
    const hour = new Date(action.timestamp).getHours()
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
    hourCounts[period] = (hourCounts[period] || 0) + 1
  }
  const topPeriod = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
  if (topPeriod) {
    preferences.push({
      id: prefId('active-period'),
      key: 'Most Active Period',
      value: topPeriod[0],
      learned: true,
      confidence: Math.min(topPeriod[1] / 15, 1),
    })
  }

  // Chat frequency
  const chatActions = actionHistory.filter(a => a.action === 'chat_send').length
  if (chatActions > 3) {
    preferences.push({
      id: prefId('chat-frequency'),
      key: 'Chat Usage',
      value: chatActions > 20 ? 'heavy' : chatActions > 10 ? 'moderate' : 'light',
      learned: true,
      confidence: 0.7,
    })
  }

  return preferences
}

// ── Smart Suggestions ───────────────────────────────────────────────

export function getSmartSuggestions(): Suggestion[] {
  const suggestions: Suggestion[] = []
  const hour = new Date().getHours()
  const patterns = detectPatterns()

  // Time-based suggestions
  if (hour >= 5 && hour < 12) {
    suggestions.push({
      id: 'sg-morning-plan',
      text: 'Plan your day',
      type: 'action',
      icon: 'Calendar',
      priority: 10,
    })
    suggestions.push({
      id: 'sg-morning-tasks',
      text: 'Review today\'s tasks',
      type: 'action',
      icon: 'CheckSquare',
      priority: 9,
    })
  } else if (hour >= 12 && hour < 17) {
    suggestions.push({
      id: 'sg-afternoon-focus',
      text: 'Start a focus session',
      type: 'action',
      icon: 'Timer',
      priority: 8,
    })
    suggestions.push({
      id: 'sg-afternoon-catchup',
      text: 'Catch up on messages',
      type: 'info',
      icon: 'MessageSquare',
      priority: 7,
    })
  } else if (hour >= 17 && hour < 21) {
    suggestions.push({
      id: 'sg-evening-review',
      text: 'Review your progress',
      type: 'action',
      icon: 'BarChart3',
      priority: 8,
    })
    suggestions.push({
      id: 'sg-evening-winddown',
      text: 'Wind down with a note',
      type: 'action',
      icon: 'FileText',
      priority: 7,
    })
  } else {
    suggestions.push({
      id: 'sg-night-focus',
      text: 'Late night focus mode',
      type: 'action',
      icon: 'Moon',
      priority: 9,
    })
    suggestions.push({
      id: 'sg-night-learn',
      text: 'Learn something new',
      type: 'info',
      icon: 'Brain',
      priority: 7,
    })
  }

  // Pattern-based suggestions
  if (patterns.some(p => p.pattern === 'Frequent chat usage')) {
    suggestions.push({
      id: 'sg-chat-shortcuts',
      text: 'Try keyboard shortcuts',
      type: 'info',
      icon: 'Keyboard',
      priority: 6,
    })
  }

  if (patterns.some(p => p.category === 'productivity')) {
    suggestions.push({
      id: 'sg-automate',
      text: 'Set up automations',
      type: 'automation',
      icon: 'Zap',
      priority: 7,
    })
  }

  // Context-based
  if (patterns.length > 2) {
    suggestions.push({
      id: 'sg-patterns',
      text: `You have ${patterns.length} detected patterns`,
      type: 'info',
      icon: 'Sparkles',
      priority: 5,
    })
  }

  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5)
}

// ── Personalized Greeting ──────────────────────────────────────────

export function getPersonalizedGreeting(): string {
  const hour = new Date().getHours()
  const preferences = detectPreferences()
  const patterns = detectPatterns()

  let timeGreeting: string
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'Good morning'
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'Good afternoon'
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = 'Good evening'
  } else {
    timeGreeting = 'Working late'
  }

  const activePeriod = preferences.find(p => p.key === 'Most Active Period')
  if (activePeriod) {
    const isUsualTime =
      (activePeriod.value === 'morning' && hour >= 5 && hour < 12) ||
      (activePeriod.value === 'afternoon' && hour >= 12 && hour < 17) ||
      (activePeriod.value === 'evening' && hour >= 17 && hour < 21) ||
      (activePeriod.value === 'night' && (hour >= 21 || hour < 5))

    if (isUsualTime) {
      return `${timeGreeting}! Right on schedule. I've noticed you're most active during the ${activePeriod.value} — let's make it count.`
    }
  }

  if (patterns.length > 0) {
    return `${timeGreeting}! I've detected ${patterns.length} workflow patterns. Ready to help you optimize your day.`
  }

  return `${timeGreeting}! I'm NOVA, your Neural Operative Virtual Assistant. How can I help you today?`
}

// ── Learning Progress ──────────────────────────────────────────────

export function getLearningProgress(): { patternsLearned: number; preferencesDetected: number; personalizationScore: number } {
  const patterns = detectPatterns()
  const preferences = detectPreferences()
  const totalActions = actionHistory.length

  // Personalization score: 0-100 based on how well NOVA knows the user
  const patternScore = Math.min(patterns.length * 10, 40)
  const preferenceScore = Math.min(preferences.length * 8, 30)
  const actionScore = Math.min(totalActions / 5, 30)

  return {
    patternsLearned: patterns.length,
    preferencesDetected: preferences.length,
    personalizationScore: Math.min(Math.round(patternScore + preferenceScore + actionScore), 100),
  }
}

// ── Clear Learning Data ─────────────────────────────────────────────

export function clearLearningData(): void {
  actionHistory = []
  try {
    localStorage.removeItem('nova-action-history')
  } catch {
    // Storage unavailable
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function isMorning(date: Date): boolean {
  const h = date.getHours()
  return h >= 6 && h < 12
}

function isEvening(date: Date): boolean {
  const h = date.getHours()
  return h >= 17 && h < 21
}
