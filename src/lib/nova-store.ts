import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type NovaView = 'chat' | 'voice' | 'tasks' | 'calendar' | 'notes' | 'files' | 'plugins' | 'dashboard' | 'knowledge' | 'automation' | 'focus' | 'vault' | 'code' | 'calculator' | 'websearch' | 'imagegen' | 'videogen' | 'promptenhancer' | 'templates' | 'aiproviders' | 'integrations' | 'settings' | 'admin'
export type Personality = 'nova' | 'athena' | 'aria' | 'zeus'

export interface ReasoningStep {
  step: number
  type: 'parse' | 'analyze' | 'retrieve' | 'reason' | 'synthesize' | 'verify'
  description: string
  detail: string
  duration: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string
  timestamp: Date
  personality?: string
  reasoningSteps?: ReasoningStep[]
  confidence?: number
  suggestedActions?: string[]
  queryType?: string
}

export interface Plugin {
  id: string
  name: string
  description: string
  icon: string
  category: 'productivity' | 'finance' | 'social' | 'development' | 'system'
  installed: boolean
  version: string
  author: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  userId?: string  // null/undefined = global knowledge, set = user-specific
  createdAt: Date
  updatedAt: Date
  active?: boolean
}

export interface UpdateItem {
  id: string
  component: string
  description: string
  riskLevel: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'rejected'
  diff?: string
  createdAt: Date
}

export interface LlmTrainingStatus {
  language: string
  progress: number
  status: 'complete' | 'learning' | 'queued'
  wordCount?: number
}

export interface TrainedVocabulary {
  language: string
  words: string[]
  lastTrainedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  createdAt: Date
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  type: 'meeting' | 'reminder' | 'task' | 'event'
  description?: string
}

export interface Note {
  id: string
  title: string
  content: string
  category: string
  createdAt: Date
  updatedAt: Date
}

export interface PasswordEntry {
  id: string
  name: string
  username: string
  password: string
  url?: string
  category: string
  createdAt: Date
}

export interface Automation {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
  lastRun?: Date
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  createdAt: Date
}

export interface Conversation {
  id: string
  title: string
  personality: Personality
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

export interface BankingAccount {
  id: string
  name: string
  balance: number
  type: string
}

export interface Transaction {
  id: string
  desc: string
  amount: number
  type: 'credit' | 'debit'
  date: string
  category: string
}

export interface SocialAccount {
  id: string
  name: string
  handle: string
  connected: boolean
  platform: string
}

export type IntegrationType = 'github' | 'twitter' | 'binance' | 'banking' | 'slack' | 'openclaw'

export interface Integration {
  id: string
  name: string
  type: IntegrationType
  connected: boolean
  description: string
  credentials: Record<string, string>
}

export interface Device {
  id: string
  name: string
  lastSync: string
  status: 'active' | 'inactive'
  isCurrentDevice: boolean
}

export const DEFAULT_INTEGRATIONS: Integration[] = [
  { id: 'int-openclaw', name: 'OpenClaw', type: 'openclaw', connected: false, description: 'Productivity suite integration', credentials: {} },
  { id: 'int-twitter', name: 'Twitter/X', type: 'twitter', connected: false, description: 'Social media management', credentials: {} },
  { id: 'int-binance', name: 'Binance', type: 'binance', connected: false, description: 'Crypto exchange trading', credentials: {} },
  { id: 'int-banking', name: 'Banking', type: 'banking', connected: false, description: 'Banking & finance', credentials: {} },
  { id: 'int-github', name: 'GitHub', type: 'github', connected: false, description: 'Code repository access', credentials: {} },
  { id: 'int-slack', name: 'Slack', type: 'slack', connected: false, description: 'Team communication', credentials: {} },
]

export interface TradingData {
  activeTrades: number
  dailyPnL: number
  winRate: number
  positions: Array<{ symbol: string; amount: number; pnl: number }>
}

export interface StoredFile {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'code' | 'audio' | 'video' | 'archive' | 'file'
  size: number
  path: string
  parentId: string | null
  encrypted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BackupRecord {
  id: string
  date: string
  size: string
  encrypted: boolean
  type: 'manual' | 'scheduled'
}

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  category: string
  enabled: boolean
  configurable: boolean
  requiresRestart: boolean
  sortOrder: number
}

export const DEFAULT_PLUGINS: Plugin[] = [
  { id: 'openclaw', name: 'OpenClaw Integration', description: 'Seamless integration with OpenClaw services for enhanced productivity and workflow automation.', icon: 'Claw', category: 'productivity', installed: true, version: '2.1.0', author: 'NOVA Team' },
  { id: 'crypto-tracker', name: 'Crypto Tracker', description: 'Real-time cryptocurrency portfolio tracking with price alerts and market analysis.', icon: 'TrendingUp', category: 'finance', installed: false, version: '1.4.2', author: 'Finance Labs' },
  { id: 'social-manager', name: 'Social Media Manager', description: 'Manage and schedule posts across multiple social media platforms from one dashboard.', icon: 'Share2', category: 'social', installed: false, version: '3.0.1', author: 'SocialStack' },
  { id: 'code-gen', name: 'Code Generator', description: 'AI-powered code generation with support for 20+ programming languages and frameworks.', icon: 'Code', category: 'development', installed: true, version: '4.2.0', author: 'DevTools Inc' },
  { id: 'sys-monitor', name: 'System Monitor', description: 'Real-time system resource monitoring with alerts for CPU, memory, and disk usage.', icon: 'Activity', category: 'system', installed: false, version: '1.1.3', author: 'NOVA Team' },
  { id: 'banking-portal', name: 'Banking Portal', description: 'Secure banking integration for account management, transfers, and transaction history.', icon: 'Landmark', category: 'finance', installed: false, version: '2.0.0', author: 'FinSecure' },
  { id: 'trading-bot', name: 'Trading Bot', description: 'Automated trading strategies with backtesting, risk management, and real-time execution.', icon: 'BarChart3', category: 'finance', installed: false, version: '1.8.5', author: 'TradeFlow' },
  { id: 'db-manager', name: 'Database Manager', description: 'Visual database management with query builder, schema designer, and migration tools.', icon: 'Database', category: 'development', installed: false, version: '3.1.0', author: 'DataCraft' },
]

export const PERSONALITIES: Record<Personality, { name: string; description: string; emoji: string; color: string }> = {
  nova: { name: 'Nova', description: 'Professional & precise', emoji: '✦', color: '#d4a574' },
  athena: { name: 'Athena', description: 'Wise & analytical', emoji: '🦉', color: '#7c3aed' },
  aria: { name: 'Aria', description: 'Creative & expressive', emoji: '🎵', color: '#ec4899' },
  zeus: { name: 'Zeus', description: 'Assertive & decisive', emoji: '⚡', color: '#f59e0b' },
}

interface NovaStore {
  activeView: NovaView
  setActiveView: (view: NovaView) => void
  personality: Personality
  setPersonality: (p: Personality) => void
  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void
  isThinking: boolean
  setIsThinking: (v: boolean) => void
  isListening: boolean
  setIsListening: (v: boolean) => void
  darkMode: boolean
  setDarkMode: (v: boolean) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  customCSS: string
  setCustomCSS: (css: string) => void
  plugins: Plugin[]
  installedPlugins: string[]
  togglePlugin: (id: string) => void
  addPlugin: (plugin: Plugin) => void
  knowledgeEntries: KnowledgeEntry[]
  addKnowledge: (entry: KnowledgeEntry) => void
  removeKnowledge: (id: string) => void
  updateQueue: UpdateItem[]
  addUpdate: (item: UpdateItem) => void
  approveUpdate: (id: string) => void
  rejectUpdate: (id: string) => void
  llmTrainingStatus: LlmTrainingStatus[]
  setLlmTrainingStatus: (s: LlmTrainingStatus[]) => void
  trainedVocabulary: TrainedVocabulary[]
  setTrainedVocabulary: (v: TrainedVocabulary[]) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  showSearch: boolean
  setShowSearch: (v: boolean) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (v: boolean) => void
  // Tasks
  tasks: Task[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  // Calendar
  calendarEvents: CalendarEvent[]
  addEvent: (event: CalendarEvent) => void
  deleteEvent: (id: string) => void
  // Notes
  notes: Note[]
  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  // Passwords
  passwords: PasswordEntry[]
  addPassword: (entry: PasswordEntry) => void
  updatePassword: (id: string, updates: Partial<PasswordEntry>) => void
  deletePassword: (id: string) => void
  visiblePasswordIds: string[]
  togglePasswordVisibility: (id: string) => void
  // Automations
  automations: Automation[]
  addAutomation: (automation: Automation) => void
  toggleAutomation: (id: string) => void
  deleteAutomation: (id: string) => void
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  clearNotifications: () => void
  // Conversations
  conversations: Conversation[]
  addConversation: (conversation: Conversation) => void
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string | null) => void
  activeConversation: string | null
  // Command palette
  showCommandPalette: boolean
  toggleCommandPalette: () => void
  // Onboarding
  showOnboarding: boolean
  setShowOnboarding: (v: boolean) => void
  // Notifications panel
  showNotifications: boolean
  setShowNotifications: (v: boolean) => void
  // Focus timer
  focusTimerActive: boolean
  focusTimerMinutes: number
  focusTimerSeconds: number
  setFocusTimerActive: (v: boolean) => void
  setFocusTimerTime: (minutes: number, seconds: number) => void
  focusSessionsCompleted: number
  incrementFocusSessions: () => void
  focusTotalMinutes: number
  incrementFocusStats: (minutes: number) => void
  // Auto-learn
  autoLearnFromChat: boolean
  setAutoLearnFromChat: (v: boolean) => void
  // Adaptive learning
  userActions: Array<{ action: string; timestamp: Date; context: Record<string, unknown> }>
  trackAction: (action: string, context?: Record<string, unknown>) => void
  workflowPatterns: Array<{ id: string; pattern: string; frequency: number; lastOccurrence: Date; category: string; suggestedAction: string }>
  setWorkflowPatterns: (patterns: Array<{ id: string; pattern: string; frequency: number; lastOccurrence: Date; category: string; suggestedAction: string }>) => void
  detectedPreferences: Array<{ id: string; key: string; value: string; learned: boolean; confidence: number }>
  setDetectedPreferences: (prefs: Array<{ id: string; key: string; value: string; learned: boolean; confidence: number }>) => void
  // TTS
  ttsEnabled: boolean
  setTtsEnabled: (v: boolean) => void
  ttsRate: number
  setTtsRate: (v: number) => void
  ttsVoice: string
  setTtsVoice: (v: string) => void
  // Reasoning
  reasoningDepth: 'quick' | 'balanced' | 'deep'
  setReasoningDepth: (v: 'quick' | 'balanced' | 'deep') => void
  showConfidence: boolean
  setShowConfidence: (v: boolean) => void
  // Smart features
  adaptiveLearningEnabled: boolean
  setAdaptiveLearningEnabled: (v: boolean) => void
  smartSuggestionsEnabled: boolean
  setSmartSuggestionsEnabled: (v: boolean) => void
  // Banking
  bankingAccounts: BankingAccount[]
  transactions: Transaction[]
  addTransaction: (t: Transaction) => void
  // Social
  socialAccounts: SocialAccount[]
  toggleSocialConnection: (id: string) => void
  // Trading
  tradingData: TradingData
  setTradingData: (data: TradingData) => void
  // Settings persistence
  dataProcessing: boolean
  setDataProcessing: (v: boolean) => void
  encryption: boolean
  setEncryption: (v: boolean) => void
  debugMode: boolean
  setDebugMode: (v: boolean) => void
  experimentalFeatures: boolean
  setExperimentalFeatures: (v: boolean) => void
  syncEnabled: boolean
  setSyncEnabled: (v: boolean) => void
  selectedTheme: string
  setSelectedTheme: (v: string) => void
  // Crypto holdings
  cryptoHoldings: Array<{ symbol: string; amount: number }>
  setCryptoHoldings: (holdings: Array<{ symbol: string; amount: number }>) => void
  // Vault
  vaultLocked: boolean
  setVaultLocked: (v: boolean) => void
  masterPasswordHash: string | null
  setMasterPasswordHash: (hash: string) => void
  // Backup records
  backupRecords: BackupRecord[]
  addBackupRecord: (record: BackupRecord) => void
  // Update history
  updateHistory: Array<{ id: string; component: string; version: string; status: 'approved' | 'rejected'; date: string }>
  addUpdateHistory: (entry: { id: string; component: string; version: string; status: 'approved' | 'rejected'; date: string }) => void
  // Feature flags
  featureFlags: FeatureFlag[]
  setFeatureFlags: (flags: FeatureFlag[]) => void
  toggleFeatureFlag: (id: string) => void
  isFeatureEnabled: (key: string) => boolean
  // Integrations
  integrations: Integration[]
  addIntegration: (integration: Integration) => void
  updateIntegration: (id: string, updates: Partial<Integration>) => void
  removeIntegration: (id: string) => void
  // Devices
  devices: Device[]
  addDevice: (device: Device) => void
  removeDevice: (id: string) => void
  // Admin
  adminAuthenticated: boolean
  setAdminAuthenticated: (v: boolean) => void
  // Delete all data
  deleteAllData: () => void
}

export const useNovaStore = create<NovaStore>()(
  persist(
    (set) => ({
      activeView: 'chat',
      setActiveView: (view) => set({ activeView: view }),
      personality: 'nova',
      setPersonality: (p) => set({ personality: p }),
      messages: [],
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      clearMessages: () => set({ messages: [] }),
      isThinking: false,
      setIsThinking: (v) => set({ isThinking: v }),
      isListening: false,
      setIsListening: (v) => set({ isListening: v }),
      darkMode: true,
      setDarkMode: (v) => set({ darkMode: v }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      customCSS: '',
      setCustomCSS: (css) => set({ customCSS: css }),
      plugins: DEFAULT_PLUGINS,
      installedPlugins: DEFAULT_PLUGINS.filter(p => p.installed).map(p => p.id),
      togglePlugin: (id) => set((state) => {
        const plugins = state.plugins.map(p =>
          p.id === id ? { ...p, installed: !p.installed } : p
        )
        const installedPlugins = plugins.filter(p => p.installed).map(p => p.id)
        return { plugins, installedPlugins }
      }),
      addPlugin: (plugin) => set((state) => ({
        plugins: [...state.plugins, plugin],
        installedPlugins: plugin.installed ? [...state.installedPlugins, plugin.id] : state.installedPlugins,
      })),
      knowledgeEntries: [],
      addKnowledge: (entry) => set((state) => ({ knowledgeEntries: [...state.knowledgeEntries, entry] })),
      removeKnowledge: (id) => set((state) => ({ knowledgeEntries: state.knowledgeEntries.filter(e => e.id !== id) })),
      updateQueue: [],
      addUpdate: (item) => set((state) => ({ updateQueue: [...state.updateQueue, item] })),
      approveUpdate: (id) => set((state) => ({
        updateQueue: state.updateQueue.map(u => u.id === id ? { ...u, status: 'approved' as const } : u)
      })),
      rejectUpdate: (id) => set((state) => ({
        updateQueue: state.updateQueue.map(u => u.id === id ? { ...u, status: 'rejected' as const } : u)
      })),
      llmTrainingStatus: [],
      setLlmTrainingStatus: (s) => set({ llmTrainingStatus: s }),
      trainedVocabulary: [],
      setTrainedVocabulary: (v) => set({ trainedVocabulary: v }),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),
      showSearch: false,
      setShowSearch: (v) => set({ showSearch: v }),
      mobileSidebarOpen: false,
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
      // Tasks - empty by default, user creates their own
      tasks: [],
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
      // Calendar - empty by default
      calendarEvents: [],
      addEvent: (event) => set((state) => ({ calendarEvents: [...state.calendarEvents, event] })),
      deleteEvent: (id) => set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e.id !== id) })),
      // Notes - empty by default
      notes: [],
      addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
      })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter(n => n.id !== id) })),
      // Passwords - empty by default (vault starts locked)
      passwords: [],
      addPassword: (entry) => set((state) => ({ passwords: [...state.passwords, entry] })),
      updatePassword: (id, updates) => set((state) => ({
        passwords: state.passwords.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      deletePassword: (id) => set((state) => ({ passwords: state.passwords.filter(p => p.id !== id) })),
      visiblePasswordIds: [],
      togglePasswordVisibility: (id) => set((state) => ({
        visiblePasswordIds: state.visiblePasswordIds.includes(id)
          ? state.visiblePasswordIds.filter(i => i !== id)
          : [...state.visiblePasswordIds, id]
      })),
      // Automations - empty by default
      automations: [],
      addAutomation: (automation) => set((state) => ({ automations: [...state.automations, automation] })),
      toggleAutomation: (id) => set((state) => ({
        automations: state.automations.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)
      })),
      deleteAutomation: (id) => set((state) => ({ automations: state.automations.filter(a => a.id !== id) })),
      // Notifications - empty by default, generated from real events
      notifications: [],
      addNotification: (notification) => set((state) => ({ notifications: [notification, ...state.notifications] })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
      clearNotifications: () => set({ notifications: [] }),
      // Conversations - empty by default
      conversations: [],
      addConversation: (conversation) => set((state) => ({ conversations: [...state.conversations, conversation] })),
      deleteConversation: (id) => set((state) => ({ conversations: state.conversations.filter(c => c.id !== id) })),
      setActiveConversation: (id) => set({ activeConversation: id }),
      activeConversation: null,
      showCommandPalette: false,
      toggleCommandPalette: () => set((state) => ({ showCommandPalette: !state.showCommandPalette })),
      showOnboarding: true,
      setShowOnboarding: (v) => set({ showOnboarding: v }),
      showNotifications: false,
      setShowNotifications: (v) => set({ showNotifications: v }),
      focusTimerActive: false,
      focusTimerMinutes: 25,
      focusTimerSeconds: 0,
      setFocusTimerActive: (v) => set({ focusTimerActive: v }),
      setFocusTimerTime: (minutes, seconds) => set({ focusTimerMinutes: minutes, focusTimerSeconds: seconds }),
      focusSessionsCompleted: 0,
      incrementFocusSessions: () => set((state) => ({ focusSessionsCompleted: state.focusSessionsCompleted + 1 })),
      focusTotalMinutes: 0,
      incrementFocusStats: (minutes) => set((state) => ({ focusTotalMinutes: state.focusTotalMinutes + minutes, focusSessionsCompleted: state.focusSessionsCompleted + 1 })),
      autoLearnFromChat: false,
      setAutoLearnFromChat: (v) => set({ autoLearnFromChat: v }),
      // Adaptive learning
      userActions: [],
      trackAction: (action, context = {}) => set((state) => ({
        userActions: [...state.userActions.slice(-499), { action, timestamp: new Date(), context }]
      })),
      workflowPatterns: [],
      setWorkflowPatterns: (patterns) => set({ workflowPatterns: patterns }),
      detectedPreferences: [],
      setDetectedPreferences: (prefs) => set({ detectedPreferences: prefs }),
      // TTS
      ttsEnabled: false,
      setTtsEnabled: (v) => set({ ttsEnabled: v }),
      ttsRate: 1.0,
      setTtsRate: (v) => set({ ttsRate: v }),
      ttsVoice: '',
      setTtsVoice: (v) => set({ ttsVoice: v }),
      // Reasoning
      reasoningDepth: 'balanced',
      setReasoningDepth: (v) => set({ reasoningDepth: v }),
      showConfidence: true,
      setShowConfidence: (v) => set({ showConfidence: v }),
      // Smart features
      adaptiveLearningEnabled: true,
      setAdaptiveLearningEnabled: (v) => set({ adaptiveLearningEnabled: v }),
      smartSuggestionsEnabled: true,
      setSmartSuggestionsEnabled: (v) => set({ smartSuggestionsEnabled: v }),
      // Banking
      bankingAccounts: [],
      transactions: [],
      addTransaction: (t) => set((state) => ({ transactions: [t, ...state.transactions] })),
      // Social
      socialAccounts: [],
      toggleSocialConnection: (id) => set((state) => ({
        socialAccounts: state.socialAccounts.map(s =>
          s.id === id ? { ...s, connected: !s.connected, handle: !s.connected ? '@user' : '' } : s
        )
      })),
      // Trading
      tradingData: { activeTrades: 0, dailyPnL: 0, winRate: 0, positions: [] },
      setTradingData: (data) => set({ tradingData: data }),
      // Settings persistence
      dataProcessing: true,
      setDataProcessing: (v) => set({ dataProcessing: v }),
      encryption: true,
      setEncryption: (v) => set({ encryption: v }),
      debugMode: false,
      setDebugMode: (v) => set({ debugMode: v }),
      experimentalFeatures: false,
      setExperimentalFeatures: (v) => set({ experimentalFeatures: v }),
      syncEnabled: false,
      setSyncEnabled: (v) => set({ syncEnabled: v }),
      selectedTheme: 'midnight-gold',
      setSelectedTheme: (v) => set({ selectedTheme: v }),
      // Crypto holdings
      cryptoHoldings: [],
      setCryptoHoldings: (holdings) => set({ cryptoHoldings: holdings }),
      // Vault
      vaultLocked: true,
      setVaultLocked: (v) => set({ vaultLocked: v }),
      masterPasswordHash: null,
      setMasterPasswordHash: (hash) => set({ masterPasswordHash: hash }),
      // Backup records
      backupRecords: [],
      addBackupRecord: (record) => set((state) => ({ backupRecords: [record, ...state.backupRecords] })),
      // Update history
      updateHistory: [],
      addUpdateHistory: (entry) => set((state) => ({ updateHistory: [entry, ...state.updateHistory] })),
      // Feature flags
      featureFlags: [],
      setFeatureFlags: (flags) => set({ featureFlags: flags }),
      toggleFeatureFlag: (id) => set((state) => ({
        featureFlags: state.featureFlags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f)
      })),
      isFeatureEnabled: (key) => {
        const state = useNovaStore.getState()
        const flag = state.featureFlags.find(f => f.key === key)
        return flag ? flag.enabled : true // default to enabled if not found
      },
      // Integrations
      integrations: DEFAULT_INTEGRATIONS,
      addIntegration: (integration) => set((state) => ({ integrations: [...state.integrations, integration] })),
      updateIntegration: (id, updates) => set((state) => ({
        integrations: state.integrations.map(i => i.id === id ? { ...i, ...updates } : i)
      })),
      removeIntegration: (id) => set((state) => ({ integrations: state.integrations.filter(i => i.id !== id) })),
      // Devices
      devices: [],
      addDevice: (device) => set((state) => ({ devices: [...state.devices, device] })),
      removeDevice: (id) => set((state) => ({ devices: state.devices.filter(d => d.id !== id) })),
      // Admin
      adminAuthenticated: false,
      setAdminAuthenticated: (v) => set({ adminAuthenticated: v }),
      // Delete all data
      deleteAllData: () => {
        localStorage.removeItem('nova-store')
        localStorage.removeItem('nova-actions')
        window.location.reload()
      },
    }),
    {
      name: 'nova-store',
      storage: createJSONStorage(() => {
        // Custom storage engine with size limits to prevent localStorage bloat
        return {
          getItem: (name: string) => {
            const data = localStorage.getItem(name)
            if (data && data.length > 2 * 1024 * 1024) { // 2MB limit
              console.warn('Nova store exceeding 2MB, trimming old data')
              try {
                const parsed = JSON.parse(data)
                // Remove large data arrays to shrink the store
                if (parsed?.state) {
                  delete parsed.state.messages
                  delete parsed.state.userActions
                  delete parsed.state.notifications
                  delete parsed.state.knowledgeEntries
                  delete parsed.state.llmTrainingStatus
                  delete parsed.state.trainedVocabulary
                  delete parsed.state.updateQueue
                  delete parsed.state.updateHistory
                  delete parsed.state.backupRecords
                  delete parsed.state.featureFlags
                  delete parsed.state.integrations
                  delete parsed.state.devices
                  const trimmed = JSON.stringify(parsed)
                  localStorage.setItem(name, trimmed)
                  return trimmed
                }
              } catch {
                // If parsing fails, clear the store
                localStorage.removeItem(name)
                return null
              }
            }
            return data
          },
          setItem: (name: string, value: string) => {
            try {
              localStorage.setItem(name, value)
            } catch (e) {
              // Storage full — clear old data and retry
              console.warn('localStorage full, clearing old data')
              localStorage.removeItem(name)
              try {
                localStorage.setItem(name, value)
              } catch {
                // Still can't write, give up silently
                console.error('Failed to write to localStorage even after clearing')
              }
            }
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name)
          },
        }
      }),
      partialize: (state) => ({
        // Only persist essential settings/preferences — NOT large data arrays
        // Large arrays (messages, tasks, notes, etc.) should come from the DB via sync
        activeView: state.activeView,
        personality: state.personality,
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        customCSS: state.customCSS,
        installedPlugins: state.installedPlugins,
        adaptiveLearningEnabled: state.adaptiveLearningEnabled,
        smartSuggestionsEnabled: state.smartSuggestionsEnabled,
        ttsEnabled: state.ttsEnabled,
        ttsRate: state.ttsRate,
        ttsVoice: state.ttsVoice,
        reasoningDepth: state.reasoningDepth,
        showConfidence: state.showConfidence,
        autoLearnFromChat: state.autoLearnFromChat,
        focusSessionsCompleted: state.focusSessionsCompleted,
        focusTotalMinutes: state.focusTotalMinutes,
        dataProcessing: state.dataProcessing,
        encryption: state.encryption,
        debugMode: state.debugMode,
        experimentalFeatures: state.experimentalFeatures,
        syncEnabled: state.syncEnabled,
        selectedTheme: state.selectedTheme,
        vaultLocked: state.vaultLocked,
        masterPasswordHash: state.masterPasswordHash,
        adminAuthenticated: state.adminAuthenticated,
        // DON'T persist large arrays — they should come from the database via sync:
        // messages, userActions, tasks, notes, knowledge, calendarEvents,
        // passwords, automations, notifications, conversations, llmTrainingStatus,
        // trainedVocabulary, updateQueue, updateHistory, backupRecords,
        // featureFlags, integrations, devices, bankingAccounts, transactions,
        // socialAccounts, tradingData, cryptoHoldings, plugins, etc.
      }),
    }
  )
)
