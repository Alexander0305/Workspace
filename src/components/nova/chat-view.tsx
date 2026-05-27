'use client'

import { useNovaStore, PERSONALITIES, type ChatMessage, type Conversation, type ReasoningStep } from '@/lib/nova-store'
import { useAuth } from '@/lib/auth-context'
import { ThinkingAnimation } from './thinking-animation'
import { SmartGreeting } from './smart-greeting'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Paperclip, Sparkles, Code, BarChart3, PenTool, ChevronDown, ChevronUp, Plus, Trash2, MessageSquare, Volume2, VolumeX, X, Lightbulb, ArrowRight, BookOpen, Copy, Download, Check, FileCode, AlignLeft, Eye, EyeOff } from 'lucide-react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { speak, stopSpeaking } from '@/lib/tts'
import {
  searchKnowledge,
  generateRAGContext,
  extractFacts,
  type KnowledgeDocument,
} from '@/lib/knowledge-engine'
import ReactMarkdown, { type Components } from 'react-markdown'

const QUICK_ACTIONS = [
  { label: 'Summarize', icon: Sparkles, prompt: 'Summarize the following for me:' },
  { label: 'Code', icon: Code, prompt: 'Write code for:' },
  { label: 'Analyze', icon: BarChart3, prompt: 'Analyze the following data:' },
  { label: 'Create', icon: PenTool, prompt: 'Create a detailed plan for:' },
]

const THINKING_STEPS = [
  'Parsing your query...',
  'Retrieving relevant context...',
  'Generating reasoning chain...',
  'Formulating response...',
]

// ── Reasoning Chain ──────────────────────────────────────────────────────────

function ReasoningChain({ steps, expanded: initialExpanded = false }: { steps: ReasoningStep[]; expanded?: boolean }) {
  const [expanded, setExpanded] = useState(initialExpanded)

  const stepIcons: Record<string, string> = {
    parse: '\u2460',
    analyze: '\u2461',
    retrieve: '\u2462',
    reason: '\u2463',
    synthesize: '\u2464',
    verify: '\u2465',
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-nova-gold/70 hover:text-nova-gold transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>Reasoning Steps ({steps.length})</span>
      </button>

      <div className="flex items-center gap-0.5 mt-2 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.step} className="flex items-center">
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                i === steps.length - 1
                  ? 'bg-nova-gold text-background shadow-[0_0_8px_rgba(212,165,116,0.4)]'
                  : i < steps.length - 1
                    ? 'bg-nova-gold/20 text-nova-gold border border-nova-gold/30'
                    : 'bg-secondary/30 text-muted-foreground border border-border'
              }`}
              title={step.description}
            >
              {stepIcons[step.type] || step.step}
            </motion.button>
            {i < steps.length - 1 && (
              <div className="w-4 h-px bg-nova-gold/30 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pl-3 border-l-2 border-nova-gold/20 space-y-2"
          >
            {steps.map(step => (
              <div key={step.step}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-nova-gold">{stepIcons[step.type]} {step.description}</span>
                  <span className="text-[10px] text-muted-foreground">({step.duration}ms)</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)
  const color = percentage >= 80 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    : percentage >= 60 ? 'text-nova-gold bg-nova-gold/10 border-nova-gold/20'
    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}
    >
      <Sparkles className="w-2.5 h-2.5" />
      {percentage}% confident
    </motion.span>
  )
}

// ── Suggested Actions ────────────────────────────────────────────────────────

function SuggestedActions({ actions, onAction }: { actions: string[]; onAction: (action: string) => void }) {
  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      {actions.map(action => (
        <motion.button
          key={action}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onAction(action)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full glass-card text-[10px] text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
        >
          <ArrowRight className="w-2.5 h-2.5" />
          {action}
        </motion.button>
      ))}
    </div>
  )
}

// ── Thinking Bubble ──────────────────────────────────────────────────────────

function ThinkingBubble({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-2"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-nova-gold/70 hover:text-nova-gold transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        <span>Reasoning</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 pl-3 border-l-2 border-nova-gold/20"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">{thinking}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Code Block Component with Copy/Download/Collapse/Line Numbers ────────────

const COLLAPSE_LINE_THRESHOLD = 15
const VISIBLE_LINES_WHEN_COLLAPSED = 8

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)
  const isLong = code.split('\n').length > COLLAPSE_LINE_THRESHOLD
  const [collapsed, setCollapsed] = useState(isLong)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const lineCount = code.split('\n').length

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const extensions: Record<string, string> = {
      javascript: '.js', typescript: '.ts', python: '.py', java: '.java',
      cpp: '.cpp', c: '.c', csharp: '.cs', go: '.go', rust: '.rs',
      ruby: '.rb', php: '.php', swift: '.swift', kotlin: '.kt',
      html: '.html', css: '.css', sql: '.sql', shell: '.sh', bash: '.sh',
      json: '.json', xml: '.xml', yaml: '.yml', markdown: '.md',
      jsx: '.jsx', tsx: '.tsx', vue: '.vue', svelte: '.svelte',
    }
    const ext = extensions[language.toLowerCase()] || '.txt'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nova-code-${Date.now()}${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const lines = code.split('\n')
  const displayLines = collapsed ? lines.slice(0, VISIBLE_LINES_WHEN_COLLAPSED) : lines
  const hiddenLineCount = lineCount - VISIBLE_LINES_WHEN_COLLAPSED

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border bg-[#0d1117]">
      {/* Header bar - ChatGPT/Claude style */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-nova-gold/70" />
          <span className="text-[11px] font-medium text-nova-gold/70 uppercase tracking-wider">{language || 'code'}</span>
          <span className="text-[10px] text-muted-foreground/50">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Line numbers toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
              showLineNumbers
                ? 'text-nova-gold bg-nova-gold/10'
                : 'text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10'
            }`}
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
          >
            {showLineNumbers ? <AlignLeft className="w-3 h-3" /> : <AlignLeft className="w-3 h-3" />}
          </button>
          {/* Expand/Collapse - always visible */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
            title={collapsed ? 'Expand code' : 'Collapse code'}
          >
            {collapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex items-center justify-center p-1.5 rounded text-[10px] text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
            title="Download code"
          >
            <Download className="w-3 h-3" />
          </button>
          {/* Copy - more prominent */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all duration-200 ${
              copied
                ? 'text-emerald-400 bg-emerald-400/15 shadow-[0_0_6px_rgba(52,211,153,0.15)]'
                : 'text-nova-gold/80 bg-nova-gold/10 hover:bg-nova-gold/20 hover:text-nova-gold'
            }`}
            title="Copy code"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      {/* Code content */}
      <div className="relative overflow-x-auto">
        <div
          className={`transition-all duration-300 ${
            collapsed && isLong ? 'max-h-[calc(1.5rem*8+1.5rem)]' : ''
          }`}
        >
          <pre className="p-3 text-[13px] leading-6 font-mono">
            <code className="text-gray-300">
              {displayLines.map((line, i) => (
                <div key={i} className="flex">
                  {showLineNumbers && (
                    <span className="inline-block w-8 mr-4 text-right text-gray-600 select-none flex-shrink-0 text-[12px]">
                      {i + 1}
                    </span>
                  )}
                  <span className="flex-1">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
        {/* Gradient overlay when collapsed */}
        {collapsed && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
        )}
      </div>
      {/* Expand button at bottom when collapsed */}
      {collapsed && isLong && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full py-2 text-[11px] text-nova-gold/70 hover:text-nova-gold bg-[#161b22]/80 border-t border-border transition-colors flex items-center justify-center gap-1.5"
        >
          <ChevronDown className="w-3 h-3" />
          Expand ({hiddenLineCount} more line{hiddenLineCount !== 1 ? 's' : ''})
        </button>
      )}
    </div>
  )
}

// ── Markdown Components for react-markdown ───────────────────────────────────

const markdownComponents: Components = {
  // Code blocks: use our custom CodeBlock component
  code(props) {
    const { children, className, ...rest } = props
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match && !className

    if (isInline) {
      // Inline code styling - GitHub-style
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-nova-gold/10 text-nova-gold-light text-[13px] font-mono border border-nova-gold/10"
          {...rest}
        >
          {children}
        </code>
      )
    }

    // Fenced code block — extract the code string
    const language = match ? match[1] : ''
    const codeString = String(children).replace(/\n$/, '')
    return <CodeBlock code={codeString} language={language} />
  },
  // Pre tag: pass through to code component (don't double-wrap)
  pre(props) {
    return <>{props.children}</>
  },
  // Paragraphs
  p(props) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{props.children}</p>
  },
  // Bold
  strong(props) {
    return <strong className="font-bold text-foreground">{props.children}</strong>
  },
  // Italic
  em(props) {
    return <em className="italic text-foreground/90">{props.children}</em>
  },
  // Headings
  h1(props) {
    return <h1 className="text-xl font-bold mt-4 mb-2 gold-gradient-text">{props.children}</h1>
  },
  h2(props) {
    return <h2 className="text-lg font-bold mt-4 mb-2 text-nova-gold">{props.children}</h2>
  },
  h3(props) {
    return <h3 className="text-base font-semibold mt-3 mb-1.5 text-nova-gold/90">{props.children}</h3>
  },
  h4(props) {
    return <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">{props.children}</h4>
  },
  // Unordered lists
  ul(props) {
    return <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{props.children}</ul>
  },
  // Ordered lists
  ol(props) {
    return <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{props.children}</ol>
  },
  // List items
  li(props) {
    return <li className="text-sm leading-relaxed">{props.children}</li>
  },
  // Links
  a(props) {
    const { href, children } = props
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-nova-gold hover:text-nova-gold-light underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    )
  },
  // Blockquotes
  blockquote(props) {
    return (
      <blockquote className="border-l-3 border-nova-gold/30 pl-4 my-3 italic text-muted-foreground">
        {props.children}
      </blockquote>
    )
  },
  // Strikethrough
  del(props) {
    return <del className="line-through text-muted-foreground">{props.children}</del>
  },
  // Horizontal rule
  hr() {
    return <hr className="border-border my-4" />
  },
  // Table
  table(props) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full text-sm border border-border rounded-lg">{props.children}</table>
      </div>
    )
  },
  thead(props) {
    return <thead className="bg-[#161b22]">{props.children}</thead>
  },
  th(props) {
    return <th className="px-3 py-2 text-left text-nova-gold font-medium border-b border-border">{props.children}</th>
  },
  td(props) {
    return <td className="px-3 py-2 border-b border-border/50">{props.children}</td>
  },
  tr(props) {
    return <tr className="hover:bg-nova-gold/5 transition-colors">{props.children}</tr>
  },
}

// ── Message Content with React-Markdown ──────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  // Check if content contains fenced code blocks — if so, use react-markdown
  // to handle all markdown properly including code blocks
  const hasCodeBlocks = /```\w*/.test(content)

  if (hasCodeBlocks || content.includes('**') || content.includes('*') || content.includes('##') || content.includes('###') || content.includes('- ') || content.includes('1.') || content.includes('>') || content.includes('~~') || content.includes('[')) {
    // Use react-markdown for full markdown rendering
    return (
      <div className="text-sm leading-relaxed">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  // Simple text — just render with basic whitespace handling
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, onTTS, onSuggestedAction, learnedFacts, personalityName, userName }: {
  message: ChatMessage
  onTTS: (text: string) => void
  onSuggestedAction: (action: string) => void
  learnedFacts?: number
  personalityName: string
  userName: string
}) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const [speakingThis, setSpeakingThis] = useState(false)
  const { showConfidence } = useNovaStore()

  const handleTTS = () => {
    if (speakingThis) {
      stopSpeaking()
      setSpeakingThis(false)
    } else {
      onTTS(message.content)
      setSpeakingThis(true)
      setTimeout(() => setSpeakingThis(false), Math.max(message.content.length * 60, 3000))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-1 sm:px-0`}
    >
      <div className={`max-w-[95%] sm:max-w-[80%] ${isUser ? 'message-user px-4 py-3' : 'message-assistant px-4 py-3'}`}>
        {!isUser && message.personality && (
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-xs">{PERSONALITIES[message.personality as keyof typeof PERSONALITIES]?.emoji}</span>
            <span className="text-xs font-medium text-nova-gold/70">{personalityName}</span>
            {showConfidence && message.confidence !== undefined && (
              <ConfidenceBadge confidence={message.confidence} />
            )}
          </div>
        )}
        {isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-medium text-white/60">{userName}</span>
          </div>
        )}
        <MessageContent content={message.content} />

        {message.reasoningSteps && message.reasoningSteps.length > 0 && (
          <ReasoningChain steps={message.reasoningSteps} />
        )}

        {message.thinking && !message.reasoningSteps && <ThinkingBubble thinking={message.thinking} />}

        {learnedFacts && learnedFacts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-500"
          >
            <BookOpen className="w-3 h-3" />
            <span>Learned {learnedFacts} fact{learnedFacts !== 1 ? 's' : ''} from this conversation</span>
          </motion.div>
        )}

        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <SuggestedActions actions={message.suggestedActions} onAction={onSuggestedAction} />
        )}

        <div className={`mt-2 flex items-center ${isUser ? 'justify-end' : 'justify-between'}`}>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {!isUser && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleTTS}
              className={`p-1 rounded transition-colors ${
                speakingThis
                  ? 'text-nova-gold bg-nova-gold/10'
                  : 'text-muted-foreground/50 hover:text-nova-gold hover:bg-nova-gold/10'
              }`}
              title="Read aloud"
            >
              {speakingThis ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Smart Suggestions Bar ────────────────────────────────────────────────────

function SmartSuggestionsBar({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const { smartSuggestionsEnabled } = useNovaStore()
  const [suggestions, setSuggestions] = useState<Array<{ id: string; text: string }>>([])

  useEffect(() => {
    if (smartSuggestionsEnabled) {
      import('@/lib/adaptive-learning').then(({ getSmartSuggestions }) => {
        const smartSuggestions = getSmartSuggestions()
        setSuggestions(smartSuggestions.slice(0, 3))
      })
    }
  }, [smartSuggestionsEnabled])

  if (!smartSuggestionsEnabled || suggestions.length === 0) return null

  return (
    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
      {suggestions.map(s => (
        <motion.button
          key={s.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSuggestionClick(s.text)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card text-xs text-muted-foreground hover:text-nova-gold transition-colors whitespace-nowrap flex-shrink-0 border-nova-gold/20"
        >
          <Lightbulb className="w-3 h-3 text-nova-gold" />
          {s.text}
        </motion.button>
      ))}
    </div>
  )
}

// ── Main ChatView Component ──────────────────────────────────────────────────

export function ChatView() {
  const {
    messages,
    addMessage,
    isThinking,
    setIsThinking,
    personality,
    conversations,
    addConversation,
    deleteConversation,
    activeConversation,
    setActiveConversation,
    knowledgeEntries,
    addKnowledge,
    reasoningDepth,
    userActions,
    detectedPreferences,
    trackAction,
    autoLearnFromChat,
    isFeatureEnabled,
  } = useNovaStore()

  const { authFetch, user } = useAuth()
  const personalityName = PERSONALITIES[personality]?.name || 'Nova'
  const personalityEmoji = PERSONALITIES[personality]?.emoji || '\u2726'
  const userName = user?.name || user?.username || 'there'

  const [input, setInput] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [showConvSidebar, setShowConvSidebar] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [learnedFactsMap, setLearnedFactsMap] = useState<Map<string, number>>(new Map())

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking, scrollToBottom])

  const handleNewChat = () => {
    const conv: Conversation = {
      id: `conv-${Date.now()}`,
      title: `Chat ${conversations.length + 1}`,
      personality,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    }
    addConversation(conv)
    setActiveConversation(conv.id)
  }

  const handleDeleteConv = (id: string) => {
    if (deleteConfirm === id) {
      deleteConversation(id)
      if (activeConversation === id) setActiveConversation(null)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const handleTTS = (text: string) => {
    speak(text, { personality })
  }

  const handleSuggestedAction = (action: string) => {
    setInput(action + ' ')
    textareaRef.current?.focus()
  }

  const handleSmartSuggestionClick = (text: string) => {
    setInput(text)
    textareaRef.current?.focus()
  }

  const handleSend = async () => {
    if (!input.trim() || isThinking) return

    // Check feature flags
    const chatEnabled = isFeatureEnabled('ai.chat')
    if (!chatEnabled) {
      const disabledMsg: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: 'Chat is currently disabled. Please enable the AI chat feature flag in settings.',
        timestamp: new Date(),
        personality,
      }
      addMessage(disabledMsg)
      return
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    addMessage(userMessage)
    setInput('')
    setCharCount(0)
    setIsThinking(true)

    trackAction('chat_send', { content: input.trim().substring(0, 50) })

    // RAG: Search knowledge base
    let ragContext = ''
    const knowledgeRagEnabled = isFeatureEnabled('ai.knowledge_rag')
    if (knowledgeRagEnabled && knowledgeEntries.length > 0) {
      try {
        const documents: KnowledgeDocument[] = knowledgeEntries.map(e => ({
          id: e.id,
          title: e.title,
          content: e.content,
          category: e.category,
          tags: e.tags,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
        }))
        const results = searchKnowledge(input.trim(), documents, 5)
        ragContext = generateRAGContext(results)
      } catch {
        // Non-critical
      }
    }

    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          personality,
          conversationId: activeConversation,
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const assistantId = `msg-${Date.now()}-resp`

      if (res.ok) {
        const data = await res.json()
        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: data.response || 'I understand your query. How can I help further?',
          thinking: undefined,
          timestamp: new Date(),
          personality,
          reasoningSteps: undefined,
          confidence: undefined,
          suggestedActions: undefined,
          queryType: undefined,
        }
        addMessage(assistantMessage)

        // Auto-learn
        const autoLearnEnabled = isFeatureEnabled('ai.auto_learn')
        if (autoLearnEnabled || autoLearnFromChat) {
          try {
            const conversationText = `User: ${userMessage.content}\nAssistant: ${assistantMessage.content}`
            const facts = extractFacts(conversationText)
            const highConfidenceFacts = facts.filter(f => f.confidence >= 0.7)
            if (highConfidenceFacts.length > 0) {
              setLearnedFactsMap(prev => new Map(prev).set(assistantId, highConfidenceFacts.length))
              for (const fact of highConfidenceFacts) {
                addKnowledge({
                  id: `k-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  title: fact.text.slice(0, 60) + (fact.text.length > 60 ? '...' : ''),
                  content: fact.text,
                  category: fact.type === 'preference' ? 'preferences' : fact.type === 'definition' ? 'technical' : 'general',
                  tags: fact.type ? [fact.type] : [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  active: false,
                })
              }
            }
          } catch {
            // Non-critical
          }
        }
      } else {
        const assistantMessage: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: generateFallbackResponse(userMessage.content),
          thinking: 'Analyzed the query pattern and generated a contextual response based on internal knowledge.',
          timestamp: new Date(),
          personality,
        }
        addMessage(assistantMessage)
      }
    } catch {
      const assistantId = `msg-${Date.now()}-resp`
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: generateFallbackResponse(userMessage.content),
        thinking: 'Processed your input locally and formulated a relevant response.',
        timestamp: new Date(),
        personality,
      }
      addMessage(assistantMessage)
    }

    setIsThinking(false)
  }

  const generateFallbackResponse = (userInput: string): string => {
    const lower = userInput.toLowerCase()
    const name = userName
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return `Hello ${name}! I'm ${PERSONALITIES[personality].name}, your Neural Operative Virtual Assistant. How can I help you today?`
    }
    if (lower.includes('code') || lower.includes('program') || lower.includes('function')) {
      return `I'd be happy to help with coding, ${name}! Could you provide more details about what you'd like me to build? I can generate code in multiple languages including TypeScript, Python, Rust, and more.`
    }
    if (lower.includes('analyze') || lower.includes('data')) {
      return `${name}, I can analyze data patterns, generate insights, and provide visualizations. Please share the data or describe what you'd like me to analyze, and I'll process it through my neural reasoning engine.`
    }
    if (lower.includes('summarize') || lower.includes('summary')) {
      return `I'll create a concise summary for you, ${name}. My analysis engine can distill complex information into key points. Please provide the content you'd like summarized.`
    }
    return `I've processed your request, ${name}. As ${PERSONALITIES[personality].name}, I'm ready to assist with a wide range of tasks including code generation, data analysis, content creation, and system management. What would you like to explore next?`
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt + ' ')
    textareaRef.current?.focus()
  }

  const toggleRecording = () => {
    if (!isRecording) {
      const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('')
          setInput(transcript)
          setCharCount(transcript.length)
        }
        recognition.onend = () => setIsRecording(false)
        recognition.onerror = () => setIsRecording(false)
        recognition.start()
        setIsRecording(true)
      }
    } else {
      setIsRecording(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation sidebar - responsive */}
      <AnimatePresence>
        {showConvSidebar && (
          <>
            {/* Mobile overlay - full screen backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
              onClick={() => setShowConvSidebar(false)}
            />
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col border-r border-border overflow-hidden flex-shrink-0 fixed lg:relative z-40 h-full bg-background w-[260px] lg:w-[260px]"
            >
              <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-semibold text-foreground">Conversations</span>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNewChat}
                    className="p-1 rounded-lg text-nova-gold hover:bg-nova-gold/10"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowConvSidebar(false)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                  <motion.button
                    key={conv.id}
                    whileHover={{ x: 2 }}
                    onClick={() => { setActiveConversation(conv.id); setShowConvSidebar(false) }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all group relative ${
                      activeConversation === conv.id
                        ? 'bg-nova-gold/10 border border-nova-gold/30'
                        : 'hover:bg-secondary/20 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px]">{PERSONALITIES[conv.personality]?.emoji}</span>
                          <span className="text-[10px] text-muted-foreground">{conv.messageCount} msgs</span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv.id) }}
                        className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          deleteConfirm === conv.id ? 'opacity-100 text-destructive' : 'text-muted-foreground hover:text-destructive'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex flex-col h-full flex-1 min-w-0 overflow-hidden">
        {/* Chat header - compact on mobile */}
        <div className="px-2 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 flex-shrink-0 border-b border-border/50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConvSidebar(!showConvSidebar)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </motion.button>
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
              Talking to <span className="text-nova-gold font-medium">{personalityEmoji} {personalityName}</span>
              {user && (
                <> as <span className="text-foreground font-medium">{userName}</span></>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <span className="hidden sm:inline">{reasoningDepth === 'deep' ? 'Deep' : reasoningDepth === 'quick' ? 'Quick' : 'Balanced'} reasoning</span>
          </div>
        </div>

        {/* Messages area - properly scrollable with h-full chain */}
        <div
          ref={messagesContainerRef}
          className="flex-1 h-0 overflow-y-auto px-3 sm:px-4 lg:px-6 scroll-smooth"
        >
          <div className="py-4 space-y-1">
            {messages.length === 0 && (
              <SmartGreeting onSuggestionClick={handleSmartSuggestionClick} />
            )}

            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onTTS={handleTTS}
                onSuggestedAction={handleSuggestedAction}
                learnedFacts={learnedFactsMap.get(msg.id)}
                personalityName={personalityName}
                userName={userName}
              />
            ))}

            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="message-assistant max-w-[95%] sm:max-w-[80%] px-4 py-3"
                >
                  <ThinkingAnimation
                    steps={THINKING_STEPS}
                    isThinking={isThinking}
                    personalityName={personalityName}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - properly sized on mobile */}
        <div className="px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 flex-shrink-0">
          {/* Smart suggestions bar */}
          {messages.length > 0 && <SmartSuggestionsBar onSuggestionClick={handleSmartSuggestionClick} />}

          {/* Quick action chips - wrap properly on small screens */}
          {messages.length > 0 && (
            <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-3 overflow-x-auto pb-1 -mx-1 px-1 flex-wrap sm:flex-nowrap">
              {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickAction(prompt)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full glass-card text-[11px] sm:text-xs text-muted-foreground hover:text-nova-gold transition-colors whitespace-nowrap flex-shrink-0"
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </motion.button>
              ))}
            </div>
          )}

          {/* Input box */}
          <div className="glass-card focus-gold p-1.5 sm:p-2 transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); setCharCount(e.target.value.length) }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${personalityName}...`}
              rows={1}
              className="w-full bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[36px] sm:min-h-[40px] max-h-[120px]"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 120) + 'px'
              }}
            />
            <div className="flex items-center justify-between pt-0.5 sm:pt-1">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRecording}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                    isRecording
                      ? 'text-nova-purple bg-nova-purple/10 purple-glow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </motion.button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`text-[9px] sm:text-[10px] ${charCount > 4000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {charCount}/4000
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isThinking}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                    input.trim() && !isThinking
                      ? 'gold-gradient-bg text-background shadow-[0_0_10px_rgba(212,165,116,0.3)]'
                      : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
