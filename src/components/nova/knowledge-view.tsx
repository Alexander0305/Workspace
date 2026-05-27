'use client'

import { useNovaStore, type KnowledgeEntry } from '@/lib/nova-store'
import { useAuth } from '@/lib/auth-context'
import {
  searchKnowledge,
  suggestTags,
  documentSimilarity,
  extractFacts,
  computeKnowledgeStats,
  type SearchResult,
  type KnowledgeDocument,
  type KnowledgeStats,
} from '@/lib/knowledge-engine'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Plus, Tag, Download, Upload, BookOpen, Trash2, X, Zap, ToggleLeft, ToggleRight, BarChart3, Link2, Sparkles } from 'lucide-react'
import { useState, useRef, useMemo, useCallback } from 'react'

const CATEGORIES = ['All', 'General', 'Technical', 'Personal', 'Financial', 'Preferences']

/** Convert a KnowledgeEntry (from the store) into a KnowledgeDocument (used by the engine). */
function toDoc(entry: KnowledgeEntry): KnowledgeDocument {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    tags: entry.tags,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
  }
}

/** Highlight matched terms in a string by wrapping them in <mark> tags. */
function highlightTerms(text: string, terms: string[]): React.ReactNode {
  if (terms.length === 0) return text
  // Build a regex that matches any of the terms (case-insensitive)
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    terms.some(t => part.toLowerCase() === t.toLowerCase())
      ? <mark key={i} className="bg-nova-gold/30 text-foreground rounded-sm px-0.5">{part}</mark>
      : part
  )
}

export function KnowledgeView() {
  const { knowledgeEntries, addKnowledge, removeKnowledge, autoLearnFromChat, setAutoLearnFromChat, messages, isFeatureEnabled } = useNovaStore()
  const { user, isAdmin } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [newTags, setNewTags] = useState('')
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [injectFeedback, setInjectFeedback] = useState<string | null>(null)
  const [expandedSimilar, setExpandedSimilar] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(false)
  const [autoLearnPreview, setAutoLearnPreview] = useState<Array<{ text: string; confidence: number; type: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter knowledge entries based on user access - MUST be defined before documents/search
  const userKnowledgeEntries = useMemo(() => {
    if (isAdmin) return knowledgeEntries // Admin sees everything
    // Regular users only see their own entries + entries without a userId (global)
    const currentUserId = user?.id
    return knowledgeEntries.filter(e => {
      // Entries without userId are global/system knowledge, visible to all
      if (!e.userId) return true
      // Entries with userId only visible to their owner
      return e.userId === currentUserId
    })
  }, [knowledgeEntries, isAdmin, user?.id])

  // Convert filtered knowledge entries to documents for the engine
  const documents = useMemo(() => userKnowledgeEntries.map(toDoc), [userKnowledgeEntries])

  // Real TF-IDF search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return searchKnowledge(searchQuery, documents, 10)
  }, [searchQuery, documents])

  // Whether we are in "search mode" (user typed a query)
  const isSearchMode = searchQuery.trim().length > 0

  // Compute knowledge base stats
  const stats: KnowledgeStats = useMemo(() => computeKnowledgeStats(documents), [documents])

  const filtered = useMemo(() => {
    if (isSearchMode) return userKnowledgeEntries // show all when in search; search results drive display
    return userKnowledgeEntries.filter(e => {
      const matchCategory = selectedCategory === 'All' || e.category.toLowerCase() === selectedCategory.toLowerCase()
      return matchCategory
    })
  }, [userKnowledgeEntries, selectedCategory, isSearchMode])

  // When in search mode, order entries by search result order
  const displayedEntries = useMemo(() => {
    if (!isSearchMode) return filtered
    // Map of id → SearchResult for quick lookup
    const resultMap = new Map<string, SearchResult>()
    for (const r of searchResults) resultMap.set(r.document.id, r)
    // First show matched entries in relevance order, then unmatched
    const matched = searchResults.map(r => userKnowledgeEntries.find(e => e.id === r.document.id)).filter(Boolean) as KnowledgeEntry[]
    const matchedIds = new Set(matched.map(e => e.id))
    const unmatched = userKnowledgeEntries.filter(e => !matchedIds.has(e.id))
    return [...matched, ...unmatched]
  }, [isSearchMode, searchResults, userKnowledgeEntries, filtered])

  // SearchResult lookup for a given entry id
  const searchResultMap = useMemo(() => {
    const map = new Map<string, SearchResult>()
    for (const r of searchResults) map.set(r.document.id, r)
    return map
  }, [searchResults])

  const categoryCount = CATEGORIES.slice(1).reduce((acc, cat) => {
    acc[cat] = userKnowledgeEntries.filter(e => e.category.toLowerCase() === cat.toLowerCase()).length
    return acc
  }, {} as Record<string, number>)

  const activeKnowledgeCount = userKnowledgeEntries.filter(e => e.active).length

  // Auto-suggest tags when content changes
  const suggestedTags = useMemo(() => {
    if (!newContent.trim()) return []
    const existingTags = newTags.split(',').map(t => t.trim()).filter(Boolean)
    return suggestTags(`${newTitle} ${newContent}`, existingTags, 5)
  }, [newTitle, newContent, newTags])

  // Get similar entries for a given entry
  const getSimilarEntries = useCallback((entry: KnowledgeEntry): Array<{ entry: KnowledgeEntry; similarity: number }> => {
    const doc = toDoc(entry)
    const results: Array<{ entry: KnowledgeEntry; similarity: number }> = []
    for (const other of knowledgeEntries) {
      if (other.id === entry.id) continue
      const sim = documentSimilarity(doc, toDoc(other))
      if (sim > 0.05) {
        results.push({ entry: other, similarity: sim })
      }
    }
    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 3)
  }, [knowledgeEntries])

  // Auto-learn preview: extract facts from recent chat messages
  const handleAutoLearnPreview = useCallback(() => {
    const recentMessages = messages.filter(m => m.role === 'assistant').slice(-5)
    const allFacts: Array<{ text: string; confidence: number; type: string }> = []
    for (const msg of recentMessages) {
      const facts = extractFacts(msg.content)
      allFacts.push(...facts.map(f => ({ text: f.text, confidence: f.confidence, type: f.type })))
    }
    setAutoLearnPreview(allFacts.filter(f => f.confidence >= 0.7).slice(0, 10))
  }, [messages])

  const handleAddLearnedFact = (fact: { text: string; type: string }) => {
    const entry: KnowledgeEntry = {
      id: `k-${Date.now()}`,
      title: fact.text.slice(0, 60) + (fact.text.length > 60 ? '...' : ''),
      content: fact.text,
      category: fact.type === 'preference' ? 'preferences' : fact.type === 'definition' ? 'technical' : 'general',
      tags: suggestTags(fact.text, [], 3),
      userId: user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: false,
    }
    addKnowledge(entry)
    setAutoLearnPreview(prev => prev.filter(f => f.text !== fact.text))
  }

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return
    const entry: KnowledgeEntry = {
      id: `k-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      userId: user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: false,
    }
    addKnowledge(entry)
    setNewTitle('')
    setNewContent('')
    setNewCategory('general')
    setNewTags('')
    setShowAddDialog(false)
  }

  const handleTrain = () => {
    setIsTraining(true)
    setTrainingProgress(0)
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsTraining(false)
          return 100
        }
        return prev + 2
      })
    }, 80)
  }

  const handleExport = () => {
    const data = JSON.stringify(knowledgeEntries, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nova-knowledge-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (Array.isArray(data)) {
          data.forEach((entry: KnowledgeEntry) => {
            if (entry.title && entry.content) {
              addKnowledge({
                ...entry,
                id: entry.id || `k-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                active: false,
              })
            }
          })
        }
      } catch {
        // Invalid JSON
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleInject = (id: string) => {
    const entry = knowledgeEntries.find(e => e.id === id)
    if (entry) {
      addKnowledge({ ...entry, active: !entry.active })
      removeKnowledge(id)
      setInjectFeedback(id)
      setTimeout(() => setInjectFeedback(null), 2000)
    }
  }

  const addSuggestedTag = (tag: string) => {
    const existing = newTags.split(',').map(t => t.trim()).filter(Boolean)
    if (!existing.includes(tag)) {
      setNewTags(existing.length > 0 ? [...existing, tag].join(', ') : tag)
    }
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-nova-gold" />
            Knowledge Base
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{userKnowledgeEntries.length} entries · {activeKnowledgeCount} active for RAG · {Object.keys(categoryCount).filter(k => categoryCount[k] > 0).length} categories{!isAdmin && ' · Showing your knowledge only'}</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Stats
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </motion.button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Knowledge
          </motion.button>
        </div>
      </div>

      {/* Stats Section */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-nova-gold" />
                  Knowledge Base Statistics
                </h4>
                <button onClick={() => setShowStats(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <p className="text-xl font-bold text-nova-gold">{stats.totalDocuments}</p>
                  <p className="text-[10px] text-muted-foreground">Documents</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <p className="text-xl font-bold text-nova-gold">{stats.totalTokens}</p>
                  <p className="text-[10px] text-muted-foreground">Total Tokens</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <p className="text-xl font-bold text-nova-gold">{stats.uniqueTerms}</p>
                  <p className="text-[10px] text-muted-foreground">Unique Terms</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <p className="text-xl font-bold text-nova-gold">{stats.avgDocumentLength}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Doc Length</p>
                </div>
              </div>

              {/* Category breakdown */}
              {Object.keys(stats.categoryBreakdown).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Category Breakdown</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(stats.categoryBreakdown).map(([cat, count]) => (
                      <span key={cat} className="text-[10px] px-2 py-1 rounded-full bg-nova-gold/10 text-nova-gold">
                        {cat}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top terms */}
              {stats.topTerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Top Terms</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {stats.topTerms.slice(0, 12).map(({ term, frequency }) => (
                      <span key={term} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/30 text-muted-foreground">
                        {term} <span className="text-nova-gold">({frequency})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Learn Toggle */}
      <div className="glass-card p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className={`w-4 h-4 ${autoLearnFromChat ? 'text-nova-gold' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-sm font-medium text-foreground">Auto-Learn from Chat</p>
            <p className="text-[10px] text-muted-foreground">Automatically extract and save knowledge from conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autoLearnFromChat && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAutoLearnPreview}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-nova-gold border border-nova-gold/30 hover:bg-nova-gold/10 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Preview Facts
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setAutoLearnFromChat(!autoLearnFromChat)}
          >
            {autoLearnFromChat ? (
              <ToggleRight className="w-8 h-8 text-nova-gold" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Auto-Learn Preview */}
      <AnimatePresence>
        {autoLearnPreview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="glass-card p-4 border-nova-gold/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Extracted Facts from Chat
                </h4>
                <button onClick={() => setAutoLearnPreview([])} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {autoLearnPreview.map((fact, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">{fact.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          fact.type === 'preference' ? 'bg-pink-500/10 text-pink-400' :
                          fact.type === 'definition' ? 'bg-blue-500/10 text-blue-400' :
                          fact.type === 'instruction' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-secondary/30 text-muted-foreground'
                        }`}>{fact.type}</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round(fact.confidence * 100)}% confidence</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddLearnedFact(fact)}
                      className="px-2 py-1 rounded-lg gold-gradient-bg text-background text-[10px] font-medium flex-shrink-0"
                    >
                      Add
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="TF-IDF search across all knowledge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
          />
          {isSearchMode && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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
              {cat !== 'All' && categoryCount[cat] ? ` (${categoryCount[cat]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Search results summary */}
      {isSearchMode && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground">
            {searchResults.length > 0
              ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              : `No results found for "${searchQuery}"`
            }
          </p>
        </div>
      )}

      {/* Category stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {CATEGORIES.slice(1).map(cat => (
          <div key={cat} className="glass-card p-3 text-center">
            <p className="text-lg font-bold text-nova-gold">{categoryCount[cat] || 0}</p>
            <p className="text-[10px] text-muted-foreground">{cat}</p>
          </div>
        ))}
      </div>

      {/* Train Nova button */}
      <div className="mb-4">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleTrain}
          disabled={isTraining}
          className="w-full glass-card p-4 flex items-center gap-4 border-nova-gold/20"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20">
            <Brain className="w-5 h-5 text-nova-gold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isTraining ? 'Training in Progress...' : 'Train Nova'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isTraining
                ? `Processing ${Math.round(trainingProgress)}% complete`
                : 'Update the AI model with your knowledge base'}
            </p>
            {isTraining && (
              <div className="mt-2 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                <motion.div
                  animate={{ width: `${trainingProgress}%` }}
                  className="h-full rounded-full progress-gold"
                />
              </div>
            )}
          </div>
        </motion.button>
      </div>

      {/* Knowledge entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {displayedEntries.map(entry => {
            const result = searchResultMap.get(entry.id)
            const similarEntries = expandedSimilar === entry.id ? getSimilarEntries(entry) : []
            const isMatched = isSearchMode && !!result

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: 1.005, y: -1 }}
                className={`glass-card p-4 ${isMatched ? 'border-nova-gold/30' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-nova-gold flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {result ? highlightTerms(entry.title, result.matchedTerms) : entry.title}
                      </h4>
                      {entry.active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5" /> RAG
                        </span>
                      )}
                      {/* Relevance score badge */}
                      {result && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold font-medium">
                          {Math.round(result.score * 100) / 100}
                        </span>
                      )}
                    </div>
                    {/* Show snippet with highlighted terms if search matched, otherwise normal content */}
                    {result ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {highlightTerms(result.snippet, result.matchedTerms)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{entry.content}</p>
                    )}
                    {/* Matched terms chips */}
                    {result && result.matchedTerms.length > 0 && (
                      <div className="flex items-center gap-1 mb-2 flex-wrap">
                        <Search className="w-3 h-3 text-nova-gold/60" />
                        {result.matchedTerms.map(term => (
                          <span key={term} className="text-[10px] px-1.5 py-0.5 rounded-full bg-nova-gold/15 text-nova-gold">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold">{entry.category}</span>
                      {entry.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/30 text-muted-foreground flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Similar entries toggle */}
                    <button
                      onClick={() => setExpandedSimilar(expandedSimilar === entry.id ? null : entry.id)}
                      className="flex items-center gap-1 mt-2 text-[10px] text-nova-gold/60 hover:text-nova-gold transition-colors"
                    >
                      <Link2 className="w-3 h-3" />
                      {expandedSimilar === entry.id ? 'Hide similar' : 'Show similar entries'}
                    </button>
                    <AnimatePresence>
                      {expandedSimilar === entry.id && similarEntries.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 pl-3 border-l-2 border-nova-gold/20 space-y-1"
                        >
                          {similarEntries.map(({ entry: sim, similarity }) => (
                            <div key={sim.id} className="flex items-center gap-2 py-1">
                              <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[11px] text-foreground truncate flex-1">{sim.title}</span>
                              <span className="text-[10px] text-nova-gold/70">{Math.round(similarity * 100)}% similar</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {expandedSimilar === entry.id && similarEntries.length === 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-muted-foreground mt-1 pl-3"
                        >
                          No similar entries found
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleInject(entry.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        entry.active ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10'
                      }`}
                      title={entry.active ? 'Remove from RAG' : 'Inject into Chat (RAG)'}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </motion.button>
                    {injectFeedback === entry.id && (
                      <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-[10px] text-emerald-500">
                        {entry.active ? 'Removed' : 'Injected!'}
                      </motion.span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeKnowledge(entry.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Add knowledge dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddDialog(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Add Knowledge</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter title..."
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Content</label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter knowledge content..."
                    rows={4}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                    >
                      {CATEGORIES.slice(1).map(c => (
                        <option key={c.toLowerCase()} value={c.toLowerCase()}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
                    />
                  </div>
                </div>
                {/* Auto-suggested tags */}
                {suggestedTags.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-nova-gold" />
                      Suggested Tags
                    </label>
                    <div className="flex gap-1.5 flex-wrap">
                      {suggestedTags.map(tag => {
                        const existingTags = newTags.split(',').map(t => t.trim()).filter(Boolean)
                        const alreadyAdded = existingTags.includes(tag)
                        return (
                          <motion.button
                            key={tag}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => !alreadyAdded && addSuggestedTag(tag)}
                            disabled={alreadyAdded}
                            className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-colors ${
                              alreadyAdded
                                ? 'bg-nova-gold/20 text-nova-gold cursor-default'
                                : 'bg-secondary/30 text-muted-foreground hover:bg-nova-gold/10 hover:text-nova-gold cursor-pointer'
                            }`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                            {alreadyAdded && ' ✓'}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAdd}
                    className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium"
                  >
                    Add Entry
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
