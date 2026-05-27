'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ExternalLink,
  Clock,
  Trash2,
  Sparkles,
  Globe,
  ChevronRight,
  Loader2,
  History,
  X,
  ArrowRight,
} from 'lucide-react'
import { useNovaStore } from '@/lib/nova-store'
import { useAuth } from '@/lib/auth-context'

interface SearchResult {
  url: string
  name: string
  snippet: string
  host_name: string
  rank: number
  date: string
  favicon: string
}

interface SearchHistoryEntry {
  id: string
  query: string
  timestamp: Date
  resultCount: number
}

export function WebSearchView() {
  const { addMessage, setActiveView } = useNovaStore()
  const { authFetch } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery || query).trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setCurrentQuery(q)

    try {
      const res = await authFetch(`/api/web-search?query=${encodeURIComponent(q)}&num=10&recency_days=7`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.results || [])
        setHistory(prev => [
          {
            id: `hist-${Date.now()}`,
            query: q,
            timestamp: new Date(),
            resultCount: (data.results || []).length,
          },
          ...prev.slice(0, 19),
        ])
      }
    } catch {
      setError('Failed to fetch search results. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAskAI = () => {
    if (results.length === 0) return
    const context = results.slice(0, 5).map(r =>
      `- ${r.name}: ${r.snippet} (${r.url})`
    ).join('\n')
    const aiPrompt = `Based on these web search results for "${currentQuery}":\n\n${context}\n\nPlease analyze and summarize the key findings.`
    addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: aiPrompt,
      timestamp: new Date(),
    })
    setActiveView('chat')
  }

  const handleHistoryClick = (histQuery: string) => {
    setQuery(histQuery)
    setShowHistory(false)
    handleSearch(histQuery)
  }

  const clearHistory = () => {
    setHistory([])
  }

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-gold/10 flex items-center justify-center border border-nova-gold/30">
            <Globe className="w-5 h-5 text-nova-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Web Search</h2>
            <p className="text-xs text-muted-foreground">Search the web powered by AI</p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card focus-gold p-2 mb-4"
      >
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-nova-gold flex-shrink-0 ml-2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className="flex-1 bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
            title="Search history"
          >
            <History className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              query.trim() && !loading
                ? 'gold-gradient-bg text-background shadow-[0_0_10px_rgba(212,165,116,0.3)]'
                : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </motion.button>
        </div>
      </motion.div>

      {/* History Dropdown */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 glass-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <span className="text-xs font-semibold text-nova-gold">Search History</span>
              <button
                onClick={clearHistory}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {history.map(entry => (
                <motion.button
                  key={entry.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleHistoryClick(entry.query)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-nova-gold/5 transition-colors text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{entry.query}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.resultCount} results · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-2 border-nova-gold/30 border-t-nova-gold"
              />
              <p className="text-sm text-muted-foreground">Searching the web for &ldquo;{currentQuery}&rdquo;...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card p-4 border-destructive/30 mb-4"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {!loading && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 overflow-y-auto min-h-0"
        >
          {/* Ask AI button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAskAI}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gold-gradient-bg text-background font-medium text-sm shadow-[0_0_15px_rgba(212,165,116,0.2)]"
            >
              <Sparkles className="w-4 h-4" />
              Ask AI about these results
            </motion.button>
          </motion.div>

          <p className="text-xs text-muted-foreground mb-3">
            {results.length} results for &ldquo;{currentQuery}&rdquo;
          </p>

          <div className="space-y-3">
            {results.map((result, index) => (
              <motion.div
                key={result.url}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 group hover:border-nova-gold/30 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Favicon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden mt-0.5">
                    {result.favicon ? (
                      <img
                        src={result.favicon}
                        alt=""
                        className="w-5 h-5"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          // Use safe React rendering instead of innerHTML to prevent XSS
                          const parent = target.parentElement
                          if (parent) {
                            const span = document.createElement('span')
                            span.className = 'text-xs font-bold text-nova-gold'
                            span.textContent = result.host_name?.charAt(0)?.toUpperCase() || '?'
                            parent.appendChild(span)
                          }
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-nova-gold" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Host name */}
                    <p className="text-[10px] text-muted-foreground mb-0.5 truncate">
                      {result.host_name}
                      {result.date && ` · ${new Date(result.date).toLocaleDateString()}`}
                    </p>

                    {/* Title */}
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-nova-gold transition-colors line-clamp-2 group-hover:underline"
                    >
                      {result.name}
                    </a>

                    {/* Snippet */}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {result.snippet}
                    </p>

                    {/* URL + Open button */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground/60 truncate max-w-[70%]">
                        {result.url}
                      </span>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-nova-gold opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Rank badge */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-nova-gold/10 border border-nova-gold/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-nova-gold">{result.rank}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex items-center justify-center"
        >
          <div className="text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nova-gold/10 to-nova-gold/5 flex items-center justify-center mx-auto mb-4 border border-nova-gold/20"
            >
              <Search className="w-8 h-8 text-nova-gold/50" />
            </motion.div>
            <p className="text-sm text-muted-foreground mb-1">Search the web</p>
            <p className="text-xs text-muted-foreground/60">Type a query and press Enter to search</p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
