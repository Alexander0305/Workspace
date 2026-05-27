'use client'

import { useNovaStore, type Plugin } from '@/lib/nova-store'
import {
  loadPlugin, unloadPlugin, executePluginCommand, getPluginStatus, BUILTIN_PLUGINS,
  type PluginManifest, PLUGIN_TEMPLATES, type PluginTemplate,
} from '@/lib/plugin-engine'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Share2, Code, Activity, Landmark, BarChart3, Database,
  Puzzle, Search, SlidersHorizontal, X, Check, Plus, ChevronLeft, ChevronRight,
  Play, CircleDot, AlertTriangle, Terminal, FileCode, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const PLUGIN_ICONS: Record<string, React.ElementType> = {
  Claw: Puzzle,
  TrendingUp,
  Share2,
  Code,
  Activity,
  Landmark,
  BarChart3,
  Database,
  FileCode,
  Terminal,
}

const CATEGORIES = ['All', 'Productivity', 'Finance', 'Social', 'Development', 'System'] as const

/** Map a store Plugin to a PluginManifest for the engine */
function pluginToManifest(plugin: Plugin): PluginManifest {
  return {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    author: plugin.author,
    category: plugin.category,
    icon: plugin.icon,
    permissions: ['storage'],
    main: BUILTIN_PLUGINS[plugin.id] || (plugin as Plugin & { code?: string }).code || '',
    config: {},
    installed: plugin.installed,
    enabled: plugin.installed,
  }
}

/** Status indicator component */
function StatusBadge({ pluginId }: { pluginId: string }) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const update = () => setStatus(getPluginStatus(pluginId))
    update()
    const interval = setInterval(update, 2000)
    return () => clearInterval(interval)
  }, [pluginId])

  if (!status) return null

  const s = status.status as string
  if (s === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
        <CircleDot className="w-3 h-3" />
        Active
      </span>
    )
  }
  if (s === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
        <AlertTriangle className="w-3 h-3" />
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <CircleDot className="w-3 h-3" />
      Inactive
    </span>
  )
}

function FeaturedCard({ plugin, onToggle }: { plugin: Plugin; onToggle: (id: string) => void }) {
  const PIcon = PLUGIN_ICONS[plugin.icon] || Puzzle
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full glass-card p-6 flex items-center gap-6"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20 flex-shrink-0">
        <PIcon className="w-7 h-7 text-nova-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-lg font-semibold text-foreground mb-1">{plugin.name}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">{plugin.description}</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onToggle(plugin.id)}
        className={`px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 ${
          plugin.installed
            ? 'gold-gradient-bg text-background'
            : 'border border-nova-gold/30 text-nova-gold hover:bg-nova-gold/10'
        }`}
      >
        {plugin.installed ? 'Installed' : 'Install'}
      </motion.button>
    </motion.div>
  )
}

function PluginIcon({ iconName, className }: { iconName: string; className?: string }) {
  const PIcon = PLUGIN_ICONS[iconName] || Puzzle
  return <PIcon className={className} />
}

/** Command Runner sub-component for the detail modal */
function CommandRunner({ pluginId }: { pluginId: string }) {
  const [command, setCommand] = useState('')
  const [argsInput, setArgsInput] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    if (!command.trim()) return
    setRunning(true)
    setError(null)
    try {
      const parsedArgs = argsInput.trim()
        ? argsInput.split(/\s+/)
        : undefined
      const res = await executePluginCommand(pluginId, command.trim(), parsedArgs)
      setResult(res)
    } catch (err) {
      setError(String(err))
      setResult(null)
    } finally {
      setRunning(false)
    }
  }, [pluginId, command, argsInput])

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Terminal className="w-4 h-4 text-nova-gold" />
        Run Command
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Command (e.g. status)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
        />
        <input
          type="text"
          placeholder="Args (space-separated)"
          value={argsInput}
          onChange={(e) => setArgsInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRun}
          disabled={running || !command.trim()}
          className="px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          {running ? '...' : 'Run'}
        </motion.button>
      </div>
      {(result !== null || error) && (
        <div className="bg-secondary/30 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <pre className="text-xs text-foreground whitespace-pre-wrap break-words">
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

/** Configure Plugin Dialog — uses declarative templates, no arbitrary code execution */
function ConfigurePluginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPlugin } = useNovaStore()
  const [selectedTemplate, setSelectedTemplate] = useState<PluginTemplate | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = (template: PluginTemplate) => {
    setSelectedTemplate(template)
    setName(template.name)
    setError(null)
  }

  const handleCreate = async () => {
    if (!selectedTemplate) {
      setError('Please select a plugin template')
      return
    }
    if (!name.trim()) {
      setError('Please enter a plugin name')
      return
    }
    setCreating(true)
    setError(null)

    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
    const dslConfig = JSON.stringify(selectedTemplate.dslConfig)

    const plugin: Plugin & { code?: string } = {
      id,
      name: name.trim(),
      description: selectedTemplate.description,
      icon: selectedTemplate.icon,
      category: selectedTemplate.category as Plugin['category'],
      installed: true,
      version: '1.0.0',
      author: 'You',
      code: dslConfig,
    }

    addPlugin(plugin)

    // Load the plugin into the engine using the DSL config
    const manifest: PluginManifest = {
      id,
      name: name.trim(),
      version: '1.0.0',
      description: selectedTemplate.description,
      author: 'You',
      category: selectedTemplate.category,
      icon: selectedTemplate.icon,
      permissions: ['storage'],
      main: dslConfig,
      config: {},
      installed: true,
      enabled: true,
    }

    try {
      await loadPlugin(manifest)
    } catch (err) {
      console.error('[PluginsView] Failed to load new plugin:', err)
    }

    setCreating(false)
    setSelectedTemplate(null)
    setName('')
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg glass-card p-6 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-nova-gold" />
              Configure Plugin
            </h3>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-3 p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Template Selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Choose a Plugin Template</label>
              <div className="space-y-2">
                {PLUGIN_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-nova-gold/50 bg-nova-gold/10'
                        : 'border-border hover:border-nova-gold/30 hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-nova-gold/10 flex items-center justify-center border border-nova-gold/20">
                        <Sparkles className="w-4 h-4 text-nova-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{template.name}</p>
                        <p className="text-[11px] text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {template.dslConfig.commands.map(cmd => (
                        <span key={cmd.name} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">
                          {cmd.name}
                        </span>
                      ))}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-nova-gold/10 text-nova-gold">
                        {template.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Plugin Name</label>
              <input
                type="text"
                placeholder="My Plugin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
              />
            </div>

            {/* Info about DSL */}
            <div className="p-3 rounded-lg bg-secondary/20 border border-border">
              <p className="text-[11px] text-muted-foreground">
                <strong className="text-foreground">Secure Plugin:</strong> Custom plugins use a declarative DSL
                with safe, predefined actions (notifications, data storage, messaging).
                No arbitrary code execution.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/30 text-sm font-medium"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={creating || !selectedTemplate}
              className="flex-1 py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create & Install'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// No arbitrary code templates — plugins use the secure DSL config approach

export function PluginsView() {
  const { plugins, togglePlugin } = useNovaStore()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loadingPlugin, setLoadingPlugin] = useState<string | null>(null)

  // Load already-installed plugins on mount
  useEffect(() => {
    const loadInstalled = async () => {
      for (const p of plugins) {
        if (p.installed) {
          const status = getPluginStatus(p.id)
          if (!status) {
            const manifest = pluginToManifest(p)
            try {
              await loadPlugin(manifest)
            } catch (err) {
              console.error(`[PluginsView] Failed to load plugin ${p.id}:`, err)
            }
          }
        }
      }
    }
    loadInstalled()
  }, [])

  const handleToggle = useCallback(async (id: string) => {
    const plugin = plugins.find(p => p.id === id)
    if (!plugin) return

    setLoadingPlugin(id)

    if (!plugin.installed) {
      // Installing: load the plugin
      const manifest = pluginToManifest(plugin)
      manifest.installed = true
      manifest.enabled = true
      await loadPlugin(manifest)
    } else {
      // Uninstalling: unload the plugin
      await unloadPlugin(id)
    }

    togglePlugin(id)
    setLoadingPlugin(null)

    // Update selectedPlugin if it's the one being toggled
    setSelectedPlugin(prev => {
      if (prev && prev.id === id) {
        return { ...prev, installed: !prev.installed }
      }
      return prev
    })
  }, [plugins, togglePlugin])

  const featured = plugins.slice(0, 3)

  const filtered = plugins.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory.toLowerCase()
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const installed = plugins.filter(p => p.installed)

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      {/* Featured carousel */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="text-nova-gold">★</span> Featured
        </h3>
        <div className="relative">
          <div className="flex gap-4 overflow-hidden">
            <AnimatePresence mode="wait">
              {featured[featuredIndex] && (
                <FeaturedCard
                  key={featuredIndex}
                  plugin={featured[featuredIndex]}
                  onToggle={handleToggle}
                />
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={() => setFeaturedIndex(i => (i - 1 + featured.length) % featured.length)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setFeaturedIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === featuredIndex ? 'bg-nova-gold' : 'bg-nova-gold/30'}`}
              />
            ))}
            <button onClick={() => setFeaturedIndex(i => (i + 1) % featured.length)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'gold-gradient-bg text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Installed plugins section */}
      {installed.length > 0 && selectedCategory === 'All' && !searchQuery && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            Installed ({installed.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {installed.map(p => (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.02, y: -2 }}
                onClick={() => setSelectedPlugin(p)}
                className="glass-card p-4 cursor-pointer border-nova-gold/20 hover:border-nova-gold/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20 flex-shrink-0">
                    <PluginIcon iconName={p.icon} className="w-5 h-5 text-nova-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
                      <StatusBadge pluginId={p.id} />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">{p.category}</span>
                      <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All plugins grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Browse Plugins</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.02, y: -2 }}
              onClick={() => setSelectedPlugin(p)}
              className="glass-card p-4 cursor-pointer hover:border-nova-gold/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center border border-border flex-shrink-0">
                  <PluginIcon iconName={p.icon} className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground truncate">{p.name}</h4>
                    {p.installed && <StatusBadge pluginId={p.id} />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground">{p.category}</span>
                      <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleToggle(p.id) }}
                      disabled={loadingPlugin === p.id}
                      className={`px-3 py-1 rounded-lg text-[11px] font-medium disabled:opacity-50 ${
                        p.installed
                          ? 'gold-gradient-bg text-background'
                          : 'border border-border text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30'
                      }`}
                    >
                      {loadingPlugin === p.id ? '...' : p.installed ? 'Installed' : 'Install'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Configure Plugin button */}
      <div className="mt-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl glass-card border-dashed border-nova-gold/30 text-nova-gold hover:bg-nova-gold/5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Configure Plugin</span>
        </motion.button>
      </div>

      {/* Plugin detail modal */}
      <AnimatePresence>
        {selectedPlugin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPlugin(null)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20">
                    <PluginIcon iconName={selectedPlugin.icon} className="w-6 h-6 text-nova-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{selectedPlugin.name}</h3>
                    <p className="text-xs text-muted-foreground">by {selectedPlugin.author} · v{selectedPlugin.version}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPlugin(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{selectedPlugin.description}</p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">{selectedPlugin.category}</span>
                <StatusBadge pluginId={selectedPlugin.id} />
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { handleToggle(selectedPlugin.id) }}
                  disabled={loadingPlugin === selectedPlugin.id}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
                    selectedPlugin.installed
                      ? 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                      : 'gold-gradient-bg text-background'
                  }`}
                >
                  {loadingPlugin === selectedPlugin.id ? '...' : selectedPlugin.installed ? 'Uninstall' : 'Install'}
                </motion.button>
                {selectedPlugin.installed && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary/30 text-sm"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Configure
                  </motion.button>
                )}
              </div>

              {/* Run Command section - only for installed plugins */}
              {selectedPlugin.installed && (
                <CommandRunner pluginId={selectedPlugin.id} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Configure Plugin Dialog */}
      <ConfigurePluginDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </div>
  )
}
