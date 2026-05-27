'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Brain, Sparkles, MessageSquare, Wind, Globe, ImageIcon,
  Mic, Smile, Search, Server, ChevronDown, ChevronRight, Key,
  Plus, Trash2, Check, X, ExternalLink, Shield, Activity,
  RefreshCw, Eye, EyeOff, ToggleLeft, ToggleRight, Settings2,
  Loader2, AlertCircle, Crown, Lock
} from 'lucide-react'
import { AI_PROVIDERS, getProviderById, canUseProvider, type AIProvider } from '@/lib/ai-providers'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Brain, Sparkles, MessageSquare, Wind, Globe, ImageIcon,
  Mic, Smile, Search, Server, Shield,
}

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  chat: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  multimodal: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  image: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  audio: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  embedding: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-emerald-500/15 text-emerald-400',
  basic: 'bg-blue-500/15 text-blue-400',
  pro: 'bg-nova-gold/15 text-nova-gold',
  enterprise: 'bg-purple-500/15 text-purple-400',
  unlimited: 'bg-nova-gold/15 text-nova-gold',
}

interface UserApiKey {
  id: string
  provider: string
  apiKeyMasked: string
  apiSecretMasked: string | null
  baseUrl: string | null
  label: string | null
  isActive: boolean
  lastUsed: string | null
  createdAt: string
  updatedAt: string
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

interface UsageStats {
  today: Record<string, { count: number; tokensUsed: number; cost: number; providers: Record<string, number> }>
  providerUsage: Record<string, { count: number; tokensUsed: number; cost: number; actions: Record<string, number> }>
  tier: string
  limits: { maxChatsPerDay: number; maxImageGenPerDay: number; maxWebSearchPerDay: number; maxCodeExecPerDay: number } | null
  totalTokensUsed: number
  totalCost: number
}

export function AIProvidersView() {
  const { authFetch, isAdmin: isAdminRole } = useAuth()
  const [userApiKeys, setUserApiKeys] = useState<UserApiKey[]>([])
  const [globalApiKeys, setGlobalApiKeys] = useState<GlobalApiKey[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('providers')
  const [loading, setLoading] = useState(true)
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({})

  // Add key dialog
  const [addKeyOpen, setAddKeyOpen] = useState(false)
  const [addKeyProvider, setAddKeyProvider] = useState<string>('')
  const [addKeyForm, setAddKeyForm] = useState({ apiKey: '', apiSecret: '', baseUrl: '', label: '' })
  const [addKeyLoading, setAddKeyLoading] = useState(false)

  // Add global key dialog
  const [addGlobalKeyOpen, setAddGlobalKeyOpen] = useState(false)
  const [addGlobalKeyForm, setAddGlobalKeyForm] = useState({ provider: '', apiKey: '', apiSecret: '', baseUrl: '', minTier: 'free' })
  const [addGlobalKeyLoading, setAddGlobalKeyLoading] = useState(false)

  // Show/hide key values
  const [showKeyIds, setShowKeyIds] = useState<Set<string>>(new Set())

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [keysRes, usageRes] = await Promise.all([
        authFetch('/api/user/api-keys'),
        authFetch('/api/user/usage'),
      ])

      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setUserApiKeys(keysData.apiKeys || [])
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsageStats(usageData)
        setIsAdmin(usageData.tier === 'admin' || false)
      }

      // Try to fetch global keys (admin only)
      try {
        const globalRes = await authFetch('/api/admin/global-api-keys')
        if (globalRes.ok) {
          const globalData = await globalRes.json()
          setGlobalApiKeys(globalData.globalApiKeys || [])
          setIsAdmin(true)
        }
      } catch {
        // Not admin, that's fine
      }
    } catch (err) {
      console.error('Failed to fetch provider data:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Add user API key
  const handleAddKey = async () => {
    if (!addKeyProvider || !addKeyForm.apiKey) return
    setAddKeyLoading(true)
    try {
      const provider = getProviderById(addKeyProvider)
      const res = await authFetch('/api/user/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider: addKeyProvider,
          apiKey: addKeyForm.apiKey,
          apiSecret: addKeyForm.apiSecret || undefined,
          baseUrl: addKeyForm.baseUrl || provider?.defaultBaseUrl || '',
          label: addKeyForm.label || undefined,
        }),
      })
      if (res.ok) {
        setAddKeyOpen(false)
        setAddKeyForm({ apiKey: '', apiSecret: '', baseUrl: '', label: '' })
        setAddKeyProvider('')
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add API key')
      }
    } catch {
      alert('Failed to add API key')
    } finally {
      setAddKeyLoading(false)
    }
  }

  // Add global API key
  const handleAddGlobalKey = async () => {
    if (!addGlobalKeyForm.provider || !addGlobalKeyForm.apiKey) return
    setAddGlobalKeyLoading(true)
    try {
      const res = await authFetch('/api/admin/global-api-keys', {
        method: 'POST',
        body: JSON.stringify(addGlobalKeyForm),
      })
      if (res.ok) {
        setAddGlobalKeyOpen(false)
        setAddGlobalKeyForm({ provider: '', apiKey: '', apiSecret: '', baseUrl: '', minTier: 'free' })
        await fetchData()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add global API key')
      }
    } catch {
      alert('Failed to add global API key')
    } finally {
      setAddGlobalKeyLoading(false)
    }
  }

  // Delete user API key
  const handleDeleteKey = async (id: string) => {
    try {
      const res = await authFetch(`/api/user/api-keys/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      alert('Failed to delete API key')
    }
  }

  // Toggle key active state
  const handleToggleKey = async (id: string, isActive: boolean) => {
    try {
      const res = await authFetch(`/api/user/api-keys/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      alert('Failed to update API key')
    }
  }

  // Delete global API key
  const handleDeleteGlobalKey = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/global-api-keys/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      alert('Failed to delete global API key')
    }
  }

  // Toggle global key active state
  const handleToggleGlobalKey = async (id: string, isActive: boolean) => {
    try {
      const res = await authFetch(`/api/admin/global-api-keys/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      alert('Failed to update global API key')
    }
  }

  // Test provider connection
  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId)
    setTestResult(prev => ({ ...prev, [providerId]: { success: false, message: 'Testing...' } }))
    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello, this is a test. Reply with just "OK".',
          provider: providerId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.response) {
        setTestResult(prev => ({
          ...prev,
          [providerId]: { success: true, message: `Connected via ${data.keySource} key. Model: ${data.model}` }
        }))
      } else {
        setTestResult(prev => ({
          ...prev,
          [providerId]: { success: false, message: data.error || 'Connection failed' }
        }))
      }
    } catch (err) {
      setTestResult(prev => ({
        ...prev,
        [providerId]: { success: false, message: 'Network error' }
      }))
    } finally {
      setTestingProvider(null)
    }
  }

  // Get provider status
  const getProviderStatus = (providerId: string): { connected: boolean; source: string; keyId?: string } => {
    const userKey = userApiKeys.find(k => k.provider === providerId && k.isActive)
    if (userKey) return { connected: true, source: 'Your key', keyId: userKey.id }

    const globalKey = globalApiKeys.find(k => k.provider === providerId && k.isActive)
    if (globalKey) return { connected: true, source: 'Global key', keyId: globalKey.id }

    return { connected: false, source: 'Not connected' }
  }

  // Get user tier
  const userTier = usageStats?.tier || 'free'

  // Group providers by category
  const categories = ['chat', 'multimodal', 'image', 'audio', 'embedding']

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-nova-gold animate-spin" />
          <p className="text-sm text-muted-foreground">Loading AI providers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-nova-gold" />
              AI Providers
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your AI API keys and connections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={TIER_COLORS[userTier] || ''}>
              <Crown className="w-3 h-3 mr-1" />
              {userTier.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 lg:px-6 pt-3 flex-shrink-0">
            <TabsList className="bg-secondary/30">
              <TabsTrigger value="providers" className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Providers
              </TabsTrigger>
              <TabsTrigger value="my-keys" className="gap-1.5">
                <Key className="w-3.5 h-3.5" />
                My Keys ({userApiKeys.length})
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Usage
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Admin
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Providers Tab */}
          <TabsContent value="providers" className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 mt-0">
            <div className="space-y-6">
              {categories.map((category) => {
                const providers = AI_PROVIDERS.filter(p => p.category === category)
                if (providers.length === 0) return null

                const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.chat
                const catLabels: Record<string, string> = {
                  chat: 'Chat Models',
                  multimodal: 'Multimodal',
                  image: 'Image Generation',
                  audio: 'Audio & Voice',
                  embedding: 'Embeddings',
                }

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={`${catColor.bg} ${catColor.text} ${catColor.border} text-xs`}>
                        {catLabels[category] || category}
                      </Badge>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {providers.map((provider) => {
                        const Icon = ICON_MAP[provider.icon] || Zap
                        const status = getProviderStatus(provider.id)
                        const isExpanded = expandedProvider === provider.id
                        const hasAccess = canUseProvider(userTier, provider)

                        return (
                          <motion.div
                            key={provider.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card className={`overflow-hidden transition-all duration-200 ${
                              status.connected ? 'border-emerald-500/30' : 'border-border'
                            } ${!hasAccess ? 'opacity-60' : ''}`}>
                              {/* Provider Header */}
                              <button
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                className="w-full p-4 text-left hover:bg-secondary/20 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    status.connected
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-secondary/50 text-muted-foreground'
                                  }`}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-semibold text-foreground truncate">{provider.name}</h3>
                                      {status.connected ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] px-1.5 py-0">
                                          <Check className="w-2.5 h-2.5 mr-0.5" />
                                          {status.source}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                          Not connected
                                        </Badge>
                                      )}
                                      {!hasAccess && (
                                        <Badge className="bg-red-500/15 text-red-400 text-[10px] px-1.5 py-0">
                                          <Lock className="w-2.5 h-2.5 mr-0.5" />
                                          {provider.minTier}+
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{provider.description}</p>
                                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                      {provider.supportedModels.slice(0, 3).map(m => (
                                        <span key={m.id} className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] ${
                                          TIER_COLORS[m.tier] || 'bg-secondary text-muted-foreground'
                                        }`}>
                                          {m.name}
                                        </span>
                                      ))}
                                      {provider.supportedModels.length > 3 && (
                                        <span className="text-[9px] text-muted-foreground">
                                          +{provider.supportedModels.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  </motion.div>
                                </div>
                              </button>

                              {/* Expanded Content */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                                      {/* All models */}
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Available Models</p>
                                        <div className="space-y-1">
                                          {provider.supportedModels.map(m => {
                                            const modelAccessible = canUseProvider(userTier, { minTier: m.tier } as never)
                                            return (
                                              <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded bg-secondary/20">
                                                <span className="text-xs text-foreground">{m.name}</span>
                                                <div className="flex items-center gap-1.5">
                                                  <span className={`text-[9px] px-1.5 py-0 rounded ${TIER_COLORS[m.tier]}`}>
                                                    {m.tier}
                                                  </span>
                                                  {modelAccessible ? (
                                                    <Check className="w-3 h-3 text-emerald-400" />
                                                  ) : (
                                                    <Lock className="w-3 h-3 text-red-400" />
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-2">
                                        {status.connected ? (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleTestConnection(provider.id)}
                                              disabled={testingProvider === provider.id}
                                              className="gap-1.5 text-xs"
                                            >
                                              {testingProvider === provider.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                              ) : (
                                                <Activity className="w-3 h-3" />
                                              )}
                                              Test
                                            </Button>
                                            {status.keyId && (
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                                                    <Trash2 className="w-3 h-3" />
                                                    Remove Key
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove API Key</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to remove your API key for {provider.name}?
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => status.keyId && handleDeleteKey(status.keyId)}>
                                                      Remove
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                          </>
                                        ) : (
                                          <Dialog open={addKeyOpen && addKeyProvider === provider.id} onOpenChange={(open) => {
                                            setAddKeyOpen(open)
                                            if (open) setAddKeyProvider(provider.id)
                                          }}>
                                            <DialogTrigger asChild>
                                              <Button size="sm" className="gap-1.5 text-xs">
                                                <Plus className="w-3 h-3" />
                                                Add Key
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Add API Key - {provider.name}</DialogTitle>
                                                <DialogDescription>
                                                  Enter your {provider.name} {provider.apiKeyLabel.toLowerCase()}
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="space-y-3 py-2">
                                                <div>
                                                  <Label className="text-xs">{provider.apiKeyLabel}</Label>
                                                  <Input
                                                    type="password"
                                                    placeholder={`Enter your ${provider.apiKeyLabel.toLowerCase()}`}
                                                    value={addKeyForm.apiKey}
                                                    onChange={e => setAddKeyForm(p => ({ ...p, apiKey: e.target.value }))}
                                                  />
                                                </div>
                                                {provider.apiSecretLabel && (
                                                  <div>
                                                    <Label className="text-xs">{provider.apiSecretLabel}</Label>
                                                    <Input
                                                      type="password"
                                                      placeholder={`Enter ${provider.apiSecretLabel.toLowerCase()}`}
                                                      value={addKeyForm.apiSecret}
                                                      onChange={e => setAddKeyForm(p => ({ ...p, apiSecret: e.target.value }))}
                                                    />
                                                  </div>
                                                )}
                                                <div>
                                                  <Label className="text-xs">Base URL</Label>
                                                  <Input
                                                    placeholder={provider.defaultBaseUrl}
                                                    value={addKeyForm.baseUrl}
                                                    onChange={e => setAddKeyForm(p => ({ ...p, baseUrl: e.target.value }))}
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-xs">Label (optional)</Label>
                                                  <Input
                                                    placeholder="e.g. Work key, Personal key"
                                                    value={addKeyForm.label}
                                                    onChange={e => setAddKeyForm(p => ({ ...p, label: e.target.value }))}
                                                  />
                                                </div>
                                              </div>
                                              <DialogFooter>
                                                <Button variant="outline" onClick={() => setAddKeyOpen(false)}>Cancel</Button>
                                                <Button
                                                  onClick={handleAddKey}
                                                  disabled={!addKeyForm.apiKey || addKeyLoading}
                                                >
                                                  {addKeyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                                                  Add Key
                                                </Button>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>
                                        )}

                                        <a
                                          href={provider.website}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          Get Key
                                        </a>
                                      </div>

                                      {/* Test result */}
                                      {testResult[provider.id] && (
                                        <div className={`flex items-start gap-2 p-2 rounded text-xs ${
                                          testResult[provider.id].success
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'bg-red-500/10 text-red-400'
                                        }`}>
                                          {testResult[provider.id].success ? (
                                            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                          ) : (
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                          )}
                                          <span>{testResult[provider.id].message}</span>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* My Keys Tab */}
          <TabsContent value="my-keys" className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Your personal API keys. These take priority over global keys.
                </p>
                <Dialog open={addKeyOpen && addKeyProvider === 'custom'} onOpenChange={(open) => {
                  setAddKeyOpen(open)
                  if (open) setAddKeyProvider('openai')
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add API Key</DialogTitle>
                      <DialogDescription>Select a provider and enter your API key</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div>
                        <Label className="text-xs">Provider</Label>
                        <Select value={addKeyProvider} onValueChange={v => setAddKeyProvider(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_PROVIDERS.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {addKeyProvider && (() => {
                        const provider = getProviderById(addKeyProvider)
                        return provider ? (
                          <>
                            <div>
                              <Label className="text-xs">{provider.apiKeyLabel}</Label>
                              <Input
                                type="password"
                                placeholder={`Enter your ${provider.apiKeyLabel.toLowerCase()}`}
                                value={addKeyForm.apiKey}
                                onChange={e => setAddKeyForm(p => ({ ...p, apiKey: e.target.value }))}
                              />
                            </div>
                            {provider.apiSecretLabel && (
                              <div>
                                <Label className="text-xs">{provider.apiSecretLabel}</Label>
                                <Input
                                  type="password"
                                  placeholder={`Enter ${provider.apiSecretLabel.toLowerCase()}`}
                                  value={addKeyForm.apiSecret}
                                  onChange={e => setAddKeyForm(p => ({ ...p, apiSecret: e.target.value }))}
                                />
                              </div>
                            )}
                            <div>
                              <Label className="text-xs">Base URL</Label>
                              <Input
                                placeholder={provider.defaultBaseUrl}
                                value={addKeyForm.baseUrl}
                                onChange={e => setAddKeyForm(p => ({ ...p, baseUrl: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Label (optional)</Label>
                              <Input
                                placeholder="e.g. Work key, Personal key"
                                value={addKeyForm.label}
                                onChange={e => setAddKeyForm(p => ({ ...p, label: e.target.value }))}
                              />
                            </div>
                          </>
                        ) : null
                      })()}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddKeyOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddKey} disabled={!addKeyProvider || !addKeyForm.apiKey || addKeyLoading}>
                        {addKeyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                        Add Key
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {userApiKeys.length === 0 ? (
                <Card className="p-8 text-center">
                  <Key className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No API keys configured yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add your own API keys to connect to AI providers</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {userApiKeys.map(key => {
                    const provider = getProviderById(key.provider)
                    const Icon = provider ? ICON_MAP[provider.icon] || Key : Key
                    const isShown = showKeyIds.has(key.id)

                    return (
                      <Card key={key.id} className={`p-4 transition-all ${key.isActive ? 'border-emerald-500/20' : 'border-border opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            key.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary/50 text-muted-foreground'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{provider?.name || key.provider}</span>
                              {key.label && (
                                <Badge variant="outline" className="text-[10px]">{key.label}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground font-mono">
                                {isShown ? key.apiKeyMasked : key.apiKeyMasked}
                              </span>
                              {key.baseUrl && key.baseUrl !== provider?.defaultBaseUrl && (
                                <span className="text-[10px] text-muted-foreground">Custom URL</span>
                              )}
                              {key.lastUsed && (
                                <span className="text-[10px] text-muted-foreground">
                                  Last used {new Date(key.lastUsed).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleKey(key.id, key.isActive)}
                              className="gap-1 text-xs"
                            >
                              {key.isActive ? (
                                <ToggleRight className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowKeyIds(prev => {
                                const next = new Set(prev)
                                if (next.has(key.id)) next.delete(key.id)
                                else next.add(key.id)
                                return next
                              })}
                            >
                              {isShown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove your {provider?.name || key.provider} API key? You will need to re-add it to use this provider.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteKey(key.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 mt-0">
            <div className="space-y-4">
              {/* Today's usage summary */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-nova-gold" />
                  Today&apos;s Usage
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Chats', count: usageStats?.today?.chat?.count || 0, limit: usageStats?.limits?.maxChatsPerDay || '∞' },
                    { label: 'Image Gen', count: usageStats?.today?.image_gen?.count || 0, limit: usageStats?.limits?.maxImageGenPerDay || '∞' },
                    { label: 'Web Search', count: usageStats?.today?.web_search?.count || 0, limit: usageStats?.limits?.maxWebSearchPerDay || '∞' },
                    { label: 'Code Exec', count: usageStats?.today?.code_execute?.count || 0, limit: usageStats?.limits?.maxCodeExecPerDay || '∞' },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 rounded-lg bg-secondary/20">
                      <p className="text-lg font-bold text-foreground">{item.count}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground/60">of {item.limit}/day</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Total tokens: {(usageStats?.totalTokensUsed || 0).toLocaleString()}</span>
                  <span>Total cost: ${((usageStats?.totalCost || 0)).toFixed(4)}</span>
                </div>
              </Card>

              {/* Per-provider usage */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-nova-gold" />
                  Provider Usage (Last 7 Days)
                </h3>
                {usageStats?.providerUsage && Object.keys(usageStats.providerUsage).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(usageStats.providerUsage).map(([providerId, stats]) => {
                      const provider = getProviderById(providerId)
                      const Icon = provider ? ICON_MAP[provider.icon] || Key : Key
                      return (
                        <div key={providerId} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{provider?.name || providerId}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {Object.entries(stats.actions).map(([a, c]) => `${a}: ${c}`).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-foreground">{stats.count} requests</p>
                            <p className="text-[10px] text-muted-foreground">{stats.tokensUsed.toLocaleString()} tokens</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No usage data yet</p>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Admin Tab */}
          {isAdmin && (
            <TabsContent value="admin" className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-nova-gold" />
                      Global API Keys
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Set API keys available to all users based on their tier
                    </p>
                  </div>
                  <Dialog open={addGlobalKeyOpen} onOpenChange={setAddGlobalKeyOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        Add Global Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Global API Key</DialogTitle>
                        <DialogDescription>Set a global API key that users can access based on their tier</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div>
                          <Label className="text-xs">Provider</Label>
                          <Select value={addGlobalKeyForm.provider} onValueChange={v => setAddGlobalKeyForm(p => ({ ...p, provider: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {AI_PROVIDERS.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">API Key</Label>
                          <Input
                            type="password"
                            placeholder="Enter API key"
                            value={addGlobalKeyForm.apiKey}
                            onChange={e => setAddGlobalKeyForm(p => ({ ...p, apiKey: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Base URL (optional)</Label>
                          <Input
                            placeholder="Leave empty for default"
                            value={addGlobalKeyForm.baseUrl}
                            onChange={e => setAddGlobalKeyForm(p => ({ ...p, baseUrl: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Minimum Tier Required</Label>
                          <Select value={addGlobalKeyForm.minTier} onValueChange={v => setAddGlobalKeyForm(p => ({ ...p, minTier: v }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                              <SelectItem value="unlimited">Unlimited</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddGlobalKeyOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddGlobalKey} disabled={!addGlobalKeyForm.provider || !addGlobalKeyForm.apiKey || addGlobalKeyLoading}>
                          {addGlobalKeyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                          Add Global Key
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {globalApiKeys.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No global API keys configured</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Add global keys that all users can access based on their tier</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {globalApiKeys.map(key => {
                      const provider = getProviderById(key.provider)
                      const Icon = provider ? ICON_MAP[provider.icon] || Key : Key
                      return (
                        <Card key={key.id} className={`p-4 transition-all ${key.isActive ? 'border-emerald-500/20' : 'border-border opacity-60'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              key.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary/50 text-muted-foreground'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{provider?.name || key.provider}</span>
                                <Badge className={`text-[10px] px-1.5 py-0 ${TIER_COLORS[key.minTier]}`}>
                                  Min: {key.minTier}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">{key.apiKeyMasked}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleGlobalKey(key.id, key.isActive)}
                              >
                                {key.isActive ? (
                                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Global API Key</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove the global {provider?.name || key.provider} API key? This will affect all users who rely on it.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteGlobalKey(key.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
