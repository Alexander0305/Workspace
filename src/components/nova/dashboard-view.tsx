'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion } from 'framer-motion'
import {
  Cpu, MemoryStick, HardDrive, TrendingUp, TrendingDown, Bitcoin,
  Twitter, Github, Linkedin, Landmark, Zap, Activity, Clock, ArrowUpRight, ArrowDownRight,
  CheckSquare, Calendar, Timer, Zap as ZapIcon, Brain, Sparkles, Eye, Lightbulb,
  Plus, X, Landmark as BankIcon, Settings, Rocket,
} from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getPersonalizedGreeting, detectPatterns, getLearningProgress, getSmartSuggestions } from '@/lib/adaptive-learning'
import { useAuth } from '@/lib/auth-context'

interface CryptoData {
  symbol: string
  name: string
  price: number
  change24h: number
  sparkline: number[]
}

interface SystemStats {
  cpu: number
  ram: number
  storage: number
  platform: string
  cpuModel: string
  cpuCores: number
  totalMemory: number
  uptime: string
}

function CircularProgress({ value, label, icon: Icon, color }: { value: number; label: string; icon: React.ElementType; color: string }) {
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" stroke="rgba(212,165,116,0.1)" strokeWidth="4" fill="none" />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <span className="text-lg font-bold text-foreground">{value}%</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function MiniSparkline({ data, color, positive }: { data: number[]; color: string; positive: boolean }) {
  const chartData = data.map((value, i) => ({ i, value }))

  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-${color}-${Math.random()}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${color}-0)`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DashboardView() {
  const { authFetch } = useAuth()
  const {
    tasks, calendarEvents, focusSessionsCompleted, focusTotalMinutes, automations,
    adaptiveLearningEnabled, smartSuggestionsEnabled,
    setActiveView, toggleCommandPalette,
    bankingAccounts, transactions, addTransaction,
    socialAccounts, toggleSocialConnection,
    tradingData,
    cryptoHoldings,
    userActions, trackAction,
    knowledgeEntries, llmTrainingStatus,
    featureFlags,
    addNotification,
  } = useNovaStore()

  // System stats
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpu: 0, ram: 0, storage: 0, platform: 'loading', cpuModel: 'loading', cpuCores: 0, totalMemory: 0, uptime: 'loading',
  })

  // Crypto data
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [cryptoLastUpdated, setCryptoLastUpdated] = useState<string>('')
  const [cryptoOffline, setCryptoOffline] = useState(false)

  // Transaction dialog
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [newTxDesc, setNewTxDesc] = useState('')
  const [newTxAmount, setNewTxAmount] = useState('')
  const [newTxType, setNewTxType] = useState<'credit' | 'debit'>('credit')
  const [newTxCategory, setNewTxCategory] = useState('Income')

  // Fetch system stats
  const fetchSystemStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/system')
      if (res.ok) {
        const data = await res.json()
        setSystemStats(data)
      }
    } catch {
      // Keep existing values on failure
    }
  }, [authFetch])

  // Fetch crypto data
  const fetchCryptoData = useCallback(async () => {
    try {
      const symbols = cryptoHoldings.map(h => h.symbol).join(',')
      const res = await authFetch(`/api/crypto?symbols=${symbols || 'BTC,ETH,SOL,ADA'}`)
      if (res.ok) {
        const result = await res.json()
        setCryptoData(result.data || [])
        setCryptoLastUpdated(result.lastUpdated || new Date().toISOString())
        setCryptoOffline(false)
      } else {
        setCryptoOffline(true)
      }
    } catch {
      setCryptoOffline(true)
    }
  }, [authFetch, cryptoHoldings])

  useEffect(() => {
    let mounted = true
    const load = async () => { if (mounted) await fetchSystemStats() }
    load()
    const interval = setInterval(fetchSystemStats, 5000)
    return () => { mounted = false; clearInterval(interval) }
  }, [fetchSystemStats])

  useEffect(() => {
    let mounted = true
    const load = async () => { if (mounted) await fetchCryptoData() }
    load()
    const interval = setInterval(fetchCryptoData, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [fetchCryptoData])

  // AI Insights data
  const greeting = useMemo(() => adaptiveLearningEnabled ? getPersonalizedGreeting() : '', [adaptiveLearningEnabled])
  const patterns = useMemo(() => adaptiveLearningEnabled ? detectPatterns().slice(0, 3) : [], [adaptiveLearningEnabled])
  const learningProgress = useMemo(() => adaptiveLearningEnabled ? getLearningProgress() : { patternsLearned: 0, preferencesDetected: 0, personalizationScore: 0 }, [adaptiveLearningEnabled])
  const smartSuggestions = useMemo(() => (adaptiveLearningEnabled && smartSuggestionsEnabled) ? getSmartSuggestions().slice(0, 3) : [], [adaptiveLearningEnabled, smartSuggestionsEnabled])

  const latestTasks = tasks.slice(0, 3)
  const upcomingEvents = [...calendarEvents]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const activeAutomations = automations.filter(a => a.enabled).length

  // Real activity log from userActions
  const activityLog = useMemo(() => {
    return userActions.slice(0, 5).map((a, i) => ({
      id: `act-${i}`,
      action: a.action === 'view_switch' ? `Switched to ${a.context.view || 'view'}`
        : a.action === 'chat_send' ? 'Sent a chat message'
        : a.action === 'voice_command' ? `Voice: ${a.context.command || 'command'}`
        : a.action === 'task_completed' ? `Completed task`
        : a.action === 'focus_session' ? 'Focus session completed'
        : `Performed ${a.action}`,
      time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: (a.action.includes('code') ? 'code' : a.action.includes('analysis') ? 'analysis' : a.action.includes('social') ? 'social' : a.action.includes('backup') || a.action.includes('system') ? 'system' : 'knowledge') as 'code' | 'analysis' | 'social' | 'system' | 'knowledge',
    }))
  }, [userActions])

  // Quick actions
  const handleQuickAction = (action: string) => {
    trackAction('quick_action', { action })
    switch (action) {
      case 'chat':
        setActiveView('chat')
        break
      case 'analyze':
        setActiveView('chat')
        break
      case 'generate':
        setActiveView('code')
        break
      case 'search':
        toggleCommandPalette()
        break
    }
  }

  // Add transaction
  const handleAddTransaction = () => {
    if (!newTxDesc.trim() || !newTxAmount) return
    const amount = parseFloat(newTxAmount)
    if (isNaN(amount)) return
    addTransaction({
      id: `tr-${Date.now()}`,
      desc: newTxDesc.trim(),
      amount: newTxType === 'debit' ? -Math.abs(amount) : Math.abs(amount),
      type: newTxType,
      date: new Date().toLocaleDateString(),
      category: newTxCategory,
    })
    setNewTxDesc('')
    setNewTxAmount('')
    setNewTxType('credit')
    setNewTxCategory('Income')
    setShowAddTransaction(false)
  }

  // Crypto holdings map
  const holdingsMap = useMemo(() => {
    const map: Record<string, number> = {}
    cryptoHoldings.forEach(h => { map[h.symbol] = h.amount })
    return map
  }, [authFetch, cryptoHoldings])

  // Social icon map
  const socialIconMap: Record<string, React.ElementType> = {
    twitter: Twitter,
    github: Github,
    linkedin: Linkedin,
  }

  // AI training progress (average of learning languages)
  const trainingProgress = useMemo(() => {
    if (llmTrainingStatus.length === 0) return 0
    return Math.round(llmTrainingStatus.reduce((acc, l) => acc + l.progress, 0) / llmTrainingStatus.length)
  }, [llmTrainingStatus])

  const activeLanguages = llmTrainingStatus.filter(l => l.status !== 'queued').length

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* AI Insights Card */}
        {adaptiveLearningEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            className="glass-card p-5 md:col-span-2 border-nova-gold/20"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-nova-gold" />
              AI Insights
            </h3>

            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-nova-gold/5 to-nova-purple/5 border border-nova-gold/10">
              <p className="text-sm text-foreground">{greeting}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-nova-gold" />
                  <span className="text-[10px] text-muted-foreground">Personalization</span>
                </div>
                <p className="text-2xl font-bold text-nova-gold">{learningProgress.personalizationScore}%</p>
                <p className="text-[10px] text-muted-foreground">How well I know you</p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-nova-purple" />
                  <span className="text-[10px] text-muted-foreground">Patterns</span>
                </div>
                <p className="text-2xl font-bold text-nova-purple">{learningProgress.patternsLearned}</p>
                <p className="text-[10px] text-muted-foreground">Detected patterns</p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/20 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground">Preferences</span>
                </div>
                <p className="text-2xl font-bold text-amber-400">{learningProgress.preferencesDetected}</p>
                <p className="text-[10px] text-muted-foreground">Learned preferences</p>
              </div>
            </div>

            {patterns.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Detected Patterns</p>
                {patterns.map(p => (
                  <div key={p.pattern} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/10">
                    <div className="w-2 h-2 rounded-full bg-nova-gold" />
                    <span className="text-xs text-foreground flex-1">{p.pattern}</span>
                    <span className="text-[10px] text-muted-foreground">{p.frequency}x</span>
                  </div>
                ))}
              </div>
            )}

            {smartSuggestionsEnabled && smartSuggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggestions</p>
                <div className="flex gap-2 flex-wrap">
                  {smartSuggestions.map(s => (
                    <span key={s.id} className="text-[10px] px-2 py-1 rounded-full bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                      {s.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Quick Setup - shown when user has no data */}
        {tasks.length === 0 && calendarEvents.length === 0 && bankingAccounts.length === 0 && socialAccounts.length === 0 && cryptoHoldings.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            className="glass-card p-5 md:col-span-2 border-nova-gold/20"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-nova-gold" />
              Quick Setup
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Welcome to NOVA! Get started by setting up your workspace.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView('chat')}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-nova-gold/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-nova-gold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Start a Chat</p>
                  <p className="text-[10px] text-muted-foreground">Talk to NOVA AI</p>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView('settings')}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-nova-gold/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-nova-gold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Connect Accounts</p>
                  <p className="text-[10px] text-muted-foreground">Link your services</p>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleCommandPalette()}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-nova-gold/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-nova-gold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Explore Features</p>
                  <p className="text-[10px] text-muted-foreground">Discover NOVA capabilities</p>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveView('settings')}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-nova-gold/10 flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-4 h-4 text-nova-gold" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Add Finance Data</p>
                  <p className="text-[10px] text-muted-foreground">Banking, crypto & trading</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* System Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5 md:col-span-2"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-nova-gold" />
            System Overview
          </h3>
          <div className="flex items-center justify-around">
            <CircularProgress value={systemStats.cpu} label="CPU" icon={Cpu} color="#d4a574" />
            <CircularProgress value={systemStats.ram} label="RAM" icon={MemoryStick} color="#7c3aed" />
            <CircularProgress value={systemStats.storage} label="Storage" icon={HardDrive} color="#e8c99b" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="flex justify-between"><span>Platform</span><span className="text-foreground">{systemStats.platform}</span></div>
            <div className="flex justify-between"><span>CPU Cores</span><span className="text-foreground">{systemStats.cpuCores}</span></div>
            <div className="flex justify-between"><span>RAM</span><span className="text-foreground">{systemStats.totalMemory} GB</span></div>
            <div className="flex justify-between"><span>Uptime</span><span className="text-foreground">{systemStats.uptime}</span></div>
          </div>
        </motion.div>

        {/* Quick Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-nova-gold" />
            Quick Tasks
          </h3>
          <div className="space-y-2.5">
            {latestTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  task.status === 'done' ? 'bg-emerald-500' :
                  task.status === 'in-progress' ? 'bg-nova-gold' : 'bg-muted-foreground/50'
                }`} />
                <span className={`text-xs text-foreground truncate flex-1 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  task.priority === 'high' ? 'bg-red-400/10 text-red-400' :
                  task.priority === 'medium' ? 'bg-nova-gold/10 text-nova-gold' : 'bg-blue-400/10 text-blue-400'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
            {latestTasks.length === 0 && (
              <p className="text-xs text-muted-foreground">No tasks yet</p>
            )}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-nova-gold" />
            Upcoming Events
          </h3>
          <div className="space-y-2.5">
            {upcomingEvents.map(event => (
              <div key={event.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  event.type === 'meeting' ? 'bg-nova-purple' :
                  event.type === 'reminder' ? 'bg-nova-gold' :
                  event.type === 'task' ? 'bg-emerald-500' : 'bg-blue-400'
                }`} />
                <span className="text-xs text-foreground truncate flex-1">{event.title}</span>
                <span className="text-[10px] text-muted-foreground">{event.time}</span>
              </div>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">No events</p>
            )}
          </div>
        </motion.div>

        {/* Crypto Portfolio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5 md:col-span-2"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bitcoin className="w-4 h-4 text-nova-gold" />
            Crypto Portfolio
            {cryptoOffline && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 ml-2">Offline</span>}
          </h3>
          {cryptoHoldings.length > 0 ? (
            <>
              <div className="space-y-3">
                {cryptoData.map(c => (
                  <div key={c.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-secondary/50 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-nova-gold">{c.symbol[0]}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{c.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{holdingsMap[c.symbol] || 0} {c.symbol}</p>
                      </div>
                    </div>
                    {c.sparkline && c.sparkline.length > 0 && (
                      <MiniSparkline data={c.sparkline} color={c.change24h >= 0 ? '#10b981' : '#ef4444'} positive={c.change24h >= 0} />
                    )}
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">${c.price.toLocaleString()}</p>
                      <p className={`text-[10px] flex items-center justify-end gap-0.5 ${c.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {c.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(c.change24h).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
                {cryptoData.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Loading crypto data...</p>
                )}
              </div>
              {cryptoLastUpdated && (
                <p className="text-[10px] text-muted-foreground mt-3">
                  Last updated: {new Date(cryptoLastUpdated).toLocaleTimeString()}
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-10 h-10 rounded-full bg-nova-gold/10 flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-nova-gold/60" />
              </div>
              <p className="text-xs text-muted-foreground text-center">Add crypto holdings in Settings<br />to track your portfolio.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveView('settings')}
                className="text-xs px-3 py-1.5 rounded-lg gold-gradient-bg text-background font-medium"
              >
                Add Holdings
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Focus Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4 text-nova-gold" />
            Focus Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Sessions</span>
              <span className="text-sm font-bold text-nova-gold">{focusSessionsCompleted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Focus</span>
              <span className="text-sm font-bold text-foreground">{focusTotalMinutes}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Avg Session</span>
              <span className="text-sm font-bold text-foreground">
                {focusSessionsCompleted > 0 ? Math.round(focusTotalMinutes / focusSessionsCompleted) : 0}m
              </span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent my-1" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-nova-gold nova-pulse" />
              <span className="text-[10px] text-nova-gold">Stay focused!</span>
            </div>
          </div>
        </motion.div>

        {/* Active Automations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ZapIcon className="w-4 h-4 text-nova-gold" />
            Automations
          </h3>
          <div className="space-y-2.5">
            {automations.slice(0, 3).map(auto => (
              <div key={auto.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${auto.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                <span className="text-xs text-foreground truncate flex-1">{auto.name}</span>
                <span className={`text-[10px] ${auto.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {auto.enabled ? 'Active' : 'Off'}
                </span>
              </div>
            ))}
            {automations.length === 0 && <p className="text-xs text-muted-foreground">No automations</p>}
            <div className="h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent my-1" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Active</span>
              <span className="text-sm font-bold text-emerald-500">{activeAutomations}/{automations.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Trading Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-nova-gold" />
            Trading
          </h3>
          {tradingData.activeTrades > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Active Trades</span>
                <span className="text-sm font-bold text-foreground">{tradingData.activeTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Today P&amp;L</span>
                <span className={`text-sm font-bold ${tradingData.dailyPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tradingData.dailyPnL >= 0 ? '+' : ''}${tradingData.dailyPnL.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Win Rate</span>
                <span className="text-sm font-bold text-foreground">{tradingData.winRate}%</span>
              </div>
              {tradingData.positions.length > 0 && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent my-2" />
                  {tradingData.positions.slice(0, 2).map(pos => (
                    <div key={pos.symbol} className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">{pos.symbol}</span>
                      <span className={`text-[10px] font-medium ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-nova-gold/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-nova-gold/60" />
              </div>
              <p className="text-xs text-muted-foreground text-center">No active trades.<br />Start trading to see your positions.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveView('settings')}
                className="text-xs px-3 py-1.5 rounded-lg gold-gradient-bg text-background font-medium"
              >
                Get Started
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Social Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Twitter className="w-4 h-4 text-nova-gold" />
            Social
          </h3>
          {socialAccounts.length > 0 ? (
            <div className="space-y-2.5">
              {socialAccounts.map(a => {
                const AIcon = socialIconMap[a.platform] || Twitter
                return (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-foreground">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {a.connected ? (
                        <>
                          <span className="text-[10px] text-muted-foreground">{a.handle}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleSocialConnection(a.id)}
                          className="text-[10px] text-nova-gold hover:underline"
                        >
                          Connect
                        </motion.button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-nova-gold/10 flex items-center justify-center">
                <Twitter className="w-5 h-5 text-nova-gold/60" />
              </div>
              <p className="text-xs text-muted-foreground text-center">No social accounts connected.<br />Connect your accounts in Settings.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveView('settings')}
                className="text-xs px-3 py-1.5 rounded-lg gold-gradient-bg text-background font-medium"
              >
                Connect Accounts
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Banking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-nova-gold" />
            Banking
            {bankingAccounts.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAddTransaction(true)}
                className="ml-auto p-1 rounded-lg text-nova-gold hover:bg-nova-gold/10"
              >
                <Plus className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </h3>
          {bankingAccounts.length > 0 ? (
            <div className="space-y-2">
              {bankingAccounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{acc.name}</span>
                  <span className="text-sm font-bold text-foreground">${acc.balance.toLocaleString()}</span>
                </div>
              ))}
              <div className="h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent my-2" />
              {transactions.slice(0, 2).map(t => (
                <div key={t.id} className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">{t.desc}</span>
                  <span className={`text-[10px] font-medium ${t.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {t.type === 'credit' ? '+' : ''}${Math.abs(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-nova-gold/10 flex items-center justify-center">
                <Landmark className="w-5 h-5 text-nova-gold/60" />
              </div>
              <p className="text-xs text-muted-foreground text-center">No bank accounts added yet.<br />Add your accounts to track your finances.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveView('settings')}
                className="text-xs px-3 py-1.5 rounded-lg gold-gradient-bg text-background font-medium"
              >
                Add Account
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* AI Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-nova-gold" />
            AI Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Features</span>
              <span className="text-xs text-foreground">
                {featureFlags.filter(f => f.enabled).length}/{featureFlags.length} enabled
              </span>
            </div>
            {featureFlags.length > 0 && (
              <div className="w-full h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                <div
                  className="h-full rounded-full progress-gold"
                  style={{ width: `${featureFlags.length > 0 ? (featureFlags.filter(f => f.enabled).length / featureFlags.length) * 100 : 0}%` }}
                />
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Languages</span>
              <span className="text-xs text-foreground">{activeLanguages} active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Knowledge</span>
              <span className="text-xs text-foreground">{knowledgeEntries.length} entries</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Training</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full rounded-full progress-gold" style={{ width: `${trainingProgress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{trainingProgress}%</span>
              </div>
            </div>
            {llmTrainingStatus.length > 0 && (
              <div className="mt-1 space-y-1">
                {llmTrainingStatus.slice(0, 3).map(l => (
                  <div key={l.language} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      l.status === 'complete' ? 'bg-emerald-500' :
                      l.status === 'learning' ? 'bg-nova-gold nova-pulse' : 'bg-muted-foreground/30'
                    }`} />
                    <span className="text-[10px] text-muted-foreground flex-1">{l.language}</span>
                    <span className="text-[10px] text-muted-foreground">{l.progress}%</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-2 h-2 rounded-full ${featureFlags.length > 0 ? 'bg-emerald-500 nova-pulse' : 'bg-nova-gold nova-pulse'}`} />
              <span className="text-[10px] text-emerald-500">
                {featureFlags.length > 0 ? `${featureFlags.filter(f => f.enabled).length} feature${featureFlags.filter(f => f.enabled).length !== 1 ? 's' : ''} active` : 'Ready to configure'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-nova-gold" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Chat', emoji: '💬', action: 'chat' },
              { label: 'Analyze', emoji: '📊', action: 'analyze' },
              { label: 'Generate', emoji: '⚡', action: 'generate' },
              { label: 'Search', emoji: '🔍', action: 'search' },
            ].map(action => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleQuickAction(action.action)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm">{action.emoji}</span>
                {action.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.01, y: -2 }}
          className="glass-card p-5 md:col-span-2"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-nova-gold" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {activityLog.length > 0 ? activityLog.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-nova-gold mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{item.action}</p>
                  <p className="text-[10px] text-muted-foreground">{item.time}</p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center py-4">Start using NOVA to see your activity here</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add Transaction Dialog */}
      {showAddTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAddTransaction(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BankIcon className="w-5 h-5 text-nova-gold" />
                Add Transaction
              </h3>
              <button onClick={() => setShowAddTransaction(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input type="text" value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} placeholder="Transaction description..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <input type="number" value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} placeholder="0.00" className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select value={newTxType} onChange={(e) => setNewTxType(e.target.value as 'credit' | 'debit')} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={newTxCategory} onChange={(e) => setNewTxCategory(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    <option>Income</option>
                    <option>Cloud</option>
                    <option>Transfer</option>
                    <option>Subscription</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddTransaction(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAddTransaction} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Add Transaction</motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
