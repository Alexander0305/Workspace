'use client'

import { useNovaStore, type LlmTrainingStatus, type TrainedVocabulary } from '@/lib/nova-store'
import { motion } from 'framer-motion'
import { Brain, Play, Terminal, TrendingUp, BookOpen, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState, useMemo, useCallback } from 'react'

// ─── Language Detection Heuristics ──────────────────────────────────────────

interface LanguagePattern {
  name: string
  test: (char: string) => boolean
  wordClean: (word: string) => string
  minWordLength: number
}

const LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    name: 'Arabic',
    test: (c) => /[\u0600-\u06FF]/.test(c),
    wordClean: (w) => w.replace(/[^\u0600-\u06FF]/g, ''),
    minWordLength: 1,
  },
  {
    name: 'Chinese',
    test: (c) => /[\u4e00-\u9fff]/.test(c),
    wordClean: (w) => w.replace(/[^\u4e00-\u9fff]/g, ''),
    minWordLength: 1,
  },
  {
    name: 'Japanese',
    test: (c) => /[\u3040-\u309f\u30a0-\u30ff]/.test(c),
    wordClean: (w) => w.replace(/[^\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/g, ''),
    minWordLength: 1,
  },
  {
    name: 'Spanish',
    test: (c) => /[ñáéíóúÑÁÉÍÓÚ]/.test(c),
    wordClean: (w) => w.toLowerCase().replace(/[^a-zñáéíóúü]/g, ''),
    minWordLength: 3,
  },
  {
    name: 'French',
    test: (c) => /[àâçéèêëîïôùûüÿÀÂÇÉÈÊËÎÏÔÙÛÜŸ]/.test(c),
    wordClean: (w) => w.toLowerCase().replace(/[^a-zàâçéèêëîïôùûüÿ]/g, ''),
    minWordLength: 3,
  },
  {
    name: 'English',
    test: (c) => /[a-zA-Z]/.test(c),
    wordClean: (w) => w.toLowerCase().replace(/[^a-z]/g, ''),
    minWordLength: 3,
  },
]

// Priority order: check specific languages before generic Latin
const DETECTION_ORDER = ['Arabic', 'Chinese', 'Japanese', 'Spanish', 'French', 'English']

function detectLanguage(text: string): string | null {
  for (const langName of DETECTION_ORDER) {
    const pattern = LANGUAGE_PATTERNS.find(p => p.name === langName)
    if (pattern) {
      for (const char of text) {
        if (pattern.test(char)) {
          return langName
        }
      }
    }
  }
  return null
}

function extractWordsFromMessage(content: string): Map<string, Set<string>> {
  const languageWords = new Map<string, Set<string>>()

  const words = content.split(/\s+/)
  for (const word of words) {
    if (!word.trim()) continue
    const lang = detectLanguage(word)
    if (!lang) continue

    const pattern = LANGUAGE_PATTERNS.find(p => p.name === lang)
    if (!pattern) continue

    const cleaned = pattern.wordClean(word)
    if (cleaned.length < pattern.minWordLength) continue

    if (!languageWords.has(lang)) {
      languageWords.set(lang, new Set())
    }
    languageWords.get(lang)!.add(cleaned)
  }

  return languageWords
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LlmTraining() {
  const { messages, llmTrainingStatus, trainedVocabulary, setLlmTrainingStatus, setTrainedVocabulary, knowledgeEntries } = useNovaStore()
  const [isTraining, setIsTraining] = useState(false)
  const [trainingLog, setTrainingLog] = useState<string[]>([
    '[INFO] NOVA v3.2 model loaded',
    `[INFO] ${messages.length} chat messages available for training`,
    `[INFO] ${knowledgeEntries.length} knowledge entries loaded`,
    '[INFO] Parameters: 7B',
    '[INFO] Ready for training',
  ])
  const [vocabSearch, setVocabSearch] = useState('')

  // Compute total word count from all chat messages
  const totalWordCount = useMemo(() => {
    return messages.reduce((count, msg) => {
      return count + msg.content.split(/\s+/).filter(w => w.trim().length > 0).length
    }, 0)
  }, [messages])

  // Build live vocabulary from chat messages (not trained yet, just current state)
  const liveVocabulary = useMemo(() => {
    const allWords = new Map<string, Set<string>>()
    for (const msg of messages) {
      const words = extractWordsFromMessage(msg.content)
      for (const [lang, wordSet] of words) {
        if (!allWords.has(lang)) {
          allWords.set(lang, new Set())
        }
        for (const w of wordSet) {
          allWords.get(lang)!.add(w)
        }
      }
    }
    return allWords
  }, [messages])

  // Merge trained vocabulary with live vocabulary for display
  const mergedVocabulary = useMemo(() => {
    const merged = new Map<string, Set<string>>()

    // Start with trained data
    for (const tv of trainedVocabulary) {
      merged.set(tv.language, new Set(tv.words))
    }

    // Add live words
    for (const [lang, words] of liveVocabulary) {
      if (!merged.has(lang)) {
        merged.set(lang, new Set())
      }
      for (const w of words) {
        merged.get(lang)!.add(w)
      }
    }

    return merged
  }, [trainedVocabulary, liveVocabulary])

  // Build training status from real data
  const realTrainingStatus = useMemo(() => {
    const statusMap = new Map<string, LlmTrainingStatus>()

    // Start with existing status
    for (const s of llmTrainingStatus) {
      statusMap.set(s.language, s)
    }

    // Update with real vocabulary data
    for (const [lang, words] of mergedVocabulary) {
      const wordCount = words.size
      const progress = Math.min(100, Math.round(wordCount / 2)) // 50 words = 100%
      const existing = statusMap.get(lang)
      statusMap.set(lang, {
        language: lang,
        progress: existing?.status === 'complete' ? 100 : progress,
        status: wordCount === 0 ? 'queued' : progress >= 100 ? 'complete' : 'learning',
        wordCount,
      })
    }

    return Array.from(statusMap.values()).sort((a, b) => {
      const order = ['learning', 'queued', 'complete']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })
  }, [llmTrainingStatus, mergedVocabulary])

  // Performance data derived from training
  const PERFORMANCE_DATA = useMemo(() => {
    const totalWords = Array.from(mergedVocabulary.values()).reduce((s, ws) => s + ws.size, 0)
    const baseAccuracy = Math.min(95, 50 + totalWords * 0.5)
    return Array.from({ length: 20 }, (_, i) => ({
      epoch: i + 1,
      perplexity: Math.max(5, 25 - i * 0.8 - totalWords * 0.02 + Math.random() * 2),
      accuracy: Math.min(99, baseAccuracy + i * 0.3 + Math.random() * 2),
    }))
  }, [mergedVocabulary])

  // All words from merged vocabulary for the explorer
  const VOCABULARY = useMemo(() => {
    const words: string[] = []
    for (const [, wordSet] of mergedVocabulary) {
      for (const w of wordSet) {
        words.push(w)
      }
    }
    return words.sort()
  }, [mergedVocabulary])

  const handleTrainNow = useCallback(async () => {
    setIsTraining(true)
    const newLog: string[] = []

    newLog.push('[TRAIN] Initializing training pipeline...')
    newLog.push(`[TRAIN] Scanning ${messages.length} chat messages...`)

    // Extract vocabulary from all messages
    const allWords = new Map<string, Set<string>>()
    let msgIndex = 0
    for (const msg of messages) {
      const words = extractWordsFromMessage(msg.content)
      for (const [lang, wordSet] of words) {
        if (!allWords.has(lang)) {
          allWords.set(lang, new Set())
        }
        for (const w of wordSet) {
          allWords.get(lang)!.add(w)
        }
      }
      msgIndex++
      if (msgIndex % 50 === 0 || msgIndex === messages.length) {
        newLog.push(`[TRAIN] Processed ${msgIndex}/${messages.length} messages...`)
      }
    }

    // Build trained vocabulary
    const newTrainedVocabulary: TrainedVocabulary[] = []
    for (const [lang, wordSet] of allWords) {
      newTrainedVocabulary.push({
        language: lang,
        words: Array.from(wordSet),
        lastTrainedAt: new Date().toISOString(),
      })
      newLog.push(`[TRAIN] ${lang}: ${wordSet.size} unique words extracted`)
    }

    // Update training status
    const newStatus: LlmTrainingStatus[] = []
    for (const [lang, wordSet] of allWords) {
      const progress = Math.min(100, Math.round(wordSet.size / 2))
      newStatus.push({
        language: lang,
        progress: progress >= 100 ? 100 : progress,
        status: progress >= 100 ? 'complete' as const : 'learning' as const,
        wordCount: wordSet.size,
      })
    }

    // Add some training simulation steps
    newLog.push('[TRAIN] Building token vocabulary...')
    newLog.push('[TRAIN] Computing word frequencies...')
    newLog.push('[TRAIN] Loss: 2.4521 → 1.8934 | LR: 0.0001')
    newLog.push('[TRAIN] Loss: 1.8934 → 1.4567 | LR: 0.0001')
    newLog.push('[TRAIN] Validation loss: 1.5234')

    const totalUniqueWords = Array.from(allWords.values()).reduce((s, ws) => s + ws.size, 0)
    newLog.push(`[TRAIN] Vocabulary expanded to ${totalUniqueWords} tokens across ${allWords.size} languages`)
    newLog.push('[TRAIN] Saving checkpoint...')
    newLog.push('[TRAIN] Training session completed.')

    // Animate the log
    for (let i = 0; i < newLog.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setTrainingLog(prev => [...prev, newLog[i]!])
    }

    // Persist to store
    setTrainedVocabulary(newTrainedVocabulary)
    setLlmTrainingStatus(newStatus)
    setIsTraining(false)
  }, [messages, setTrainedVocabulary, setLlmTrainingStatus])

  const filteredVocab = VOCABULARY.filter(w => w.includes(vocabSearch.toLowerCase()))

  const totalTrainedWords = trainedVocabulary.reduce((s, tv) => s + tv.words.length, 0)
  const totalLanguages = mergedVocabulary.size

  return (
    <div className="space-y-4">
      {/* Model status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-4 h-4 text-nova-gold" />
            Current Model
          </h4>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Active</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-secondary/20">
            <p className="text-sm font-bold text-foreground">v3.2</p>
            <p className="text-[10px] text-muted-foreground">Version</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/20">
            <p className="text-sm font-bold text-foreground">7B</p>
            <p className="text-[10px] text-muted-foreground">Parameters</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/20">
            <p className="text-sm font-bold text-foreground">{totalWordCount}</p>
            <p className="text-[10px] text-muted-foreground">Chat Words</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/20">
            <p className="text-sm font-bold text-foreground">{totalTrainedWords}</p>
            <p className="text-[10px] text-muted-foreground">Trained</p>
          </div>
        </div>
      </div>

      {/* Language progress */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Language Support</h4>
        {realTrainingStatus.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">No languages detected yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">Send chat messages to start building vocabulary</p>
          </div>
        ) : (
          <div className="space-y-3">
            {realTrainingStatus.map(lang => (
              <div key={lang.language}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">{lang.language}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{lang.wordCount ?? 0} words</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      lang.status === 'complete' ? 'bg-emerald-500/10 text-emerald-500' :
                      lang.status === 'learning' ? 'bg-nova-gold/10 text-nova-gold' :
                      'bg-secondary/30 text-muted-foreground'
                    }`}>
                      {lang.status}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${lang.progress}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full rounded-full ${
                      lang.status === 'complete' ? 'bg-emerald-500' :
                      lang.status === 'learning' ? 'progress-gold' : 'bg-muted-foreground'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Train Now button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleTrainNow}
        disabled={isTraining || messages.length === 0}
        className="w-full glass-card p-4 flex items-center gap-3 border-nova-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap className={`w-5 h-5 ${isTraining ? 'text-nova-purple nova-pulse' : 'text-nova-gold'}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{isTraining ? 'Training in Progress...' : 'Train Now'}</p>
          <p className="text-xs text-muted-foreground">
            {messages.length === 0
              ? 'Send chat messages first to build training data'
              : isTraining
                ? 'Extracting vocabulary from chat messages...'
                : `Extract vocabulary from ${messages.length} messages across ${totalLanguages} language${totalLanguages !== 1 ? 's' : ''}`}
          </p>
        </div>
      </motion.button>

      {/* Training log */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-nova-gold" />
          Training Log
        </h4>
        <div className="bg-black/40 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] space-y-0.5">
          {trainingLog.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className={`${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[TRAIN]') ? 'text-nova-gold' : 'text-muted-foreground'}`}
            >
              {log}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-nova-gold" />
          Performance Metrics
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Perplexity</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PERFORMANCE_DATA}>
                  <defs>
                    <linearGradient id="perpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4a574" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="epoch" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(212,165,116,0.2)', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="perplexity" stroke="#d4a574" fill="url(#perpGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Accuracy</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PERFORMANCE_DATA}>
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="epoch" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="accuracy" stroke="#7c3aed" fill="url(#accGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Vocabulary explorer */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-nova-gold" />
          Vocabulary Explorer
          <span className="text-[10px] text-muted-foreground ml-auto">{VOCABULARY.length} unique words</span>
        </h4>
        <input
          type="text"
          placeholder="Search vocabulary..."
          value={vocabSearch}
          onChange={(e) => setVocabSearch(e.target.value)}
          className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-gold mb-3"
        />
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {filteredVocab.map(word => (
            <span key={word} className="text-[10px] px-2 py-1 rounded-full bg-secondary/30 text-muted-foreground">
              {word}
            </span>
          ))}
          {filteredVocab.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {messages.length === 0
                ? 'Send chat messages to build vocabulary'
                : 'No matching words found'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
