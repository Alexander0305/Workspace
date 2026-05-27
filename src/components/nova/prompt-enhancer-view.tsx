'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Wand2,
  Copy,
  Check,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Loader2,
  Trash2,
  Clock,
  Image,
  Code,
  PenTool,
  BarChart3,
  MessageCircle,
  ListChecks,
  Briefcase,
  GraduationCap,
  Feather,
  Cpu,
  Minimize2,
  ListOrdered,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useNovaStore } from '@/lib/nova-store'

// ─── Enhancement Option Definitions ────────────────────────────────────────

interface EnhancementOption {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const ENHANCEMENT_OPTIONS: EnhancementOption[] = [
  { id: 'detail', label: 'Add Detail', description: 'Makes the prompt more specific and detailed', icon: ListChecks },
  { id: 'professional', label: 'Professional Tone', description: 'Adjusts for professional/formal output', icon: Briefcase },
  { id: 'creative', label: 'Creative', description: 'Adds creative and imaginative elements', icon: Feather },
  { id: 'technical', label: 'Technical', description: 'Optimizes for technical/code generation', icon: Cpu },
  { id: 'concise', label: 'Concise', description: 'Makes the prompt more focused and efficient', icon: Minimize2 },
  { id: 'stepbystep', label: 'Step-by-step', description: 'Requests step-by-step output', icon: ListOrdered },
]

// ─── Preset Enhancement Templates ──────────────────────────────────────────

interface PresetTemplate {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: string
  options: string[]
  suffix: string
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'image-gen',
    name: 'Image Generation',
    description: 'Optimizes for image gen prompts with visual descriptors',
    icon: Image,
    color: 'text-pink-400',
    options: ['detail', 'creative'],
    suffix: 'Include vivid visual details, lighting, composition, camera angle, art style, color palette, and mood descriptors.',
  },
  {
    id: 'code-gen',
    name: 'Code Generation',
    description: 'Optimizes for code generation prompts',
    icon: Code,
    color: 'text-emerald-400',
    options: ['technical', 'detail', 'stepbystep'],
    suffix: 'Specify the programming language, framework, input/output types, edge cases to handle, error handling requirements, and code style preferences.',
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Optimizes for creative writing prompts',
    icon: PenTool,
    color: 'text-violet-400',
    options: ['creative', 'detail', 'professional'],
    suffix: 'Include the desired tone, narrative perspective, target audience, writing style references, pacing preferences, and emotional arc.',
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Optimizes for data analysis prompts',
    icon: BarChart3,
    color: 'text-nova-gold',
    options: ['technical', 'stepbystep', 'detail'],
    suffix: 'Specify the data format, analysis methodology, key metrics to evaluate, comparison dimensions, and expected output format (tables, charts, summary).',
  },
  {
    id: 'conversation',
    name: 'Conversation',
    description: 'Optimizes for chat prompts',
    icon: MessageCircle,
    color: 'text-sky-400',
    options: ['concise', 'professional'],
    suffix: 'Clarify the conversational context, role the AI should play, communication style, and the specific outcome or information you want from the exchange.',
  },
]

// ─── History Entry ─────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  original: string
  enhanced: string
  options: string[]
  preset: string | null
  timestamp: Date
}

// ─── Word / Character Count Helper ─────────────────────────────────────────

function countStats(text: string) {
  const chars = text.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return { chars, words }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function PromptEnhancerView() {
  const { authFetch } = useAuth()
  const { addMessage, setActiveView, personality } = useNovaStore()

  // Input state
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [activePreset, setActivePreset] = useState<string | null>(null)

  // Enhancement state
  const [enhancedPrompt, setEnhancedPrompt] = useState('')
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enhanceCount, setEnhanceCount] = useState(0)

  // UI state
  const [copied, setCopied] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // ── Toggle an enhancement option ───────────────────────────────────────

  const toggleOption = useCallback((id: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setActivePreset(null) // manual selection clears preset
  }, [])

  // ── Apply a preset template ────────────────────────────────────────────

  const applyPreset = useCallback((preset: PresetTemplate) => {
    if (activePreset === preset.id) {
      setActivePreset(null)
      setSelectedOptions(new Set())
      return
    }
    setActivePreset(preset.id)
    setSelectedOptions(new Set(preset.options))
  }, [activePreset])

  // ── Build the system prompt ────────────────────────────────────────────

  const buildSystemPrompt = useCallback((): string => {
    const activeOptions = ENHANCEMENT_OPTIONS.filter(o => selectedOptions.has(o.id))
    const optionList = activeOptions.map(o => `- ${o.label}: ${o.description}`).join('\n')

    const activePresetObj = PRESET_TEMPLATES.find(p => p.id === activePreset)
    const presetInstruction = activePresetObj
      ? `\n\nAdditionally, apply this preset optimization: ${activePresetObj.suffix}`
      : ''

    const variationHint = enhanceCount > 0
      ? `\n\nThis is variation #${enhanceCount + 1}. Provide a DIFFERENT enhancement than before — use alternative phrasing, structure, or emphasis while still following the selected options.`
      : ''

    return `You are a prompt enhancement specialist. The user will provide a prompt, and you must enhance it according to these options:\n${optionList}${presetInstruction}${variationHint}\n\nReturn ONLY the enhanced prompt text, nothing else. Make the enhanced prompt significantly better, more specific, and more likely to produce high-quality results from an AI. Do NOT include any explanations, prefixes like "Enhanced prompt:", or commentary — just the enhanced prompt itself.`
  }, [selectedOptions, activePreset, enhanceCount])

  // ── Enhance the prompt ─────────────────────────────────────────────────

  const handleEnhance = useCallback(async () => {
    if (!originalPrompt.trim() || isEnhancing) return

    if (selectedOptions.size === 0) {
      setError('Please select at least one enhancement option or a preset template.')
      return
    }

    setIsEnhancing(true)
    setError(null)

    try {
      const systemPrompt = buildSystemPrompt()

      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: originalPrompt.trim(),
          personality: 'nova',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: originalPrompt.trim() },
          ],
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      const result = (data.response || data.content || '').trim()

      if (!result) {
        throw new Error('AI returned an empty response. Please try again.')
      }

      setEnhancedPrompt(result)
      setEnhanceCount(prev => prev + 1)
      setShowComparison(true)

      // Add to history
      const entry: HistoryEntry = {
        id: `enh-${Date.now()}`,
        original: originalPrompt.trim(),
        enhanced: result,
        options: Array.from(selectedOptions),
        preset: activePreset,
        timestamp: new Date(),
      }
      setHistory(prev => [entry, ...prev.slice(0, 49)]) // keep last 50
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt. Please try again.')
    } finally {
      setIsEnhancing(false)
    }
  }, [originalPrompt, selectedOptions, activePreset, isEnhancing, authFetch, buildSystemPrompt])

  // ── Enhance Again (different variation) ────────────────────────────────

  const handleEnhanceAgain = useCallback(() => {
    handleEnhance()
  }, [handleEnhance])

  // ── Copy to Clipboard ──────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(enhancedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = enhancedPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [enhancedPrompt])

  // ── Send to Chat ───────────────────────────────────────────────────────

  const handleSendToChat = useCallback(() => {
    if (!enhancedPrompt) return
    addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: enhancedPrompt,
      timestamp: new Date(),
      personality,
    })
    setActiveView('chat')
  }, [enhancedPrompt, addMessage, setActiveView, personality])

  // ── Load history item ──────────────────────────────────────────────────

  const handleLoadHistory = useCallback((entry: HistoryEntry) => {
    setOriginalPrompt(entry.original)
    setEnhancedPrompt(entry.enhanced)
    setSelectedOptions(new Set(entry.options))
    setActivePreset(entry.preset)
    setShowComparison(true)
  }, [])

  // ── Clear history ──────────────────────────────────────────────────────

  const handleClearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // ── Delete single history item ─────────────────────────────────────────

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id))
  }, [])

  // ── Reset everything ───────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setOriginalPrompt('')
    setEnhancedPrompt('')
    setSelectedOptions(new Set())
    setActivePreset(null)
    setError(null)
    setEnhanceCount(0)
    setShowComparison(false)
  }, [])

  // ── Computed values ────────────────────────────────────────────────────

  const originalStats = countStats(originalPrompt)
  const enhancedStats = countStats(enhancedPrompt)
  const charDiff = enhancedStats.chars - originalStats.chars
  const wordDiff = enhancedStats.words - originalStats.words

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-gold/10 flex items-center justify-center border border-nova-gold/30">
              <Wand2 className="w-5 h-5 text-nova-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Prompt Enhancer</h2>
              <p className="text-xs text-muted-foreground">Transform your prompts with AI-powered enhancement</p>
            </div>
          </div>

          {/* Reset + History toggle */}
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass-card text-xs font-medium text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                History ({history.length})
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass-card text-xs font-medium text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex-shrink-0"
          >
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Enhancement History
                </span>
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {history.map(entry => {
                  const presetObj = PRESET_TEMPLATES.find(p => p.id === entry.preset)
                  const PresetIcon = presetObj?.icon || Sparkles
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border hover:border-nova-gold/20 transition-colors cursor-pointer group"
                      onClick={() => handleLoadHistory(entry)}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/30">
                        <PresetIcon className={`w-3.5 h-3.5 ${presetObj?.color || 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate font-medium">{entry.original}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{entry.enhanced}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {entry.options.map(opt => {
                            const optObj = ENHANCEMENT_OPTIONS.find(o => o.id === opt)
                            return optObj ? (
                              <span key={opt} className="px-1 py-0.5 rounded text-[9px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                                {optObj.label}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteHistoryItem(entry.id) }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Left Panel - Input & Options */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:w-[420px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto"
        >
          {/* Prompt Input */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Original Prompt
            </label>
            <textarea
              value={originalPrompt}
              onChange={(e) => setOriginalPrompt(e.target.value)}
              placeholder="Enter your prompt here to enhance it..."
              rows={5}
              className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border border-border focus:border-nova-gold/30 transition-colors"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {originalStats.chars} chars · {originalStats.words} words
              </span>
              {originalPrompt && (
                <button
                  onClick={() => setOriginalPrompt('')}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Enhancement Options */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5" />
              Enhancement Options
            </label>
            <div className="space-y-2">
              {ENHANCEMENT_OPTIONS.map(option => {
                const Icon = option.icon
                const isActive = selectedOptions.has(option.id)
                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => toggleOption(option.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                      isActive
                        ? 'bg-nova-gold/10 border-nova-gold/40 shadow-[0_0_8px_rgba(212,165,116,0.1)]'
                        : 'bg-secondary/20 border-border hover:border-nova-gold/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? 'bg-nova-gold/20' : 'bg-secondary/30'
                    }`}>
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-nova-gold' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium transition-colors ${isActive ? 'text-nova-gold' : 'text-foreground'}`}>
                        {option.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{option.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isActive
                        ? 'bg-nova-gold border-nova-gold'
                        : 'border-muted-foreground/30'
                    }`}>
                      {isActive && <Check className="w-3 h-3 text-background" />}
                    </div>
                  </motion.button>
                )
              })}
            </div>
            {selectedOptions.size === 0 && (
              <p className="text-[10px] text-muted-foreground/60 italic">Select at least one option or use a preset below</p>
            )}
          </div>

          {/* Preset Templates */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              Preset Templates
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_TEMPLATES.map(preset => {
                const Icon = preset.icon
                const isActive = activePreset === preset.id
                return (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => applyPreset(preset)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                      isActive
                        ? 'bg-nova-gold/10 border-nova-gold/40 shadow-[0_0_8px_rgba(212,165,116,0.1)]'
                        : 'bg-secondary/20 border-border hover:border-nova-gold/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? 'bg-nova-gold/20' : 'bg-secondary/30'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-nova-gold' : preset.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium transition-colors ${isActive ? 'text-nova-gold' : 'text-foreground'}`}>
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{preset.description}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {preset.options.map(optId => {
                        const optObj = ENHANCEMENT_OPTIONS.find(o => o.id === optId)
                        return optObj ? (
                          <span key={optId} className="px-1.5 py-0.5 rounded text-[9px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                            {optObj.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Enhance Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleEnhance}
            disabled={!originalPrompt.trim() || isEnhancing || selectedOptions.size === 0}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex-shrink-0 ${
              originalPrompt.trim() && !isEnhancing && selectedOptions.size > 0
                ? 'gold-gradient-bg text-background shadow-[0_0_15px_rgba(212,165,116,0.3)]'
                : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Enhance Prompt
              </>
            )}
          </motion.button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-3 border-destructive/30 flex-shrink-0"
              >
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Panel - Results */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {enhancedPrompt ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-4">
              {/* Comparison View Toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowComparison(!showComparison)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {showComparison ? 'Hide' : 'Show'} Comparison
                </motion.button>
                {enhanceCount > 0 && (
                  <span className="px-2 py-1 rounded-full text-[10px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                    Variation #{enhanceCount}
                  </span>
                )}
              </div>

              {/* Comparison View */}
              <AnimatePresence>
                {showComparison && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex-shrink-0"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Original */}
                      <div className="glass-card p-4 border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground">Original</span>
                          <span className="text-[10px] text-muted-foreground">
                            {originalStats.chars} chars · {originalStats.words} words
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{originalPrompt}</p>
                      </div>

                      {/* Enhanced */}
                      <div className="glass-card p-4 border-nova-gold/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            Enhanced
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {enhancedStats.chars} chars · {enhancedStats.words} words
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{enhancedPrompt}</p>
                      </div>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-3 flex items-center gap-4 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Character change:</span>
                        <span className={`text-[10px] font-medium ${charDiff > 0 ? 'text-emerald-400' : charDiff < 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          {charDiff > 0 ? '+' : ''}{charDiff} chars
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Word change:</span>
                        <span className={`text-[10px] font-medium ${wordDiff > 0 ? 'text-emerald-400' : wordDiff < 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          {wordDiff > 0 ? '+' : ''}{wordDiff} words
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Ratio:</span>
                        <span className="text-[10px] font-medium text-nova-gold">
                          {originalStats.words > 0 ? (enhancedStats.words / originalStats.words).toFixed(1) + 'x' : '—'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Prompt Output */}
              <div className="glass-card p-4 flex-1 min-h-0 flex flex-col border-nova-gold/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    Enhanced Prompt
                  </span>
                  <div className="flex items-center gap-2">
                    {activePreset && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                        {PRESET_TEMPLATES.find(p => p.id === activePreset)?.name}
                      </span>
                    )}
                    {Array.from(selectedOptions).map(optId => {
                      const optObj = ENHANCEMENT_OPTIONS.find(o => o.id === optId)
                      return optObj ? (
                        <span key={optId} className="px-1.5 py-0.5 rounded text-[9px] bg-secondary/30 text-muted-foreground border border-border">
                          {optObj.label}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>

                {/* Enhanced text display */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 rounded-lg bg-secondary/20 border border-border">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{enhancedPrompt}</p>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-card text-xs font-medium text-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSendToChat}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl gold-gradient-bg text-background text-xs font-medium shadow-[0_0_10px_rgba(212,165,116,0.3)]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Send to Chat
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleEnhanceAgain}
                    disabled={isEnhancing}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-card text-xs font-medium text-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                    Enhance Again
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nova-gold/10 to-nova-gold/5 flex items-center justify-center mx-auto mb-4 border border-nova-gold/20"
                >
                  <Sparkles className="w-10 h-10 text-nova-gold/50" />
                </motion.div>
                <p className="text-sm text-muted-foreground mb-1">No enhanced prompt yet</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                  Enter a prompt, select enhancement options or a preset template, then click Enhance Prompt to transform it.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
