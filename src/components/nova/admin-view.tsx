'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flag, Users, ScrollText, Database, Plug, Puzzle,
  Brain, Shield, HardDrive, Gauge, Search, Check, X, ChevronLeft,
  ChevronRight, RefreshCw, Download, Upload, Lock, Unlock, AlertTriangle,
  Activity, Cpu, MemoryStick, Server, Clock, Trash2, Plus, Minus,
  Eye, EyeOff, Settings, ToggleLeft, ToggleRight, CheckSquare,
  Square, Filter, Layers, Zap, RotateCcw, Save, Key, Fingerprint,
  ShieldCheck, ShieldAlert, FileWarning, Archive, Timer, Edit2, Crown,
  UserX, UserCheck, AlertCircle, Code, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { hashPassword } from '@/lib/encryption'
import { useAuth } from '@/lib/auth-context'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  category: string
  enabled: boolean
  configurable: boolean
  requiresRestart: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface AdminLog {
  id: string
  action: string
  details: string | null
  userId: string
  timestamp: string
}

interface SystemStats {
  cpu: number
  memory: { used: number; total: number; percentage: number }
  storage: { used: string; total: string; percentage: number }
  uptime: number
  platform: string
  nodeVersion: string
  cpuCores: number
}

interface DbStats {
  tables: { name: string; count: number }[]
  totalRecords: number
  dbSize: string
}

interface Integration {
  id: string
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string | null
  icon: string
  category: string
  config: Record<string, string>
}

interface AdminUser {
  id: string
  email: string
  username: string
  name: string | null
  avatar: string | null
  role: string
  tier: string
  isActive: boolean
  emailVerified: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  _count?: { sessions: number; apiKeys: number; usageRecords: number }
}

interface TierInfo {
  id: string
  tier: string
  maxChatsPerDay: number
  maxImageGenPerDay: number
  maxWebSearchPerDay: number
  maxCodeExecPerDay: number
  maxStorageMB: number
  maxPlugins: number
  maxKnowledgeBase: number
  canUseGlobalAPIs: boolean
  canCreatePlugins: boolean
  canAccessAdmin: boolean
  priority: number
}

interface GlobalApiKey {
  id: string
  provider: string
  apiKeyMasked: string
  apiSecretMasked: string | null
  baseUrl: string | null
  isActive: boolean
  minTier: string
  createdAt: string
  updatedAt: string
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'features', label: 'Feature Flags', icon: Flag },
  { id: 'ai-rules', label: 'AI Rules', icon: Brain },
  { id: 'ai-config', label: 'AI Config', icon: Sparkles },
  { id: 'files', label: 'Files', icon: Code },
  { id: 'users', label: 'Users & Access', icon: Users },
  { id: 'tiers', label: 'Tiers', icon: Crown },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'action-approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'logs', label: 'System Logs', icon: ScrollText },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'backup', label: 'Backup', icon: HardDrive },
  { id: 'performance', label: 'Performance', icon: Gauge },
] as const

type AdminTab = typeof ADMIN_TABS[number]['id']

// ─── Toggle Switch Component ─────────────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onToggle,
  disabled = false,
  size = 'default',
}: {
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
  size?: 'default' | 'small'
}) {
  const isSmall = size === 'small'
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`${isSmall ? 'w-9 h-5' : 'w-11 h-6'} rounded-full transition-colors ${
        enabled ? 'bg-nova-gold' : 'bg-secondary'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.div
        animate={{ x: enabled ? (isSmall ? 16 : 20) : 2 }}
        className={`${isSmall ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-white shadow-sm ${isSmall ? 'mt-0.5' : 'mt-0.5'}`}
      />
    </button>
  )
}

// ─── Toast Notification ──────────────────────────────────────────────────────

function Toast({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onClose])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium shadow-lg"
        >
          <Check className="w-4 h-4" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color = 'gold', subtitle,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color?: 'gold' | 'purple' | 'emerald' | 'red'
  subtitle?: string
}) {
  const colorMap = {
    gold: 'text-nova-gold',
    purple: 'text-nova-purple',
    emerald: 'text-emerald-500',
    red: 'text-red-500',
  }
  const bgColorMap = {
    gold: 'bg-nova-gold/10',
    purple: 'bg-nova-purple/10',
    emerald: 'bg-emerald-500/10',
    red: 'bg-red-500/10',
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${bgColorMap[color]} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colorMap[color]}`} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminView() {
  const { authFetch, isAdmin, user } = useAuth()
  const store = useNovaStore()

  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [toast, setToast] = useState({ message: '', visible: false })

  // ─── AI Rules State ──────────────────────────────────────────────────
  const [aiRules, setAiRules] = useState<Array<{
    id: string; title: string; description: string; category: string;
    enabled: boolean; priority: number; isSystem: boolean; source: string;
    createdAt: string; updatedAt: string;
  }>>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [newRuleTitle, setNewRuleTitle] = useState('')
  const [newRuleDescription, setNewRuleDescription] = useState('')
  const [newRuleCategory, setNewRuleCategory] = useState('custom')
  const [autoRulePrompt, setAutoRulePrompt] = useState('')
  const [autoRuleLoading, setAutoRuleLoading] = useState(false)

  // ─── Action Approvals State ──────────────────────────────────────────
  const [actionApprovals, setActionApprovals] = useState<Array<{
    id: string; userId: string; actionType: string; description: string;
    target: string; payload: string | null; status: string;
    reviewedBy: string | null; reviewNote: string | null;
    createdAt: string; reviewedAt: string | null;
  }>>([])
  const [approvalsLoading, setApprovalsLoading] = useState(true)

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  // ─── Log Admin Action (MUST be defined before other callbacks that use it) ──
  const logAdminAction = useCallback(async (action: string, details?: string) => {
    try {
      await authFetch('/api/admin/logs', {
        method: 'POST',
        body: JSON.stringify({ action, details: details || '', userId: user?.id || 'admin' }),
      })
    } catch {
      // Fire and forget
    }
  }, [authFetch, user])

  // ─── Feature Flags State ────────────────────────────────────────────────
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [flagSearch, setFlagSearch] = useState('')
  const [flagCategoryFilter, setFlagCategoryFilter] = useState<string>('all')
  const [selectedFlagIds, setSelectedFlagIds] = useState<Set<string>>(new Set())

  // ─── System Stats State ─────────────────────────────────────────────────
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)

  // ─── Logs State ─────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [logsPagination, setLogsPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [logsActionFilter, setLogsActionFilter] = useState<string>('')
  const [logsLoading, setLogsLoading] = useState(false)

  // ─── DB Stats State ─────────────────────────────────────────────────────
  const [dbStats, setDbStats] = useState<DbStats | null>(null)

  // ─── Integrations State ─────────────────────────────────────────────────
  const [integrations, setIntegrations] = useState<Integration[]>([])

  // ─── Security State ─────────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(30)

  // ─── Performance State ──────────────────────────────────────────────────
  const [perfHistory, setPerfHistory] = useState<{ time: number; cpu: number; mem: number }[]>([])

  // ─── Users State ────────────────────────────────────────────────────────
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null)
  const [newUserForm, setNewUserForm] = useState({ email: '', username: '', password: '', name: '', role: 'user', tier: 'free' })
  const [editUserForm, setEditUserForm] = useState({ role: '', tier: '', isActive: true })

  // ─── Tiers State ─────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<TierInfo[]>([])
  const [tiersLoading, setTiersLoading] = useState(true)
  const [editingTier, setEditingTier] = useState<TierInfo | null>(null)

  // ─── Global API Keys State ──────────────────────────────────────────────
  const [globalApiKeys, setGlobalApiKeys] = useState<GlobalApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(true)
  const [showAddKeyDialog, setShowAddKeyDialog] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ provider: '', apiKey: '', apiSecret: '', baseUrl: '', minTier: 'free' })

  // ─── Files Tab State ──────────────────────────────────────────────────────
  const [filesPath, setFilesPath] = useState('/src')
  const [filesList, setFilesList] = useState<Array<{ name: string; type: 'file' | 'dir'; size?: number; modified?: string }>>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileViewing, setFileViewing] = useState<string | null>(null)
  const [fileEditing, setFileEditing] = useState(false)
  const [fileEditContent, setFileEditContent] = useState('')
  const [fileChatPrompt, setFileChatPrompt] = useState('')
  const [fileChatResponse, setFileChatResponse] = useState<string | null>(null)
  const [fileChatLoading, setFileChatLoading] = useState(false)
  const [fileNewName, setFileNewName] = useState('')
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)

  // ─── Fetch Feature Flags ────────────────────────────────────────────────
  const fetchFeatureFlags = useCallback(async () => {
    try {
      const res = await authFetch('/api/features')
      if (res.ok) {
        const data = await res.json()
        setFeatureFlags(data)
      }
    } catch {
      // Keep existing data on error
    } finally {
      setFlagsLoading(false)
    }
  }, [authFetch])

  // ─── Fetch System Stats ─────────────────────────────────────────────────
  const fetchSystemStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/system')
      if (res.ok) {
        const data = await res.json()
        setSystemStats(data)
        setPerfHistory(prev => [...prev.slice(-19), { time: Date.now(), cpu: data.cpu, mem: data.memory?.percentage ?? 0 }])
      }
    } catch {
      // Keep existing
    }
  }, [authFetch])

  // ─── Fetch Logs ─────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 1, action = '') => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (action) params.set('action', action)
      const res = await authFetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setLogsPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
      }
    } catch {
      // Keep existing
    } finally {
      setLogsLoading(false)
    }
  }, [authFetch])

  // ─── Fetch DB Stats ─────────────────────────────────────────────────────
  const fetchDbStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/db-stats')
      if (res.ok) {
        const data = await res.json()
        setDbStats(data)
      }
    } catch {
      // fallback
      setDbStats({ tables: [], totalRecords: 0, dbSize: '0 KB' })
    }
  }, [authFetch])

  // ─── Fetch Integrations ─────────────────────────────────────────────────
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
      }
    } catch {
      // No fake data — show empty state if API is unavailable
      setIntegrations([])
    }
  }, [authFetch])

  // ─── Fetch Users ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true)
    try {
      const res = await authFetch(`/api/admin/users?page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setAdminUsers(data.users || [])
        setUsersPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
      }
    } catch {
      // Keep existing
    } finally {
      setUsersLoading(false)
    }
  }, [authFetch])

  // ─── Fetch Tiers ────────────────────────────────────────────────────────
  const fetchTiers = useCallback(async () => {
    setTiersLoading(true)
    try {
      const res = await authFetch('/api/admin/tiers')
      if (res.ok) {
        const data = await res.json()
        setTiers(data.tiers || [])
      } else {
        // Provide default tier structure
        setTiers([
          { id: '1', tier: 'free', maxChatsPerDay: 50, maxImageGenPerDay: 10, maxWebSearchPerDay: 20, maxCodeExecPerDay: 20, maxStorageMB: 100, maxPlugins: 5, maxKnowledgeBase: 100, canUseGlobalAPIs: false, canCreatePlugins: false, canAccessAdmin: false, priority: 0 },
          { id: '2', tier: 'basic', maxChatsPerDay: 200, maxImageGenPerDay: 50, maxWebSearchPerDay: 100, maxCodeExecPerDay: 100, maxStorageMB: 500, maxPlugins: 10, maxKnowledgeBase: 500, canUseGlobalAPIs: false, canCreatePlugins: false, canAccessAdmin: false, priority: 1 },
          { id: '3', tier: 'pro', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: 5000, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: false, priority: 2 },
          { id: '4', tier: 'enterprise', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: -1, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: true, priority: 3 },
          { id: '5', tier: 'unlimited', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: -1, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: true, priority: 4 },
        ])
      }
    } catch {
      setTiers([])
    } finally {
      setTiersLoading(false)
    }
  }, [authFetch])

  // ─── Fetch Global API Keys ──────────────────────────────────────────────
  const fetchGlobalApiKeys = useCallback(async () => {
    setApiKeysLoading(true)
    try {
      const res = await authFetch('/api/admin/global-api-keys')
      if (res.ok) {
        const data = await res.json()
        setGlobalApiKeys(data.globalApiKeys || [])
      }
    } catch {
      // Keep existing
    } finally {
      setApiKeysLoading(false)
    }
  }, [authFetch])

  // ─── Fetch Files ──────────────────────────────────────────────────
  const fetchFiles = useCallback(async (dirPath: string) => {
    setFilesLoading(true)
    try {
      const res = await authFetch(`/api/admin/files?path=${encodeURIComponent(dirPath)}`)
      if (res.ok) {
        const data = await res.json()
        setFilesList(data.files || [])
        setFilesPath(dirPath)
      }
    } catch {
      setFilesList([])
    } finally {
      setFilesLoading(false)
    }
  }, [authFetch])

  const fetchFileContent = useCallback(async (filePath: string) => {
    try {
      const res = await authFetch(`/api/admin/files?file=${encodeURIComponent(filePath)}`)
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content)
        setFileViewing(filePath)
        setFileEditContent(data.content)
        setFileEditing(false)
      }
    } catch {
      setFileContent('Error loading file content')
    }
  }, [authFetch])

  const saveFileContent = useCallback(async () => {
    if (!fileViewing) return
    try {
      const res = await authFetch('/api/admin/files', {
        method: 'PUT',
        body: JSON.stringify({ path: fileViewing, content: fileEditContent }),
      })
      if (res.ok) {
        setFileContent(fileEditContent)
        setFileEditing(false)
        showToast('File saved successfully')
        logAdminAction('file_save', fileViewing)
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save file')
      }
    } catch {
      showToast('Failed to save file')
    }
  }, [fileViewing, fileEditContent, authFetch, showToast, logAdminAction])

  const handleFileChat = useCallback(async () => {
    if (!fileChatPrompt.trim() || !fileViewing) return
    setFileChatLoading(true)
    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `I'm viewing the file "${fileViewing}" with the following content:\n\n\`\`\`\n${fileContent?.slice(0, 8000) || ''}\n\`\`\`\n\nAdmin request: ${fileChatPrompt.trim()}\n\nPlease provide the COMPLETE modified file content. Output the entire file, not just the changes. Wrap the code in a code block.`,
          personality: 'nova',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setFileChatResponse(data.response || 'No response generated')
      }
    } catch {
      setFileChatResponse('Error communicating with AI')
    } finally {
      setFileChatLoading(false)
    }
  }, [fileChatPrompt, fileViewing, fileContent, authFetch])

  const applyFileChatChanges = useCallback(() => {
    if (!fileChatResponse) return
    // Extract code block from response
    const codeMatch = fileChatResponse.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      setFileEditContent(codeMatch[1])
      setFileEditing(true)
      setFileChatResponse(null)
      setFileChatPrompt('')
      showToast('AI changes applied - review and save')
    } else {
      showToast('No code block found in AI response')
    }
  }, [fileChatResponse, showToast])

  // ─── Fetch AI Rules ──────────────────────────────────────────────────
  const fetchAiRules = useCallback(async () => {
    setRulesLoading(true)
    try {
      const res = await authFetch('/api/admin/ai-rules')
      if (res.ok) {
        const data = await res.json()
        setAiRules(data.rules || [])
      }
    } catch {
      // Keep existing
    } finally {
      setRulesLoading(false)
    }
  }, [authFetch])

  // ─── Fetch Action Approvals ──────────────────────────────────────────
  const fetchActionApprovals = useCallback(async () => {
    setApprovalsLoading(true)
    try {
      const res = await authFetch('/api/admin/action-approvals?status=pending')
      if (res.ok) {
        const data = await res.json()
        setActionApprovals(data.approvals || [])
      }
    } catch {
      // Keep existing
    } finally {
      setApprovalsLoading(false)
    }
  }, [authFetch])

  // ─── Toggle AI Rule ──────────────────────────────────────────────────
  const toggleAiRule = useCallback(async (ruleId: string, enabled: boolean) => {
    try {
      const res = await authFetch(`/api/admin/ai-rules/${ruleId}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (res.ok) {
        setAiRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !enabled } : r))
        showToast(`Rule ${!enabled ? 'enabled' : 'disabled'}`)
        logAdminAction('ai_rule_toggle', `Rule ${ruleId}: ${!enabled ? 'enabled' : 'disabled'}`)
      }
    } catch {
      // Error
    }
  }, [authFetch, showToast, logAdminAction])

  // ─── Create AI Rule ──────────────────────────────────────────────────
  const createAiRule = useCallback(async () => {
    if (!newRuleTitle.trim() || !newRuleDescription.trim()) return
    try {
      const res = await authFetch('/api/admin/ai-rules', {
        method: 'POST',
        body: JSON.stringify({
          title: newRuleTitle.trim(),
          description: newRuleDescription.trim(),
          category: newRuleCategory,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiRules(prev => [...prev, data.rule])
        setNewRuleTitle('')
        setNewRuleDescription('')
        showToast('Rule created successfully')
        logAdminAction('ai_rule_create', newRuleTitle)
      }
    } catch {
      // Error
    }
  }, [newRuleTitle, newRuleDescription, newRuleCategory, showToast, logAdminAction])

  // ─── Auto-Generate Rule from Prompt ──────────────────────────────────
  const autoGenerateRule = useCallback(async () => {
    if (!autoRulePrompt.trim()) return
    setAutoRuleLoading(true)
    try {
      // Use the chat API to generate a rule from the prompt
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: `Generate an AI rule based on this description: "${autoRulePrompt.trim()}". Output ONLY a JSON object with "title" (short name, max 50 chars), "description" (detailed rule text, max 500 chars), and "category" (one of: ethics, limitations, behavior, custom). No other text outside the JSON.`,
          personality: 'nova',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const content = data.response || ''
        // Try to parse JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0])
            const ruleRes = await authFetch('/api/admin/ai-rules', {
              method: 'POST',
              body: JSON.stringify({
                title: parsed.title || 'Auto-generated Rule',
                description: parsed.description || autoRulePrompt.trim(),
                category: parsed.category || 'custom',
                source: 'auto-generated',
              }),
            })
            if (ruleRes.ok) {
              const ruleData = await ruleRes.json()
              setAiRules(prev => [...prev, ruleData.rule])
              setAutoRulePrompt('')
              showToast('Rule auto-generated successfully')
              logAdminAction('ai_rule_auto_generate', parsed.title || 'Auto-generated Rule')
            }
          } catch {
            // JSON parse failed, create rule from raw prompt
            const ruleRes = await authFetch('/api/admin/ai-rules', {
              method: 'POST',
              body: JSON.stringify({
                title: autoRulePrompt.trim().slice(0, 50),
                description: autoRulePrompt.trim(),
                category: 'custom',
                source: 'auto-generated',
              }),
            })
            if (ruleRes.ok) {
              const ruleData = await ruleRes.json()
              setAiRules(prev => [...prev, ruleData.rule])
              setAutoRulePrompt('')
              showToast('Rule created from description')
            }
          }
        } else {
          // No JSON found, create rule from raw prompt
          const ruleRes = await authFetch('/api/admin/ai-rules', {
            method: 'POST',
            body: JSON.stringify({
              title: autoRulePrompt.trim().slice(0, 50),
              description: autoRulePrompt.trim(),
              category: 'custom',
              source: 'auto-generated',
            }),
          })
          if (ruleRes.ok) {
            const ruleData = await ruleRes.json()
            setAiRules(prev => [...prev, ruleData.rule])
            setAutoRulePrompt('')
            showToast('Rule created from description')
          }
        }
      }
    } catch (err) {
      console.error('Auto-generate rule error:', err)
      showToast('Failed to auto-generate rule')
    } finally {
      setAutoRuleLoading(false)
    }
  }, [autoRulePrompt, authFetch, showToast, logAdminAction])

  // ─── Delete AI Rule ──────────────────────────────────────────────────
  const deleteAiRule = useCallback(async (ruleId: string) => {
    try {
      const res = await authFetch(`/api/admin/ai-rules/${ruleId}`, { method: 'DELETE' })
      if (res.ok) {
        setAiRules(prev => prev.filter(r => r.id !== ruleId))
        showToast('Rule deleted')
        logAdminAction('ai_rule_delete', ruleId)
      } else {
        const data = await res.json()
        showToast(data.error || 'Cannot delete system rule')
      }
    } catch {
      // Error
    }
  }, [showToast, logAdminAction])

  // ─── Approve/Reject Action ──────────────────────────────────────────
  const reviewAction = useCallback(async (approvalId: string, status: 'approved' | 'rejected', note?: string) => {
    try {
      const res = await authFetch(`/api/admin/action-approvals/${approvalId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, reviewNote: note || null }),
      })
      if (res.ok) {
        setActionApprovals(prev => prev.filter(a => a.id !== approvalId))
        showToast(`Action ${status}`)
        logAdminAction(`action_${status}`, approvalId)
      }
    } catch {
      // Error
    }
  }, [showToast, logAdminAction])

  // ─── Toggle Single Feature Flag ─────────────────────────────────────────
  const toggleFeatureFlag = useCallback(async (flag: FeatureFlag) => {
    try {
      const res = await authFetch(`/api/features/${flag.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !flag.enabled }),
      })
      if (res.ok) {
        setFeatureFlags(prev =>
          prev.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f)
        )
        showToast(`"${flag.name}" ${flag.enabled ? 'disabled' : 'enabled'}`)
        logAdminAction('feature_toggle', `${flag.name}: ${flag.enabled ? 'disabled' : 'enabled'}`)
      }
    } catch {
      // Error
    }
  }, [showToast, logAdminAction])

  // ─── Batch Toggle Feature Flags ─────────────────────────────────────────
  const batchToggleFlags = useCallback(async (action: 'enable' | 'disable', ids?: string[], category?: string) => {
    try {
      const body: { action: string; ids?: string[]; category?: string } = { action }
      if (ids && ids.length > 0) body.ids = ids
      if (category) body.category = category

      const res = await authFetch('/api/features/batch', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchFeatureFlags()
        setSelectedFlagIds(new Set())
        showToast(`${action === 'enable' ? 'Enabled' : 'Disabled'} flags ${category ? `in "${category}"` : ids ? `(${ids.length} selected)` : '(all)'}`)
        logAdminAction('feature_batch', `${action} ${category || 'selected'}`)
      }
    } catch {
      // Error
    }
  }, [fetchFeatureFlags, showToast, logAdminAction])

  // ─── Delete Feature Flag ────────────────────────────────────────────────
  const deleteFeatureFlag = useCallback(async (flag: FeatureFlag) => {
    try {
      const res = await authFetch(`/api/features/${flag.id}`, { method: 'DELETE' })
      if (res.ok) {
        setFeatureFlags(prev => prev.filter(f => f.id !== flag.id))
        showToast(`"${flag.name}" deleted`)
        logAdminAction('feature_delete', flag.name)
      }
    } catch {
      // Error
    }
  }, [showToast, logAdminAction])

  // ─── Toggle Flag Selection ──────────────────────────────────────────────
  const toggleFlagSelection = useCallback((id: string) => {
    setSelectedFlagIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ─── Select All / Deselect All ──────────────────────────────────────────
  const selectAllFlags = useCallback(() => {
    const allIds = filteredFlags.map(f => f.id)
    setSelectedFlagIds(new Set(allIds))
  }, [])

  const deselectAllFlags = useCallback(() => {
    setSelectedFlagIds(new Set())
  }, [])

  // ─── Integration Toggle ─────────────────────────────────────────────────
  const toggleIntegration = useCallback(async (integration: Integration) => {
    const newStatus = integration.status === 'connected' ? 'disconnected' : 'connected'
    try {
      await authFetch('/api/admin/integrations', {
        method: 'PUT',
        body: JSON.stringify({ id: integration.id, status: newStatus }),
      })
      setIntegrations(prev =>
        prev.map(i => i.id === integration.id ? { ...i, status: newStatus as Integration['status'], lastSync: newStatus === 'connected' ? new Date().toISOString() : i.lastSync } : i)
      )
      showToast(`${integration.name} ${newStatus === 'connected' ? 'connected' : 'disconnected'}`)
      logAdminAction('integration_toggle', `${integration.name}: ${newStatus}`)
    } catch {
      // Still update UI optimistically
      setIntegrations(prev =>
        prev.map(i => i.id === integration.id ? { ...i, status: newStatus as Integration['status'], lastSync: newStatus === 'connected' ? new Date().toISOString() : i.lastSync } : i)
      )
      showToast(`${integration.name} ${newStatus === 'connected' ? 'connected' : 'disconnected'}`)
    }
  }, [showToast, logAdminAction])

  // ─── Change Password ────────────────────────────────────────────────────
  const handleChangePassword = useCallback(async () => {
    if (newPassword && newPassword === confirmPassword) {
      try {
        // Hash the password before storing — never store plaintext
        const hashed = await hashPassword(newPassword)
        store.setMasterPasswordHash(hashed)
        setShowChangePassword(false)
        setNewPassword('')
        setConfirmPassword('')
        showToast('Master password updated')
        logAdminAction('password_change', 'Vault master password changed')
      } catch (err) {
        console.error('[AdminView] Failed to hash password:', err)
      }
    }
  }, [newPassword, confirmPassword, store, showToast, logAdminAction])

  // ─── Effects ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFeatureFlags()
    fetchSystemStats()
    fetchDbStats()
    fetchIntegrations()
    fetchLogs(1)
    fetchUsers(1)
    fetchTiers()
    fetchGlobalApiKeys()
    fetchAiRules()
    fetchActionApprovals()
    fetchFiles('/src')
  }, [fetchFeatureFlags, fetchSystemStats, fetchDbStats, fetchIntegrations, fetchLogs, fetchUsers, fetchTiers, fetchGlobalApiKeys, fetchAiRules, fetchActionApprovals, fetchFiles])

  // Auto-refresh system stats
  useEffect(() => {
    const interval = setInterval(fetchSystemStats, 5000)
    return () => clearInterval(interval)
  }, [fetchSystemStats])

  // Auto-refresh logs
  useEffect(() => {
    if (activeTab === 'logs') {
      const interval = setInterval(() => fetchLogs(logsPagination.page, logsActionFilter), 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab, fetchLogs, logsPagination.page, logsActionFilter])

  // ─── Derived Data ───────────────────────────────────────────────────────
  const flagCategories = useMemo(() => {
    const cats = new Set(featureFlags.map(f => f.category))
    return ['all', ...Array.from(cats)]
  }, [featureFlags])

  const filteredFlags = useMemo(() => {
    return featureFlags.filter(f => {
      const matchCategory = flagCategoryFilter === 'all' || f.category === flagCategoryFilter
      const matchSearch = !flagSearch ||
        f.name.toLowerCase().includes(flagSearch.toLowerCase()) ||
        f.key.toLowerCase().includes(flagSearch.toLowerCase()) ||
        f.description.toLowerCase().includes(flagSearch.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [featureFlags, flagCategoryFilter, flagSearch])

  const flagsByCategory = useMemo(() => {
    const groups: Record<string, FeatureFlag[]> = {}
    filteredFlags.forEach(f => {
      if (!groups[f.category]) groups[f.category] = []
      groups[f.category].push(f)
    })
    return groups
  }, [filteredFlags])

  const enabledCount = featureFlags.filter(f => f.enabled).length
  const disabledCount = featureFlags.filter(f => !f.enabled).length

  const logActionTypes = useMemo(() => {
    const types = new Set(logs.map(l => l.action))
    return Array.from(types)
  }, [logs])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Features Enabled" value={enabledCount} icon={Flag} color="gold" subtitle={`of ${featureFlags.length} total`} />
        <StatCard label="Features Disabled" value={disabledCount} icon={Flag} color="red" />
        <StatCard label="System Uptime" value={systemStats ? formatUptime(systemStats.uptime) : '...'} icon={Clock} color="emerald" />
        <StatCard label="Integrations" value={integrations.filter(i => i.status === 'connected').length} icon={Plug} color="purple" subtitle={`of ${integrations.length} total`} />
      </div>

      {/* System Health */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-nova-gold" />
          System Health
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* CPU */}
          <div className="p-3 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> CPU
              </span>
              <span className="text-xs font-semibold text-nova-gold">{systemStats?.cpu ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                animate={{ width: `${systemStats?.cpu ?? 0}%` }}
                className="h-full rounded-full progress-gold"
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          {/* RAM */}
          <div className="p-3 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MemoryStick className="w-3.5 h-3.5" /> RAM
              </span>
              <span className="text-xs font-semibold text-nova-purple">
                {systemStats?.memory?.percentage ?? 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                animate={{ width: `${systemStats?.memory?.percentage ?? 0}%` }}
                className="h-full rounded-full bg-nova-purple"
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {systemStats ? `${formatBytes(systemStats.memory.used)} / ${formatBytes(systemStats.memory.total)}` : '...'}
            </p>
          </div>
          {/* Storage */}
          <div className="p-3 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Storage
              </span>
              <span className="text-xs font-semibold text-emerald-500">{systemStats?.storage?.percentage ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                animate={{ width: `${systemStats?.storage?.percentage ?? 0}%` }}
                className="h-full rounded-full bg-emerald-500"
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {systemStats ? `${systemStats.storage.used} / ${systemStats.storage.total}` : '...'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-nova-gold" />
          Quick Actions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Create Backup', icon: Download, action: () => setActiveTab('backup') },
            { label: 'Manage Flags', icon: Flag, action: () => setActiveTab('features') },
            { label: 'View Logs', icon: ScrollText, action: () => setActiveTab('logs') },
            { label: 'Security', icon: Shield, action: () => setActiveTab('security') },
          ].map(item => (
            <motion.button
              key={item.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.action}
              className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
            >
              <item.icon className="w-4 h-4 text-nova-gold flex-shrink-0" />
              {item.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-nova-gold" />
          System Info
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Platform', value: systemStats?.platform || '...' },
            { label: 'Node', value: systemStats?.nodeVersion || '...' },
            { label: 'CPU Cores', value: systemStats?.cpuCores || '...' },
            { label: 'DB Records', value: dbStats?.totalRecords?.toString() || '...' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-lg bg-secondary/20">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Admin Actions */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-nova-gold" />
          Recent Admin Actions
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.length > 0 ? logs.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/10">
              <div className="w-1.5 h-1.5 rounded-full bg-nova-gold flex-shrink-0" />
              <span className="text-xs text-foreground flex-1 truncate">{log.action}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-4">No admin actions logged</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderFeatureFlags = () => (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search feature flags..."
              value={flagSearch}
              onChange={(e) => setFlagSearch(e.target.value)}
              className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {flagCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFlagCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                  flagCategoryFilter === cat
                    ? 'gold-gradient-bg text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Selection Actions */}
        {selectedFlagIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 p-2 rounded-lg bg-nova-gold/10 border border-nova-gold/20"
          >
            <span className="text-xs text-nova-gold font-medium">{selectedFlagIds.size} selected</span>
            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => batchToggleFlags('enable', Array.from(selectedFlagIds))}
              className="px-3 py-1 rounded-lg text-[11px] font-medium gold-gradient-bg text-background"
            >
              Enable
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => batchToggleFlags('disable', Array.from(selectedFlagIds))}
              className="px-3 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground"
            >
              Disable
            </motion.button>
            <button onClick={deselectAllFlags} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Select All / Deselect All */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={selectAllFlags}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-nova-gold transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Select All
          </button>
          <button
            onClick={deselectAllFlags}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-nova-gold transition-colors"
          >
            <Square className="w-3.5 h-3.5" />
            Deselect All
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground">
            {enabledCount} enabled / {disabledCount} disabled
          </span>
        </div>
      </div>

      {/* Flags Loading */}
      {flagsLoading && (
        <div className="glass-card p-8 text-center">
          <RefreshCw className="w-6 h-6 text-nova-gold animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading feature flags...</p>
        </div>
      )}

      {/* Flags Grouped by Category */}
      {!flagsLoading && Object.entries(flagsByCategory).map(([category, flags]) => (
        <div key={category} className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 capitalize">
              <Layers className="w-4 h-4 text-nova-gold" />
              {category}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                {flags.filter(f => f.enabled).length}/{flags.length}
              </span>
            </h4>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => batchToggleFlags('enable', undefined, category)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium gold-gradient-bg text-background"
              >
                Enable All
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => batchToggleFlags('disable', undefined, category)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium border border-border text-muted-foreground hover:text-foreground"
              >
                Disable All
              </motion.button>
            </div>
          </div>

          <div className="space-y-2">
            {flags.map(flag => (
              <motion.div
                key={flag.id}
                whileHover={{ x: 2 }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedFlagIds.has(flag.id) ? 'bg-nova-gold/5 border border-nova-gold/20' : 'bg-secondary/20'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleFlagSelection(flag.id)}
                  className="flex-shrink-0"
                >
                  {selectedFlagIds.has(flag.id) ? (
                    <CheckSquare className="w-4 h-4 text-nova-gold" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground hover:text-nova-gold transition-colors" />
                  )}
                </button>

                {/* Flag Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{flag.name}</p>
                    {flag.requiresRestart && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                        Restart Required
                      </span>
                    )}
                    {!flag.configurable && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-nova-purple/10 text-nova-purple">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{flag.description}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{flag.key}</p>
                </div>

                {/* Toggle */}
                <ToggleSwitch
                  enabled={flag.enabled}
                  onToggle={() => toggleFeatureFlag(flag)}
                  disabled={!flag.configurable}
                  size="small"
                />

                {/* Delete */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => deleteFeatureFlag(flag)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {!flagsLoading && filteredFlags.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Flag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No feature flags found</p>
          {flagSearch && <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>}
        </div>
      )}
    </div>
  )

  const renderUsers = () => {
    const tierBadgeColor: Record<string, string> = {
      free: 'bg-secondary/50 text-muted-foreground',
      basic: 'bg-emerald-500/10 text-emerald-500',
      pro: 'bg-nova-purple/10 text-nova-purple',
      enterprise: 'bg-nova-gold/10 text-nova-gold',
      unlimited: 'bg-amber-500/10 text-amber-500',
    }

    const handleCreateUser = async () => {
      try {
        const res = await authFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(newUserForm),
        })
        if (res.ok) {
          setShowAddUserDialog(false)
          setNewUserForm({ email: '', username: '', password: '', name: '', role: 'user', tier: 'free' })
          fetchUsers(1)
          showToast('User created successfully')
          logAdminAction('user_create', `Created user ${newUserForm.username}`)
        } else {
          const data = await res.json()
          showToast(data.error || 'Failed to create user')
        }
      } catch {
        showToast('Failed to create user')
      }
    }

    const handleUpdateUser = async () => {
      if (!editingUser) return
      try {
        const res = await authFetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(editUserForm),
        })
        if (res.ok) {
          setShowEditUserDialog(false)
          setEditingUser(null)
          fetchUsers(usersPagination.page)
          showToast('User updated successfully')
          logAdminAction('user_update', `Updated user ${editingUser.username}`)
        } else {
          const data = await res.json()
          showToast(data.error || 'Failed to update user')
        }
      } catch {
        showToast('Failed to update user')
      }
    }

    const handleDeleteUser = async (userId: string) => {
      try {
        const res = await authFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
        if (res.ok) {
          setDeleteConfirmUserId(null)
          fetchUsers(usersPagination.page)
          showToast('User deleted')
          logAdminAction('user_delete', `Deleted user ${userId}`)
        } else {
          const data = await res.json()
          showToast(data.error || 'Failed to delete user')
        }
      } catch {
        showToast('Failed to delete user')
      }
    }

    const handleToggleUserActive = async (user: AdminUser) => {
      try {
        const res = await authFetch(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify({ isActive: !user.isActive }),
        })
        if (res.ok) {
          setAdminUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
          showToast(`${user.username} ${user.isActive ? 'deactivated' : 'activated'}`)
          logAdminAction('user_toggle_active', `${user.username}: ${user.isActive ? 'deactivated' : 'activated'}`)
        }
      } catch {
        showToast('Failed to update user status')
      }
    }

    const openEditDialog = (user: AdminUser) => {
      setEditingUser(user)
      setEditUserForm({ role: user.role, tier: user.tier, isActive: user.isActive })
      setShowEditUserDialog(true)
    }

    return (
      <div className="space-y-4">
        {/* Users List */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-nova-gold" />
              Users
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                {usersPagination.total}
              </span>
            </h4>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddUserDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </motion.button>
          </div>

          {usersLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-5 h-5 text-nova-gold animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading users...</p>
            </div>
          ) : adminUsers.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {adminUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                    user.isActive ? 'bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 border-nova-gold/20' : 'bg-secondary/30 border-border'
                  }`}>
                    <span className={`text-xs font-bold ${user.isActive ? 'text-nova-gold' : 'text-muted-foreground'}`}>
                      {(user.name || user.username)[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{user.name || user.username}</p>
                      {!user.isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">Inactive</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-muted-foreground">@{user.username}</span>
                      <span className="text-[9px] text-muted-foreground">·</span>
                      <span className="text-[9px] text-muted-foreground">
                        Last login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-red-500/10 text-red-500' : 'bg-secondary/50 text-muted-foreground'}`}>
                    {user.role}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full capitalize ${tierBadgeColor[user.tier] || 'bg-secondary/50 text-muted-foreground'}`}>
                    {user.tier}
                  </span>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditDialog(user)}
                      className="p-1.5 rounded text-muted-foreground hover:text-nova-gold transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleUserActive(user)}
                      className="p-1.5 rounded text-muted-foreground hover:text-emerald-500 transition-colors"
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirmUserId(user.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No users found</p>
              <p className="text-xs text-muted-foreground mt-1">Register users or create them with the Add User button</p>
            </div>
          )}

          {/* Pagination */}
          {usersPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground">
                {usersPagination.total} users · Page {usersPagination.page} of {usersPagination.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => fetchUsers(usersPagination.page - 1)} disabled={usersPagination.page <= 1} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => fetchUsers(usersPagination.page + 1)} disabled={usersPagination.page >= usersPagination.totalPages} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add User Dialog */}
        <AnimatePresence>
          {showAddUserDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setShowAddUserDialog(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card p-6 w-full max-w-md mx-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4 text-nova-gold" />
                    Add New User
                  </h3>
                  <button onClick={() => setShowAddUserDialog(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                    <input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Username *</label>
                    <input type="text" value={newUserForm.username} onChange={(e) => setNewUserForm(p => ({ ...p, username: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="username" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Password *</label>
                    <input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="Min 6 characters" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                    <input type="text" value={newUserForm.name} onChange={(e) => setNewUserForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="John Doe" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                      <select value={newUserForm.role} onChange={(e) => setNewUserForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tier</label>
                      <select value={newUserForm.tier} onChange={(e) => setNewUserForm(p => ({ ...p, tier: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleCreateUser} disabled={!newUserForm.email || !newUserForm.username || !newUserForm.password} className="flex-1 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50">
                    Create User
                  </motion.button>
                  <button onClick={() => setShowAddUserDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Dialog */}
        <AnimatePresence>
          {showEditUserDialog && editingUser && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEditUserDialog(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-md mx-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-nova-gold" />
                    Edit User: {editingUser.username}
                  </h3>
                  <button onClick={() => setShowEditUserDialog(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-sm font-medium text-foreground">{editingUser.name || editingUser.username}</p>
                    <p className="text-[11px] text-muted-foreground">{editingUser.email}</p>
                    <p className="text-[10px] text-muted-foreground">Joined {new Date(editingUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                      <select value={editUserForm.role} onChange={(e) => setEditUserForm(p => ({ ...p, role: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tier</label>
                      <select value={editUserForm.tier} onChange={(e) => setEditUserForm(p => ({ ...p, tier: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                    <div>
                      <p className="text-sm text-foreground">Active Status</p>
                      <p className="text-[11px] text-muted-foreground">{editUserForm.isActive ? 'User can log in and use the system' : 'User is deactivated'}</p>
                    </div>
                    <ToggleSwitch enabled={editUserForm.isActive} onToggle={() => setEditUserForm(p => ({ ...p, isActive: !p.isActive }))} size="small" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleUpdateUser} className="flex-1 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">
                    Save Changes
                  </motion.button>
                  <button onClick={() => setShowEditUserDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deleteConfirmUserId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirmUserId(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-sm mx-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Delete User</h3>
                    <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">All user data including sessions, API keys, and usage records will be permanently deleted.</p>
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleDeleteUser(deleteConfirmUserId)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium">
                    Delete Permanently
                  </motion.button>
                  <button onClick={() => setDeleteConfirmUserId(null)} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Access Control */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-nova-gold" />
            Access Control
          </h4>
          <div className="space-y-3">
            {[
              { label: 'API Access', description: 'Allow external API access', enabled: true },
              { label: 'Debug Console', description: 'Access to debug console', enabled: store.debugMode },
              { label: 'Data Export', description: 'Export all user data', enabled: true },
              { label: 'System Commands', description: 'Execute system-level commands', enabled: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div>
                  <p className="text-sm text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <ToggleSwitch enabled={item.enabled} onToggle={() => showToast(`${item.label} toggled`)} size="small" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Tier Management ────────────────────────────────────────────────────

  const renderTiers = () => {
    const tierColors: Record<string, string> = {
      free: 'border-secondary/50',
      basic: 'border-emerald-500/30',
      pro: 'border-nova-purple/30',
      enterprise: 'border-nova-gold/30',
      unlimited: 'border-amber-500/30',
    }
    const tierIconColors: Record<string, string> = {
      free: 'text-muted-foreground',
      basic: 'text-emerald-500',
      pro: 'text-nova-purple',
      enterprise: 'text-nova-gold',
      unlimited: 'text-amber-500',
    }

    const formatLimit = (val: number) => val === -1 ? 'Unlimited' : String(val)

    return (
      <div className="space-y-4">
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-nova-gold" />
            Tier Management
          </h4>
          <p className="text-xs text-muted-foreground mb-4">Configure limits and permissions for each subscription tier.</p>

          {tiersLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-5 h-5 text-nova-gold animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading tiers...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tiers.map(tier => (
                <div key={tier.id} className={`p-4 rounded-lg border bg-secondary/10 ${tierColors[tier.tier] || 'border-border'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className={`w-4 h-4 ${tierIconColors[tier.tier] || 'text-muted-foreground'}`} />
                      <span className="text-sm font-semibold text-foreground capitalize">{tier.tier}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">
                      Priority: {tier.priority}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Chats/day', value: formatLimit(tier.maxChatsPerDay) },
                      { label: 'Image Gen/day', value: formatLimit(tier.maxImageGenPerDay) },
                      { label: 'Web Search/day', value: formatLimit(tier.maxWebSearchPerDay) },
                      { label: 'Code Exec/day', value: formatLimit(tier.maxCodeExecPerDay) },
                      { label: 'Storage', value: tier.maxStorageMB === -1 ? 'Unlimited' : `${tier.maxStorageMB} MB` },
                      { label: 'Plugins', value: formatLimit(tier.maxPlugins) },
                      { label: 'Knowledge Base', value: formatLimit(tier.maxKnowledgeBase) },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                        <span className="text-[11px] text-foreground font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                    {[
                      { label: 'Global APIs', enabled: tier.canUseGlobalAPIs },
                      { label: 'Custom Plugins', enabled: tier.canCreatePlugins },
                      { label: 'Admin Access', enabled: tier.canAccessAdmin },
                    ].map(perm => (
                      <div key={perm.label} className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{perm.label}</span>
                        {perm.enabled ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3 text-muted-foreground/50" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tier Comparison */}
        <div className="glass-card p-4 overflow-x-auto">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-nova-gold" />
            Tier Comparison
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Feature</th>
                {tiers.map(t => (
                  <th key={t.tier} className="text-center py-2 px-2 capitalize font-medium" style={{ color: tierIconColors[t.tier] }}>
                    {t.tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Chats/day', key: 'maxChatsPerDay' as const },
                { label: 'Image Gen/day', key: 'maxImageGenPerDay' as const },
                { label: 'Web Search/day', key: 'maxWebSearchPerDay' as const },
                { label: 'Code Exec/day', key: 'maxCodeExecPerDay' as const },
                { label: 'Storage (MB)', key: 'maxStorageMB' as const },
                { label: 'Plugins', key: 'maxPlugins' as const },
              ].map(row => (
                <tr key={row.key} className="border-b border-border/30">
                  <td className="py-1.5 px-2 text-muted-foreground">{row.label}</td>
                  {tiers.map(t => (
                    <td key={t.tier} className="text-center py-1.5 px-2 text-foreground">
                      {t[row.key] === -1 ? '∞' : t[row.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─── API Keys Management ────────────────────────────────────────────────

  const renderApiKeys = () => {
    const handleAddKey = async () => {
      try {
        const res = await authFetch('/api/admin/global-api-keys', {
          method: 'POST',
          body: JSON.stringify({
            provider: newKeyForm.provider,
            apiKey: newKeyForm.apiKey,
            apiSecret: newKeyForm.apiSecret || undefined,
            baseUrl: newKeyForm.baseUrl || undefined,
            minTier: newKeyForm.minTier,
          }),
        })
        if (res.ok) {
          setShowAddKeyDialog(false)
          setNewKeyForm({ provider: '', apiKey: '', apiSecret: '', baseUrl: '', minTier: 'free' })
          fetchGlobalApiKeys()
          showToast('API key added')
          logAdminAction('api_key_add', `Added key for ${newKeyForm.provider}`)
        } else {
          const data = await res.json()
          showToast(data.error || 'Failed to add key')
        }
      } catch {
        showToast('Failed to add API key')
      }
    }

    const handleToggleKey = async (key: GlobalApiKey) => {
      try {
        const res = await authFetch(`/api/admin/global-api-keys/${key.id}`, {
          method: 'PUT',
          body: JSON.stringify({ isActive: !key.isActive }),
        })
        if (res.ok) {
          setGlobalApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, isActive: !k.isActive } : k))
          showToast(`${key.provider} key ${key.isActive ? 'disabled' : 'enabled'}`)
          logAdminAction('api_key_toggle', `${key.provider}: ${key.isActive ? 'disabled' : 'enabled'}`)
        }
      } catch {
        showToast('Failed to toggle key')
      }
    }

    const handleDeleteKey = async (key: GlobalApiKey) => {
      try {
        const res = await authFetch(`/api/admin/global-api-keys/${key.id}`, { method: 'DELETE' })
        if (res.ok) {
          setGlobalApiKeys(prev => prev.filter(k => k.id !== key.id))
          showToast(`${key.provider} key deleted`)
          logAdminAction('api_key_delete', `Deleted key for ${key.provider}`)
        }
      } catch {
        showToast('Failed to delete key')
      }
    }

    return (
      <div className="space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-nova-gold" />
              Global API Keys
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                {globalApiKeys.length}
              </span>
            </h4>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddKeyDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Key
            </motion.button>
          </div>

          {apiKeysLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-5 h-5 text-nova-gold animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Loading API keys...</p>
            </div>
          ) : globalApiKeys.length > 0 ? (
            <div className="space-y-2">
              {globalApiKeys.map(key => (
                <div key={key.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${key.isActive ? 'bg-nova-gold/10 border border-nova-gold/20' : 'bg-secondary/30 border border-border'}`}>
                    <Key className={`w-4 h-4 ${key.isActive ? 'text-nova-gold' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground capitalize">{key.provider}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${key.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-muted-foreground capitalize">
                        Min: {key.minTier}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{key.apiKeyMasked}</p>
                    {key.baseUrl && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Base URL: {key.baseUrl}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <ToggleSwitch enabled={key.isActive} onToggle={() => handleToggleKey(key)} size="small" />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteKey(key)}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No global API keys configured</p>
              <p className="text-xs text-muted-foreground mt-1">Add API keys to enable AI providers for all users</p>
            </div>
          )}
        </div>

        {/* Add Key Dialog */}
        <AnimatePresence>
          {showAddKeyDialog && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddKeyDialog(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-md mx-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Key className="w-4 h-4 text-nova-gold" />
                    Add Global API Key
                  </h3>
                  <button onClick={() => setShowAddKeyDialog(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Provider *</label>
                    <select value={newKeyForm.provider} onChange={(e) => setNewKeyForm(p => ({ ...p, provider: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                      <option value="">Select provider...</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google AI</option>
                      <option value="cohere">Cohere</option>
                      <option value="mistral">Mistral AI</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">API Key *</label>
                    <input type="password" value={newKeyForm.apiKey} onChange={(e) => setNewKeyForm(p => ({ ...p, apiKey: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="sk-..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">API Secret (optional)</label>
                    <input type="password" value={newKeyForm.apiSecret} onChange={(e) => setNewKeyForm(p => ({ ...p, apiSecret: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom Base URL (optional)</label>
                    <input type="url" value={newKeyForm.baseUrl} onChange={(e) => setNewKeyForm(p => ({ ...p, baseUrl: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" placeholder="https://api.example.com/v1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Minimum Tier Required</label>
                    <select value={newKeyForm.minTier} onChange={(e) => setNewKeyForm(p => ({ ...p, minTier: e.target.value }))} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                      <option value="free">Free (all users)</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddKey} disabled={!newKeyForm.provider || !newKeyForm.apiKey} className="flex-1 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50">
                    Add Key
                  </motion.button>
                  <button onClick={() => setShowAddKeyDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderLogs = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => { setLogsActionFilter(''); fetchLogs(1, '') }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                !logsActionFilter ? 'gold-gradient-bg text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              All
            </button>
            {logActionTypes.map(action => (
              <button
                key={action}
                onClick={() => { setLogsActionFilter(action); fetchLogs(1, action) }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                  logsActionFilter === action ? 'gold-gradient-bg text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                {action.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => fetchLogs(logsPagination.page, logsActionFilter)}
            className="flex items-center gap-1.5 text-xs text-nova-gold hover:text-nova-gold/80"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-3">Details</th>
                <th className="text-left text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-[10px] text-muted-foreground uppercase tracking-wider px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <RefreshCw className="w-5 h-5 text-nova-gold animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading logs...</p>
                  </td>
                </tr>
              ) : logs.length > 0 ? logs.map(log => (
                <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-nova-gold capitalize">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-muted-foreground truncate max-w-xs block">{log.details || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-foreground">{log.userId}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[11px] text-muted-foreground">
              {logsPagination.total} total · Page {logsPagination.page} of {logsPagination.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchLogs(logsPagination.page - 1, logsActionFilter)}
                disabled={logsPagination.page <= 1}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchLogs(logsPagination.page + 1, logsActionFilter)}
                disabled={logsPagination.page >= logsPagination.totalPages}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderDatabase = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Records" value={dbStats?.totalRecords ?? 0} icon={Database} color="gold" />
        <StatCard label="Database Size" value={dbStats?.dbSize ?? '...'} icon={HardDrive} color="purple" />
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-nova-gold" />
          Table Overview
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {dbStats?.tables && dbStats.tables.length > 0 ? dbStats.tables.map(table => (
            <div key={table.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-nova-gold" />
                <span className="text-xs font-medium text-foreground capitalize">{table.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{table.count} records</span>
            </div>
          )) : (
            <p className="text-xs text-muted-foreground text-center py-4">Loading table data...</p>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-nova-gold" />
          Database Operations
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { fetchDbStats(); showToast('Database stats refreshed') }}
            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-nova-gold" />
            Refresh Stats
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('backup')}
            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Download className="w-4 h-4 text-nova-gold" />
            Export DB
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { fetchDbStats(); showToast('Schema validated') }}
            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Validate Schema
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('backup')}
            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Upload className="w-4 h-4 text-nova-purple" />
            Import Data
          </motion.button>
        </div>
      </div>
    </div>
  )

  const renderIntegrations = () => (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plug className="w-4 h-4 text-nova-gold" />
          Connected Services
        </h4>
        <div className="space-y-2">
          {integrations.map(int => (
            <div key={int.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                int.status === 'connected' ? 'bg-emerald-500/10' : int.status === 'error' ? 'bg-red-500/10' : 'bg-secondary/50'
              }`}>
                {int.status === 'connected' ? (
                  <Plug className="w-5 h-5 text-emerald-500" />
                ) : int.status === 'error' ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <Plug className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{int.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    int.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' :
                    int.status === 'error' ? 'bg-red-500/10 text-red-500' :
                    'bg-secondary/50 text-muted-foreground'
                  }`}>
                    {int.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{int.description}</p>
                {int.lastSync && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Last sync: {new Date(int.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleIntegration(int)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  int.status === 'connected'
                    ? 'border border-border text-muted-foreground hover:text-foreground'
                    : 'gold-gradient-bg text-background'
                }`}
              >
                {int.status === 'connected' ? 'Disconnect' : 'Connect'}
              </motion.button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-nova-gold" />
          Integration Health
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
            <p className="text-lg font-bold text-emerald-500">{integrations.filter(i => i.status === 'connected').length}</p>
            <p className="text-[10px] text-muted-foreground">Connected</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-lg font-bold text-muted-foreground">{integrations.filter(i => i.status === 'disconnected').length}</p>
            <p className="text-[10px] text-muted-foreground">Disconnected</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 text-center">
            <p className="text-lg font-bold text-red-500">{integrations.filter(i => i.status === 'error').length}</p>
            <p className="text-[10px] text-muted-foreground">Errors</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPlugins = () => (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-nova-gold" />
            Plugin Management
          </h4>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Install Plugin
          </motion.button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {store.plugins.map(plugin => (
            <div key={plugin.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                plugin.installed ? 'bg-nova-gold/10 border border-nova-gold/20' : 'bg-secondary/50'
              }`}>
                <Puzzle className={`w-5 h-5 ${plugin.installed ? 'text-nova-gold' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{plugin.name}</p>
                  <span className="text-[10px] text-muted-foreground">v{plugin.version}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{plugin.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-muted-foreground capitalize">{plugin.category}</span>
                  <span className="text-[9px] text-muted-foreground">by {plugin.author}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  enabled={plugin.installed}
                  onToggle={() => { store.togglePlugin(plugin.id); showToast(`"${plugin.name}" ${plugin.installed ? 'uninstalled' : 'installed'}`); logAdminAction('plugin_toggle', `${plugin.name}: ${plugin.installed ? 'uninstalled' : 'installed'}`) }}
                  size="small"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-nova-gold" />
          Plugin Stats
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-nova-gold/10 text-center">
            <p className="text-lg font-bold text-nova-gold">{store.plugins.filter(p => p.installed).length}</p>
            <p className="text-[10px] text-muted-foreground">Installed</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 text-center">
            <p className="text-lg font-bold text-muted-foreground">{store.plugins.filter(p => !p.installed).length}</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAIConfig = () => (
    <div className="space-y-4">
      {/* Reasoning Depth */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-nova-gold" />
          Reasoning Depth
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {(['quick', 'balanced', 'deep'] as const).map(depth => (
            <motion.button
              key={depth}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { store.setReasoningDepth(depth); showToast(`Reasoning: ${depth}`); logAdminAction('ai_config', `Reasoning depth: ${depth}`) }}
              className={`p-3 rounded-lg text-center transition-colors ${
                store.reasoningDepth === depth
                  ? 'gold-gradient-bg text-background'
                  : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <p className="text-xs font-medium capitalize">{depth}</p>
              <p className="text-[10px] mt-0.5 opacity-70">
                {depth === 'quick' ? 'Fast responses' : depth === 'balanced' ? 'Best of both' : 'Maximum depth'}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Training Progress */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-nova-purple" />
          LLM Training Progress
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {store.llmTrainingStatus.map(lang => (
            <div key={lang.language}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground">{lang.language}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${
                    lang.status === 'complete' ? 'text-emerald-500' : lang.status === 'learning' ? 'text-nova-gold' : 'text-muted-foreground'
                  }`}>
                    {lang.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{lang.progress}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                <motion.div
                  animate={{ width: `${lang.progress}%` }}
                  className={`h-full rounded-full ${
                    lang.status === 'complete' ? 'bg-emerald-500' : lang.status === 'learning' ? 'progress-gold' : 'bg-secondary'
                  }`}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 rounded-lg bg-secondary/20 text-center">
          <p className="text-xs text-muted-foreground">
            Overall: {Math.round(store.llmTrainingStatus.reduce((a, l) => a + l.progress, 0) / store.llmTrainingStatus.length)}% complete
          </p>
        </div>
      </div>

      {/* AI Feature Toggles */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-nova-gold" />
          AI Features
        </h4>
        <div className="space-y-3">
          {[
            { label: 'Adaptive Learning', desc: 'Learn from your usage patterns', enabled: store.adaptiveLearningEnabled, setter: store.setAdaptiveLearningEnabled },
            { label: 'Smart Suggestions', desc: 'AI-generated suggestions', enabled: store.smartSuggestionsEnabled, setter: store.setSmartSuggestionsEnabled },
            { label: 'Auto-Learn from Chat', desc: 'Extract knowledge from conversations', enabled: store.autoLearnFromChat, setter: store.setAutoLearnFromChat },
            { label: 'Confidence Scores', desc: 'Display confidence badges on AI responses', enabled: store.showConfidence, setter: store.setShowConfidence },
          ].map(feature => (
            <div key={feature.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-3">
                <Brain className={`w-4 h-4 ${feature.enabled ? 'text-nova-gold' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm text-foreground">{feature.label}</p>
                  <p className="text-[11px] text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={feature.enabled}
                onToggle={() => { feature.setter(!feature.enabled); showToast(`${feature.label} ${!feature.enabled ? 'enabled' : 'disabled'}`); logAdminAction('ai_config', `${feature.label}: ${!feature.enabled}`) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-4">
      {/* Encryption Status */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-nova-gold" />
          Encryption Status
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
            <div className="flex items-center gap-3">
              {store.encryption ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-sm text-foreground">End-to-End Encryption</p>
                <p className="text-[11px] text-muted-foreground">
                  {store.encryption ? 'All data encrypted at rest' : 'Data is not encrypted'}
                </p>
              </div>
            </div>
            <ToggleSwitch
              enabled={store.encryption}
              onToggle={() => { store.setEncryption(!store.encryption); showToast(`Encryption ${!store.encryption ? 'enabled' : 'disabled'}`); logAdminAction('security', `Encryption: ${!store.encryption}`) }}
            />
          </div>
          <div className="p-3 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Vault Status</span>
              <span className={`text-xs ${store.vaultLocked ? 'text-emerald-500' : 'text-amber-500'}`}>
                {store.vaultLocked ? 'Locked' : 'Unlocked'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Master Password</span>
              <span className="text-xs text-foreground">{store.masterPasswordHash ? 'Set' : 'Not set'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Master Password */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-nova-gold" />
          Vault Master Password
        </h4>
        {!showChangePassword ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowChangePassword(true)}
            className="w-full py-2.5 rounded-lg border border-nova-gold/30 text-nova-gold text-sm font-medium hover:bg-nova-gold/5 transition-colors flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            Change Master Password
          </motion.button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold pr-10"
                  placeholder="Enter new password..."
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                placeholder="Confirm new password..."
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Passwords do not match
              </p>
            )}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleChangePassword}
                disabled={!newPassword || newPassword !== confirmPassword}
                className="flex-1 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50"
              >
                Update Password
              </motion.button>
              <button
                onClick={() => { setShowChangePassword(false); setNewPassword(''); setConfirmPassword('') }}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password Policy */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-nova-gold" />
          Password Policy
        </h4>
        <div className="space-y-3">
          {[
            { label: 'Minimum Length', value: '8 characters', enabled: true },
            { label: 'Require Uppercase', value: 'A-Z', enabled: true },
            { label: 'Require Numbers', value: '0-9', enabled: true },
            { label: 'Require Symbols', value: '!@#$%', enabled: false },
          ].map(policy => (
            <div key={policy.label} className="flex items-center justify-between p-2 rounded-lg bg-secondary/10">
              <div>
                <p className="text-xs text-foreground">{policy.label}</p>
                <p className="text-[10px] text-muted-foreground">{policy.value}</p>
              </div>
              <ToggleSwitch enabled={policy.enabled} onToggle={() => showToast('Policy updated')} size="small" />
            </div>
          ))}
        </div>
      </div>

      {/* 2FA */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${twoFactorEnabled ? 'bg-emerald-500/10' : 'bg-secondary/30'}`}>
              <Shield className={`w-5 h-5 ${twoFactorEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-[11px] text-muted-foreground">Add an extra layer of security</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={twoFactorEnabled}
            onToggle={() => { setTwoFactorEnabled(!twoFactorEnabled); showToast(`2FA ${!twoFactorEnabled ? 'enabled' : 'disabled'}`); logAdminAction('security', `2FA: ${!twoFactorEnabled}`) }}
          />
        </div>
      </div>

      {/* Session Timeout */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-foreground">Session Timeout</p>
            <p className="text-[11px] text-muted-foreground">Auto-lock after inactivity</p>
          </div>
          <span className="text-sm font-semibold text-nova-gold">{sessionTimeout} min</span>
        </div>
        <input
          type="range"
          min={5}
          max={120}
          step={5}
          value={sessionTimeout}
          onChange={(e) => setSessionTimeout(Number(e.target.value))}
          className="w-full accent-nova-gold"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">5 min</span>
          <span className="text-[10px] text-muted-foreground">120 min</span>
        </div>
      </div>

      {/* Last Backup */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-nova-gold/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-nova-gold" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Last Backup</p>
            <p className="text-[11px] text-muted-foreground">
              {store.backupRecords.length > 0 ? store.backupRecords[0].date : 'No backups yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBackup = () => (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-nova-gold" />
            Backup Management
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            store.backupRecords.length > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
          }`}>
            {store.backupRecords.length > 0 ? 'Up to date' : 'No backups yet'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-secondary/20">
            <p className="text-xs text-muted-foreground">Total Backups</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{store.backupRecords.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/20">
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{store.backupRecords.length > 0 ? store.backupRecords[0].date : 'Never'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={async () => {
              showToast('Creating backup...')
              try {
                const res = await authFetch('/api/backup/create', {
                  method: 'POST',
                  body: JSON.stringify({ includeConversations: true, includeKnowledge: true, includeTasks: true, includeNotes: true, includeSettings: true }),
                })
                if (res.ok) {
                  const data = await res.json()
                  store.addBackupRecord({
                    id: `backup-${Date.now()}`,
                    date: new Date().toLocaleString(),
                    size: data.size || 'Unknown',
                    encrypted: true,
                    type: 'manual',
                  })
                  showToast('Backup created successfully')
                  logAdminAction('backup_create', `Backup created: ${data.size}`)

                  // Download
                  const json = JSON.stringify(data, null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `nova-backup-${new Date().toISOString().split('T')[0]}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              } catch {
                showToast('Backup creation failed')
              }
            }}
            className="py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Create Backup
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (!file) return
                showToast('Restoring backup...')
                try {
                  const text = await file.text()
                  const backupData = JSON.parse(text)
                  const res = await authFetch('/api/backup/restore', {
                    method: 'POST',
                    body: JSON.stringify(backupData),
                  })
                  if (res.ok) {
                    showToast('Backup restored successfully')
                    logAdminAction('backup_restore', 'Backup restored from file')
                  }
                } catch {
                  showToast('Restore failed')
                }
              }
              input.click()
            }}
            className="py-2.5 rounded-lg border border-nova-gold/30 text-nova-gold text-sm font-medium hover:bg-nova-gold/5 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Restore
          </motion.button>
        </div>
      </div>

      {/* Backup History */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-nova-gold" />
          Backup History
        </h4>
        {store.backupRecords.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {store.backupRecords.map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-nova-gold" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{backup.date}</p>
                    <p className="text-[10px] text-muted-foreground">{backup.size} · {backup.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {backup.encrypted && <Lock className="w-3 h-3 text-emerald-500" />}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Encrypted</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No backup history yet</p>
        )}
      </div>
    </div>
  )

  const renderFiles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code className="w-4 h-4 text-nova-gold" />
          Source Code Files
        </h4>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowNewFileDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New File
        </motion.button>
      </div>

      {/* AI Chat Box for Code Modifications */}
      {fileViewing && (
        <div className="glass-card p-4 border-nova-gold/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-nova-gold" />
            <span className="text-sm font-medium text-foreground">Ask AI to modify this file</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={fileChatPrompt}
              onChange={(e) => setFileChatPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFileChat() }}}
              placeholder={`Describe what you want to change in ${fileViewing}...`}
              className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFileChat}
              disabled={fileChatLoading || !fileChatPrompt.trim()}
              className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50"
            >
              {fileChatLoading ? 'Thinking...' : 'Ask AI'}
            </motion.button>
          </div>
          {fileChatResponse && (
            <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-nova-gold">AI Response</span>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={applyFileChatChanges}
                    className="px-2 py-1 rounded text-[10px] gold-gradient-bg text-background font-medium"
                  >
                    Apply Changes
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setFileChatResponse(null); setFileChatPrompt('') }}
                    className="px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border"
                  >
                    Discard
                  </motion.button>
                </div>
              </div>
              <pre className="text-xs text-muted-foreground max-h-60 overflow-auto whitespace-pre-wrap">{fileChatResponse}</pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File Tree */}
        <div className="glass-card p-4 lg:col-span-1">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            {filesPath.split('/').filter(Boolean).map((segment, i, arr) => {
              const path = '/' + arr.slice(0, i + 1).join('/')
              return (
                <span key={path} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                  <button
                    onClick={() => { setFileViewing(null); setFileContent(null); fetchFiles(path) }}
                    className={`text-xs hover:text-nova-gold transition-colors ${
                      i === arr.length - 1 ? 'text-nova-gold font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {segment}
                  </button>
                </span>
              )
            })}
          </div>

          {filesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-6 rounded bg-secondary/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
              {filesPath !== '/src' && filesPath !== '/' && (
                <button
                  onClick={() => {
                    const parentPath = '/' + filesPath.split('/').filter(Boolean).slice(0, -1).join('/')
                    setFileViewing(null)
                    setFileContent(null)
                    fetchFiles(parentPath || '/src')
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs text-muted-foreground hover:bg-secondary/30 flex items-center gap-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  .. (parent directory)
                </button>
              )}
              {filesList.map(file => (
                <button
                  key={file.name}
                  onClick={() => {
                    const fullPath = filesPath === '/' ? `/${file.name}` : `${filesPath}/${file.name}`
                    if (file.type === 'dir') {
                      setFileViewing(null)
                      setFileContent(null)
                      fetchFiles(fullPath)
                    } else {
                      fetchFileContent(fullPath)
                    }
                  }}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                    fileViewing === `${filesPath}/${file.name}`
                      ? 'bg-nova-gold/10 text-nova-gold border border-nova-gold/20'
                      : 'text-foreground hover:bg-secondary/30'
                  }`}
                >
                  {file.type === 'dir' ? (
                    <Layers className="w-3.5 h-3.5 text-nova-gold/60 flex-shrink-0" />
                  ) : (
                    <Code className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
              {filesList.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Empty directory</p>
              )}
            </div>
          )}
        </div>

        {/* File Content Viewer/Editor */}
        <div className="glass-card p-4 lg:col-span-2">
          {fileViewing ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Code className="w-4 h-4 text-nova-gold flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{fileViewing}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!fileEditing ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFileEditing(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-nova-gold border border-nova-gold/30 hover:bg-nova-gold/10"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={saveFileContent}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setFileEditing(false); setFileEditContent(fileContent || '') }}
                        className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border hover:text-foreground"
                      >
                        Cancel
                      </motion.button>
                    </>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (!confirm('Delete this file?')) return
                      try {
                        const res = await authFetch(`/api/admin/files?path=${encodeURIComponent(fileViewing)}`, { method: 'DELETE' })
                        if (res.ok) {
                          setFileViewing(null)
                          setFileContent(null)
                          fetchFiles(filesPath)
                          showToast('File deleted')
                          logAdminAction('file_delete', fileViewing)
                        } else {
                          const data = await res.json()
                          showToast(data.error || 'Failed to delete')
                        }
                      } catch {
                        showToast('Failed to delete file')
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
              {fileEditing ? (
                <textarea
                  value={fileEditContent}
                  onChange={(e) => setFileEditContent(e.target.value)}
                  className="w-full h-[500px] bg-[#0d1117] border border-border rounded-lg p-3 text-xs font-mono text-gray-300 outline-none resize-none focus-gold"
                  spellCheck={false}
                />
              ) : (
                <pre className="w-full h-[500px] overflow-auto bg-[#0d1117] border border-border rounded-lg p-3 text-xs font-mono text-gray-300 whitespace-pre">
                  {fileContent || 'Loading...'}
                </pre>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <Code className="w-12 h-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a file to view its contents</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Browse the file tree on the left</p>
            </div>
          )}
        </div>
      </div>

      {/* New File Dialog */}
      <AnimatePresence>
        {showNewFileDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNewFileDialog(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">Create New File</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">File Path</label>
                  <input
                    type="text"
                    value={fileNewName}
                    onChange={(e) => setFileNewName(e.target.value)}
                    placeholder={`${filesPath}/new-file.ts`}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowNewFileDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30">
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      if (!fileNewName.trim()) return
                      const fullPath = fileNewName.startsWith('/') ? fileNewName : `${filesPath}/${fileNewName}`
                      try {
                        const res = await authFetch('/api/admin/files', {
                          method: 'POST',
                          body: JSON.stringify({ path: fullPath, content: '' }),
                        })
                        if (res.ok) {
                          setShowNewFileDialog(false)
                          setFileNewName('')
                          fetchFiles(filesPath)
                          fetchFileContent(fullPath)
                          showToast('File created')
                          logAdminAction('file_create', fullPath)
                        } else {
                          const data = await res.json()
                          showToast(data.error || 'Failed to create file')
                        }
                      } catch {
                        showToast('Failed to create file')
                      }
                    }}
                    className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium"
                  >
                    Create
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const renderPerformance = () => (
    <div className="space-y-4">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="CPU Usage" value={`${systemStats?.cpu ?? 0}%`} icon={Cpu} color="gold" />
        <StatCard label="RAM Usage" value={`${systemStats?.memory?.percentage ?? 0}%`} icon={MemoryStick} color="purple" />
        <StatCard label="Storage" value={`${systemStats?.storage?.percentage ?? 0}%`} icon={HardDrive} color="emerald" />
        <StatCard label="Uptime" value={systemStats ? formatUptime(systemStats.uptime) : '...'} icon={Clock} color="gold" />
      </div>

      {/* CPU History Chart */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-nova-gold" />
          CPU & Memory History
        </h4>
        <div className="h-48 relative">
          {perfHistory.length > 1 ? (
            <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
              {/* CPU line */}
              <polyline
                fill="none"
                stroke="#d4a574"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={perfHistory.map((p, i) => `${(i / (perfHistory.length - 1)) * 200},${100 - p.cpu}`).join(' ')}
              />
              {/* Memory line */}
              <polyline
                fill="none"
                stroke="#7c3aed"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={perfHistory.map((p, i) => `${(i / (perfHistory.length - 1)) * 200},${100 - p.mem}`).join(' ')}
              />
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(y => (
                <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(212,165,116,0.1)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">Collecting data...</p>
            </div>
          )}
          <div className="absolute top-0 right-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-nova-gold" />
              <span className="text-[9px] text-muted-foreground">CPU</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-nova-purple" />
              <span className="text-[9px] text-muted-foreground">RAM</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Details */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-nova-gold" />
          System Details
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Platform', value: systemStats?.platform || '...', icon: Server },
            { label: 'Node Version', value: systemStats?.nodeVersion || '...', icon: Settings },
            { label: 'CPU Cores', value: systemStats?.cpuCores?.toString() || '...', icon: Cpu },
            { label: 'Total RAM', value: systemStats ? formatBytes(systemStats.memory.total) : '...', icon: MemoryStick },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20">
              <item.icon className="w-4 h-4 text-nova-gold flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-xs font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource Alerts */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-nova-gold" />
          Resource Alerts
        </h4>
        <div className="space-y-2">
          {(systemStats?.cpu ?? 0) > 80 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-red-500">CPU usage is above 80%</span>
            </div>
          )}
          {(systemStats?.memory?.percentage ?? 0) > 85 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-red-500">Memory usage is above 85%</span>
            </div>
          )}
          {(systemStats?.storage?.percentage ?? 0) > 90 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-amber-500">Storage usage is above 90%</span>
            </div>
          )}
          {(systemStats?.cpu ?? 0) <= 80 && (systemStats?.memory?.percentage ?? 0) <= 85 && (systemStats?.storage?.percentage ?? 0) <= 90 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-500">All resources within normal range</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ─── AI Rules Tab ────────────────────────────────────────────────────
  const renderAIRules = () => (
    <div className="space-y-4">
      {/* Create new rule */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-nova-gold" />
          Create New Rule
        </h4>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Rule title (e.g., No Sexual Content)"
              value={newRuleTitle}
              onChange={(e) => setNewRuleTitle(e.target.value)}
              className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
            />
            <select
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value)}
              className="bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
            >
              <option value="ethics">Ethics</option>
              <option value="limitations">Limitations</option>
              <option value="behavior">Behavior</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <textarea
            placeholder="Rule description - what the AI must or must not do..."
            value={newRuleDescription}
            onChange={(e) => setNewRuleDescription(e.target.value)}
            rows={3}
            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold resize-none"
          />
          <div className="flex justify-end">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={createAiRule}
              disabled={!newRuleTitle.trim() || !newRuleDescription.trim()}
              className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Rule
            </motion.button>
          </div>
        </div>
      </div>

      {/* Auto-generate rule from prompt */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-nova-gold" />
          Auto-Generate Rule from Description
        </h4>
        <p className="text-xs text-muted-foreground mb-3">
          Describe what rule you want in plain English, and AI will generate a proper rule for you.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g., The AI should never discuss politics with free users"
            value={autoRulePrompt}
            onChange={(e) => setAutoRulePrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') autoGenerateRule() }}
            className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={autoGenerateRule}
            disabled={!autoRulePrompt.trim() || autoRuleLoading}
            className="px-4 py-2 rounded-lg bg-nova-purple/20 border border-nova-purple/30 text-nova-purple-light text-sm font-medium hover:bg-nova-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {autoRuleLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Generate
          </motion.button>
        </div>
      </div>

      {/* Rules list */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-nova-gold" />
            AI Rules
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
              {aiRules.filter(r => r.enabled).length}/{aiRules.length} active
            </span>
          </h4>
        </div>

        {rulesLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 text-nova-gold animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading AI rules...</p>
          </div>
        ) : aiRules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No AI rules configured</p>
        ) : (
          <div className="space-y-2">
            {aiRules.map(rule => (
              <div
                key={rule.id}
                className={`p-3 rounded-lg border transition-all ${
                  rule.enabled
                    ? 'bg-secondary/20 border-border'
                    : 'bg-secondary/10 border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Enable/Disable toggle */}
                  <ToggleSwitch
                    enabled={rule.enabled}
                    onToggle={() => toggleAiRule(rule.id, rule.enabled)}
                    size="small"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{rule.title}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        rule.category === 'ethics' ? 'bg-red-500/10 text-red-400' :
                        rule.category === 'limitations' ? 'bg-amber-500/10 text-amber-400' :
                        rule.category === 'behavior' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-nova-gold/10 text-nova-gold'
                      }`}>
                        {rule.category}
                      </span>
                      {rule.isSystem && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-nova-purple/10 text-nova-purple">
                          System
                        </span>
                      )}
                      {rule.source === 'auto-generated' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          Auto
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rule.description}</p>
                  </div>

                  {/* Delete button (not for system rules) */}
                  {!rule.isSystem && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteAiRule(rule.id)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ─── Action Approvals Tab ───────────────────────────────────────────
  const renderActionApprovals = () => (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-nova-gold" />
            Pending AI Action Approvals
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
              {actionApprovals.filter(a => a.status === 'pending').length} pending
            </span>
          </h4>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchActionApprovals}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>

        {approvalsLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 text-nova-gold animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading approvals...</p>
          </div>
        ) : actionApprovals.length === 0 ? (
          <div className="text-center py-8">
            <Check className="w-10 h-10 text-emerald-500/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No pending action approvals</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">When NOVA requests to modify the database or source code, it will appear here for your approval.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actionApprovals.map(approval => (
              <div
                key={approval.id}
                className="p-3 rounded-lg bg-secondary/20 border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    approval.actionType.startsWith('db_') ? 'bg-blue-500/10' :
                    approval.actionType.startsWith('code_') ? 'bg-emerald-500/10' :
                    'bg-nova-gold/10'
                  }`}>
                    {approval.actionType.startsWith('db_') ? <Database className="w-4 h-4 text-blue-400" /> :
                     approval.actionType.startsWith('code_') ? <Code className="w-4 h-4 text-emerald-400" /> :
                     <Settings className="w-4 h-4 text-nova-gold" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{approval.description}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/50 text-muted-foreground uppercase">
                        {approval.actionType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Target: {approval.target}</p>
                    {approval.payload && (
                      <pre className="mt-2 p-2 rounded bg-[#0d1117] text-[11px] text-gray-300 overflow-x-auto max-h-32">
                        {approval.payload}
                      </pre>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      Requested: {new Date(approval.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-border">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => reviewAction(approval.id, 'rejected', 'Rejected by admin')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Reject
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => reviewAction(approval.id, 'approved', 'Approved by admin')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium gold-gradient-bg text-background"
                  >
                    Approve
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'features': return renderFeatureFlags()
      case 'ai-rules': return renderAIRules()
      case 'users': return renderUsers()
      case 'tiers': return renderTiers()
      case 'api-keys': return renderApiKeys()
      case 'action-approvals': return renderActionApprovals()
      case 'logs': return renderLogs()
      case 'database': return renderDatabase()
      case 'integrations': return renderIntegrations()
      case 'plugins': return renderPlugins()
      case 'ai-config': return renderAIConfig()
      case 'security': return renderSecurity()
      case 'backup': return renderBackup()
      case 'files': return renderFiles()
      case 'performance': return renderPerformance()
      default: return renderOverview()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Admin role check */}
      {!isAdmin && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground">Access Denied</p>
            <p className="text-sm text-muted-foreground">You need admin privileges to access this panel.</p>
          </div>
        </div>
      )}
      {isAdmin && (
      <>
      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} onClose={hideToast} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-52 border-r border-border p-3 space-y-1 overflow-y-auto hidden md:block flex-shrink-0">
          <div className="mb-4 px-3">
            <h3 className="text-sm font-bold gold-gradient-text">Admin Panel</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">System management</p>
          </div>
          {ADMIN_TABS.map(tab => {
            const TabIcon = tab.icon
            return (
              <motion.button
                key={tab.id}
                whileHover={{ x: 2, backgroundColor: 'rgba(212,165,116,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-nova-gold/10 text-nova-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">{tab.label}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex overflow-x-auto gap-1 p-3 border-b border-border flex-shrink-0 w-full">
          {ADMIN_TABS.map(tab => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-nova-gold/10 text-nova-gold' : 'text-muted-foreground'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Section Header */}
            <div className="mb-4 flex items-center gap-3">
              {(() => {
                const tab = ADMIN_TABS.find(t => t.id === activeTab)
                if (!tab) return null
                const TabIcon = tab.icon
                return (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-nova-gold/10 flex items-center justify-center">
                      <TabIcon className="w-4 h-4 text-nova-gold" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{tab.label}</h2>
                    </div>
                  </>
                )
              })()}
            </div>

            {renderContent()}
          </motion.div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
