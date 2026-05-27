'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Star, Download, Upload, Link, X, Check, AlertTriangle,
  Loader2, Trash2, ExternalLink, Shield, HardDrive, Globe,
  Puzzle, ChevronDown, Package, ToggleLeft, ToggleRight, Info,
  ArrowUpDown, Filter, Zap,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

interface IntegrationListItem {
  id: string
  name: string
  description: string
  sourceUrl: string
  sourceType: string
  category: string
  tags: string[]
  permissions: string[]
  estimatedSize: string
  popularity: number
  installed: boolean
  status?: string
  setupInstructions?: string
}

type SortOption = 'popularity' | 'name' | 'size'

const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  github: Globe,
  gitlab: Globe,
  sourceforge: Globe,
  npm: Package,
  pypi: Package,
  custom_zip: HardDrive,
  custom_url: Link,
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: 'text-yellow-500', label: 'Pending', icon: Loader2 },
  installing: { color: 'text-blue-400', label: 'Installing', icon: Loader2 },
  installed: { color: 'text-emerald-500', label: 'Installed', icon: Check },
  error: { color: 'text-destructive', label: 'Error', icon: AlertTriangle },
  disabled: { color: 'text-muted-foreground', label: 'Disabled', icon: ToggleLeft },
  not_installed: { color: 'text-muted-foreground', label: 'Not Installed', icon: Download },
}

function StatusBadge({ status }: { status?: string }) {
  const config = STATUS_CONFIG[status || 'not_installed']
  const Icon = config.icon
  const isAnimating = status === 'installing' || status === 'pending'

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${config.color}`}>
      <Icon className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  )
}

function formatStars(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return String(num)
}

export function IntegrationsView() {
  const { authFetch } = useAuth()
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse')
  const [integrations, setIntegrations] = useState<IntegrationListItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('popularity')
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState<string | null>(null)
  const [uninstalling, setUninstalling] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlInstalling, setUrlInstalling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationListItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await authFetch('/api/integrations/list')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations)
        setCategories(data.categories)
      }
    } catch (err) {
      console.error('[IntegrationsView] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  // Auto-refresh to catch status changes
  useEffect(() => {
    const hasPending = integrations.some(i => i.status === 'installing' || i.status === 'pending')
    if (hasPending) {
      const interval = setInterval(fetchIntegrations, 3000)
      return () => clearInterval(interval)
    }
  }, [integrations, fetchIntegrations])

  // Install from curated list
  const handleInstall = useCallback(async (integration: IntegrationListItem) => {
    setInstalling(integration.id)
    setError(null)
    try {
      const res = await authFetch('/api/integrations/install', {
        method: 'POST',
        body: JSON.stringify({ sourceId: integration.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to install')
      }

      // Refresh list
      await fetchIntegrations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed')
    } finally {
      setInstalling(null)
    }
  }, [fetchIntegrations])

  // Install from URL
  const handleUrlInstall = useCallback(async () => {
    if (!urlInput.trim()) return

    setUrlInstalling(true)
    setError(null)
    try {
      const res = await authFetch('/api/integrations/install', {
        method: 'POST',
        body: JSON.stringify({ sourceUrl: urlInput.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to install from URL')
      }

      setUrlInput('')
      await fetchIntegrations()
      setActiveTab('installed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation from URL failed')
    } finally {
      setUrlInstalling(false)
    }
  }, [urlInput, fetchIntegrations])

  // Upload zip file
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await authFetch('/api/integrations/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload')
      }

      await fetchIntegrations()
      setActiveTab('installed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [fetchIntegrations])

  // Uninstall
  const handleUninstall = useCallback(async (integration: IntegrationListItem) => {
    setUninstalling(integration.id)
    setError(null)
    try {
      const res = await authFetch(`/api/integrations/${integration.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to uninstall')
      }

      await fetchIntegrations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstall failed')
    } finally {
      setUninstalling(null)
    }
  }, [fetchIntegrations])

  // Toggle enable/disable
  const handleToggle = useCallback(async (integration: IntegrationListItem) => {
    const newStatus = integration.status === 'installed' ? 'disabled' : 'installed'
    setError(null)
    try {
      await authFetch(`/api/integrations/${integration.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchIntegrations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed')
    }
  }, [fetchIntegrations])

  // Filter and sort
  const filteredIntegrations = integrations
    .filter(i => {
      const matchCategory = selectedCategory === 'All' || i.category === selectedCategory
      const matchSearch = !searchQuery.trim() ||
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCategory && matchSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return a.estimatedSize.localeCompare(b.estimatedSize)
        case 'popularity':
        default:
          return b.popularity - a.popularity
      }
    })

  const installedIntegrations = integrations.filter(i => i.installed)

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20">
            <Puzzle className="w-5 h-5 text-nova-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold gold-gradient-text">Integrations</h2>
            <p className="text-xs text-muted-foreground">Connect open-source AI tools to NOVA</p>
          </div>
        </div>
      </div>

      {/* URL Input + Upload Bar */}
      <div className="glass-card p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="url"
              placeholder="Paste GitHub/GitLab URL to auto-detect & install..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlInstall()}
              className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUrlInstall}
            disabled={urlInstalling || !urlInput.trim()}
            className="px-4 py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {urlInstalling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-nova-gold/30 text-nova-gold hover:bg-nova-gold/5 transition-colors text-sm disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload .zip
          </motion.button>
          <span className="text-[11px] text-muted-foreground">Auto-detects package.json, setup.py, README</span>
        </div>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-destructive hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'browse'
              ? 'text-nova-gold border-b-2 border-nova-gold bg-nova-gold/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Browse ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
            activeTab === 'installed'
              ? 'text-nova-gold border-b-2 border-nova-gold bg-nova-gold/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Integrations ({installedIntegrations.length})
          {installedIntegrations.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-nova-gold/20 text-[10px] text-nova-gold font-bold">
              {installedIntegrations.length}
            </span>
          )}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search integrations, tags, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'All'
                    ? 'gold-gradient-bg text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 border border-border'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'gold-gradient-bg text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30 border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-secondary/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="popularity">Stars</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </div>
          </div>

          {/* Integration Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-nova-gold animate-spin" />
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <div className="text-center py-16">
              <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No integrations match your filters</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All') }}
                className="text-xs text-nova-gold hover:underline mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredIntegrations.map((integration) => {
                const SourceIcon = SOURCE_TYPE_ICONS[integration.sourceType] || Globe
                return (
                  <motion.div
                    key={integration.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => setSelectedIntegration(integration)}
                    className={`glass-card p-4 cursor-pointer transition-colors ${
                      integration.installed
                        ? 'border-nova-gold/20 hover:border-nova-gold/40'
                        : 'hover:border-nova-gold/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                        integration.installed
                          ? 'bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 border-nova-gold/20'
                          : 'bg-secondary/50 border-border'
                      }`}>
                        <SourceIcon className={`w-5 h-5 ${integration.installed ? 'text-nova-gold' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-foreground truncate">{integration.name}</h4>
                          <StatusBadge status={integration.installed ? (integration.status || 'installed') : 'not_installed'} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{integration.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                            {integration.category}
                          </span>
                          {integration.popularity > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-nova-gold/60" />
                              {formatStars(integration.popularity)}
                            </span>
                          )}
                          {integration.estimatedSize && integration.estimatedSize !== 'Unknown' && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <HardDrive className="w-3 h-3" />
                              {integration.estimatedSize}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            {integration.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (integration.installed) {
                                handleUninstall(integration)
                              } else {
                                handleInstall(integration)
                              }
                            }}
                            disabled={installing === integration.id || uninstalling === integration.id}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium disabled:opacity-50 ${
                              integration.installed
                                ? 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                                : 'gold-gradient-bg text-background'
                            }`}
                          >
                            {installing === integration.id || uninstalling === integration.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : integration.installed ? (
                              'Remove'
                            ) : (
                              'Install'
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Installed Tab */}
      {activeTab === 'installed' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-nova-gold animate-spin" />
            </div>
          ) : installedIntegrations.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No integrations installed yet</p>
              <button
                onClick={() => setActiveTab('browse')}
                className="text-xs text-nova-gold hover:underline mt-2"
              >
                Browse integrations
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {installedIntegrations.map((integration) => {
                const SourceIcon = SOURCE_TYPE_ICONS[integration.sourceType] || Globe
                const isEnabled = integration.status === 'installed'
                return (
                  <motion.div
                    key={integration.id}
                    whileHover={{ scale: 1.005 }}
                    className="glass-card p-4 border-nova-gold/10 hover:border-nova-gold/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20 flex-shrink-0">
                        <SourceIcon className="w-6 h-6 text-nova-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-foreground truncate">{integration.name}</h4>
                          <StatusBadge status={integration.status} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{integration.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                            {integration.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {integration.permissions?.join(', ') || 'None'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Enable/Disable Toggle */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggle(integration)}
                          className={`p-2 rounded-lg transition-colors ${
                            isEnabled
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-muted-foreground hover:bg-secondary/30'
                          }`}
                          title={isEnabled ? 'Disable' : 'Enable'}
                        >
                          {isEnabled ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </motion.button>

                        {/* View details */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedIntegration(integration)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                          title="Details"
                        >
                          <Info className="w-4 h-4" />
                        </motion.button>

                        {/* Uninstall */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleUninstall(integration)}
                          disabled={uninstalling === integration.id}
                          className="p-2 rounded-lg text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Uninstall"
                        >
                          {uninstalling === integration.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIntegration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIntegration(null)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20">
                    {(() => {
                      const Icon = SOURCE_TYPE_ICONS[selectedIntegration.sourceType] || Globe
                      return <Icon className="w-6 h-6 text-nova-gold" />
                    })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedIntegration.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={selectedIntegration.installed ? (selectedIntegration.status || 'installed') : 'not_installed'} />
                      {selectedIntegration.popularity > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-nova-gold/60" />
                          {formatStars(selectedIntegration.popularity)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedIntegration(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{selectedIntegration.description}</p>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Category</p>
                  <p className="text-sm text-foreground">{selectedIntegration.category}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm text-foreground capitalize">{selectedIntegration.sourceType}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Size</p>
                  <p className="text-sm text-foreground">{selectedIntegration.estimatedSize || 'Unknown'}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Permissions</p>
                  <p className="text-sm text-foreground">{selectedIntegration.permissions?.join(', ') || 'None'}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedIntegration.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIntegration.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup Instructions */}
              {selectedIntegration.setupInstructions && (
                <div className="mb-4 p-3 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-nova-gold" />
                    Setup Instructions
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedIntegration.setupInstructions}</p>
                </div>
              )}

              {/* Source URL */}
              <div className="mb-4 p-3 rounded-lg bg-secondary/20 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Source URL</p>
                <a
                  href={selectedIntegration.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-nova-gold hover:underline flex items-center gap-1 break-all"
                >
                  {selectedIntegration.sourceUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedIntegration.installed ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        handleToggle(selectedIntegration)
                        setSelectedIntegration({
                          ...selectedIntegration,
                          status: selectedIntegration.status === 'installed' ? 'disabled' : 'installed',
                        })
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        selectedIntegration.status === 'installed'
                          ? 'border border-border text-foreground hover:bg-secondary/30'
                          : 'gold-gradient-bg text-background'
                      }`}
                    >
                      {selectedIntegration.status === 'installed' ? (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        handleUninstall(selectedIntegration)
                        setSelectedIntegration(null)
                      }}
                      disabled={uninstalling === selectedIntegration.id}
                      className="flex-1 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium disabled:opacity-50"
                    >
                      {uninstalling === selectedIntegration.id ? 'Uninstalling...' : 'Uninstall'}
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleInstall(selectedIntegration)
                      setSelectedIntegration(null)
                    }}
                    disabled={installing === selectedIntegration.id}
                    className="flex-1 py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {installing === selectedIntegration.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {installing === selectedIntegration.id ? 'Installing...' : 'Install Integration'}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
