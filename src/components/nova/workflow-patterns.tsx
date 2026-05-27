'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Clock, TrendingUp, Tag, Layers, Plus } from 'lucide-react'
import { useState, useMemo } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  finance: 'text-emerald-500 bg-emerald-500/10',
  productivity: 'text-nova-gold bg-nova-gold/10',
  learning: 'text-blue-400 bg-blue-400/10',
  communication: 'text-nova-purple bg-nova-purple/10',
  accessibility: 'text-pink-400 bg-pink-400/10',
  development: 'text-cyan-400 bg-cyan-400/10',
  organization: 'text-amber-400 bg-amber-400/10',
}

const CATEGORIES = ['All', 'finance', 'productivity', 'learning', 'communication', 'accessibility', 'development', 'organization']

export function WorkflowPatterns() {
  const { workflowPatterns } = useNovaStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [creatingAutomation, setCreatingAutomation] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return workflowPatterns
    return workflowPatterns.filter(p => p.category === selectedCategory)
  }, [workflowPatterns, selectedCategory])

  const handleCreateAutomation = (patternId: string) => {
    setCreatingAutomation(patternId)
    setTimeout(() => setCreatingAutomation(null), 2000)
  }

  if (workflowPatterns.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-nova-gold/10 to-nova-purple/10 flex items-center justify-center border border-nova-gold/20 mx-auto mb-4"
        >
          <Zap className="w-5 h-5 text-nova-gold" />
        </motion.div>
        <h4 className="text-sm font-semibold text-foreground mb-2">No Patterns Detected Yet</h4>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Keep using NOVA and I&apos;ll learn your workflow patterns. The more you interact, the smarter I get!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
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
            {cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Pattern cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(pattern => (
            <motion.div
              key={pattern.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={{ scale: 1.005, y: -1 }}
              className="glass-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-nova-gold flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-foreground truncate">{pattern.pattern}</h4>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(pattern.lastOccurrence).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{pattern.frequency}x detected</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[pattern.category] || 'text-muted-foreground bg-secondary/30'}`}>
                      {pattern.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                    <Zap className="w-3.5 h-3.5 text-nova-gold flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">{pattern.suggestedAction}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCreateAutomation(pattern.id)}
                  disabled={creatingAutomation === pattern.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${
                    creatingAutomation === pattern.id
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'gold-gradient-bg text-background'
                  }`}
                >
                  {creatingAutomation === pattern.id ? (
                    <>
                      <Tag className="w-3 h-3" />
                      Created!
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Automate
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
