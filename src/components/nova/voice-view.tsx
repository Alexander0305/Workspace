'use client'

import { useNovaStore } from '@/lib/nova-store'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Settings, Volume2, VolumeX, Clock, CheckSquare, Sun, Moon, Terminal, Sparkles, MessageSquare } from 'lucide-react'
import { speak, stopSpeaking } from '@/lib/tts'

interface VoiceCommand {
  id: string
  text: string
  timestamp: Date
  response: string
  executed?: boolean
  actionType?: string
}

const COMMAND_PATTERNS: Array<{
  patterns: string[]
  type: string
  extractAction: (text: string) => { action: string; params: Record<string, string> }
}> = [
  {
    patterns: ['switch to', 'go to', 'open', 'show', 'navigate to'],
    type: 'navigation',
    extractAction: (text) => {
      const views = ['chat', 'voice', 'tasks', 'calendar', 'notes', 'files', 'plugins', 'dashboard', 'knowledge', 'automation', 'focus', 'vault', 'code', 'calculator', 'settings']
      const lower = text.toLowerCase()
      const matchedView = views.find(v => lower.includes(v))
      return { action: 'switch_view', params: { view: matchedView || 'chat' } }
    },
  },
  {
    patterns: ['create a task', 'add task', 'new task', 'create task'],
    type: 'task',
    extractAction: (text) => {
      const match = text.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(?:called|named|for|about)?\s*(.+)/i)
      return { action: 'create_task', params: { title: match?.[1]?.trim() || 'New task' } }
    },
  },
  {
    patterns: ['set timer', 'start timer', 'focus timer'],
    type: 'timer',
    extractAction: (text) => {
      const match = text.match(/(\d+)\s*(?:minute|min|m)/i)
      return { action: 'start_timer', params: { minutes: match?.[1] || '25' } }
    },
  },
  {
    patterns: ['what time', 'current time', 'time is it'],
    type: 'time',
    extractAction: () => ({ action: 'tell_time', params: {} }),
  },
  {
    patterns: ['dark mode', 'light mode'],
    type: 'theme',
    extractAction: (text) => ({
      action: 'toggle_theme',
      params: { mode: text.toLowerCase().includes('dark') ? 'dark' : 'light' },
    }),
  },
  {
    patterns: ['switch to nova', 'switch to athena', 'switch to aria', 'switch to zeus', 'use nova', 'use athena', 'use aria', 'use zeus'],
    type: 'personality',
    extractAction: (text) => {
      const lower = text.toLowerCase()
      const personality = ['nova', 'athena', 'aria', 'zeus'].find(p => lower.includes(p))
      return { action: 'switch_personality', params: { personality: personality || 'nova' } }
    },
  },
  {
    patterns: ['tell me about', 'explain', 'what is', 'who is'],
    type: 'chat',
    extractAction: (text) => ({ action: 'add_to_chat', params: { text } }),
  },
]

function classifyCommand(text: string): { type: string; action: string; params: Record<string, string> } | null {
  const lower = text.toLowerCase()
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.patterns.some(p => lower.includes(p))) {
      const result = pattern.extractAction(text)
      return { type: pattern.type, ...result }
    }
  }
  return null
}

const VOICE_COMMAND_HISTORY_KEY = 'nova-voice-history'

function loadCommandHistory(): VoiceCommand[] {
  try {
    const stored = localStorage.getItem(VOICE_COMMAND_HISTORY_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Invalid data
  }
  return []
}

function saveCommandHistory(commands: VoiceCommand[]) {
  try {
    localStorage.setItem(VOICE_COMMAND_HISTORY_KEY, JSON.stringify(commands.slice(0, 20)))
  } catch {
    // Storage full
  }
}

export function VoiceView() {
  const {
    isListening, setIsListening, personality,
    ttsEnabled, setTtsEnabled,
    setActiveView, addTask, setDarkMode, setPersonality,
    setFocusTimerActive, setFocusTimerTime,
    addMessage,
    trackAction,
  } = useNovaStore()

  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [transcript, setTranscript] = useState('')
  const [commands, setCommands] = useState<VoiceCommand[]>(loadCommandHistory)
  const [wakeWord, setWakeWord] = useState('Hey Nova')
  const [sensitivity, setSensitivity] = useState(70)
  const [lastCommandFeedback, setLastCommandFeedback] = useState<string | null>(null)
  const recognitionRef = useRef<unknown>(null)

  const executeCommand = useCallback((text: string) => {
    const command = classifyCommand(text)
    if (!command) {
      const response = `I heard: "${text}". I'm not sure how to execute that as a command, but I can add it to our chat.`
      setLastCommandFeedback(response)
      if (ttsEnabled) speak(response, { personality })
      return
    }

    let response = ''
    let executed = false

    switch (command.action) {
      case 'switch_view':
        setActiveView(command.params.view as 'chat' | 'voice' | 'tasks' | 'calendar' | 'notes' | 'files' | 'plugins' | 'dashboard' | 'knowledge' | 'automation' | 'focus' | 'vault' | 'code' | 'calculator' | 'settings')
        response = `Switching to ${command.params.view} view.`
        executed = true
        trackAction('voice_command', { command: 'switch_view', view: command.params.view })
        break
      case 'create_task': {
        const title = command.params.title
        addTask({
          id: `t-${Date.now()}`,
          title,
          description: `Created via voice command`,
          status: 'todo',
          priority: 'medium',
          createdAt: new Date(),
        })
        response = `Task "${title}" created successfully.`
        executed = true
        trackAction('voice_command', { command: 'create_task', title })
        break
      }
      case 'start_timer': {
        const minutes = parseInt(command.params.minutes, 10)
        setFocusTimerTime(minutes, 0)
        setFocusTimerActive(true)
        response = `Starting focus timer for ${minutes} minutes. Stay focused!`
        executed = true
        trackAction('voice_command', { command: 'start_timer', minutes })
        break
      }
      case 'tell_time': {
        const now = new Date()
        response = `It's currently ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${now.toLocaleDateString()}.`
        executed = true
        break
      }
      case 'toggle_theme': {
        const isDark = command.params.mode === 'dark'
        setDarkMode(isDark)
        response = `${isDark ? 'Dark' : 'Light'} mode activated.`
        executed = true
        trackAction('voice_command', { command: 'toggle_theme', mode: command.params.mode })
        break
      }
      case 'switch_personality': {
        const newPersonality = command.params.personality as 'nova' | 'athena' | 'aria' | 'zeus'
        setPersonality(newPersonality)
        response = `Switched to ${newPersonality.charAt(0).toUpperCase() + newPersonality.slice(1)} personality.`
        executed = true
        trackAction('voice_command', { command: 'switch_personality', personality: newPersonality })
        break
      }
      case 'add_to_chat': {
        const msg = {
          id: `msg-${Date.now()}`,
          role: 'user' as const,
          content: text,
          timestamp: new Date(),
        }
        addMessage(msg)
        response = `Added to chat. Switch to the chat view to continue.`
        executed = true
        trackAction('voice_command', { command: 'add_to_chat' })
        break
      }
    }

    setLastCommandFeedback(response)
    if (ttsEnabled) {
      setStatus('speaking')
      speak(response, { personality })
      setTimeout(() => setStatus('idle'), 3000)
    }

    const newCommands = [{
      id: `cmd-${Date.now()}`,
      text,
      timestamp: new Date(),
      response,
      executed,
      actionType: command.type,
    }, ...commands].slice(0, 20)

    setCommands(newCommands)
    saveCommandHistory(newCommands)
  }, [ttsEnabled, personality, setActiveView, addTask, setDarkMode, setPersonality, setFocusTimerActive, setFocusTimerTime, addMessage, trackAction, commands])

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const t = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setTranscript(t)
    }

    recognition.onend = () => {
      setIsListening(false)
      setStatus('processing')

      setTranscript(prev => {
        if (prev.trim()) {
          setTimeout(() => {
            executeCommand(prev.trim())
            setStatus('idle')
          }, 800)
        } else {
          setStatus('idle')
        }
        return prev
      })
    }

    recognition.onerror = () => {
      setIsListening(false)
      setStatus('idle')
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
    setStatus('listening')
    trackAction('voice_command', { command: 'start_listening' })
  }, [setIsListening, executeCommand, trackAction])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop()
    }
    setIsListening(false)
    setStatus('processing')
    setTimeout(() => setStatus('idle'), 1500)
  }, [setIsListening])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        (recognitionRef.current as { stop: () => void }).stop()
      }
    }
  }, [])

  const statusText: Record<string, string> = {
    idle: 'Ready',
    listening: 'Listening...',
    processing: 'Processing...',
    speaking: 'Speaking...',
  }

  const actionTypeIcons: Record<string, React.ElementType> = {
    navigation: MessageSquare,
    task: CheckSquare,
    timer: Clock,
    time: Clock,
    theme: Sun,
    personality: Sparkles,
    chat: Terminal,
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Main mic button */}
        <motion.div
          animate={isListening ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative mb-8"
        >
          {isListening && (
            <>
              <motion.div
                animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-nova-purple"
                style={{ margin: '-20px' }}
              />
              <motion.div
                animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="absolute inset-0 rounded-full border border-nova-purple/50"
                style={{ margin: '-20px' }}
              />
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-gradient-to-br from-nova-purple to-nova-purple-light shadow-[0_0_40px_rgba(124,58,237,0.4)]'
                : 'bg-secondary/50 border-2 border-nova-gold/30 hover:border-nova-gold/60 shadow-[0_0_20px_rgba(212,165,116,0.1)]'
            }`}
          >
            {isListening ? (
              <MicOff className="w-10 h-10 text-white" />
            ) : (
              <Mic className="w-10 h-10 text-nova-gold" />
            )}
          </motion.button>
        </motion.div>

        <motion.p
          animate={{ opacity: status === 'idle' ? 0.6 : 1 }}
          className="text-sm font-medium text-nova-gold mb-2"
        >
          {statusText[status]}
        </motion.p>

        {/* Waveform */}
        <div className="flex items-center gap-1 h-12 mb-6">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={isListening ? {
                height: [8, 12 + Math.random() * 28, 8],
                opacity: [0.3, 1, 0.3],
              } : { height: 8, opacity: 0.2 }}
              transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: isListening ? Infinity : 0,
                delay: i * 0.05,
                ease: 'easeInOut',
              }}
              className="w-1.5 rounded-full bg-nova-purple/60"
              style={{ height: 8 }}
            />
          ))}
        </div>

        {/* Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-lg mb-4"
            >
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Transcription</p>
                <p className="text-sm text-foreground">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command execution feedback */}
        <AnimatePresence>
          {lastCommandFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-full max-w-lg mb-4"
            >
              <div className="glass-card p-4 border-nova-gold/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-nova-gold" />
                  <span className="text-xs font-medium text-nova-gold">Command Executed</span>
                </div>
                <p className="text-sm text-foreground">{lastCommandFeedback}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice command hints */}
        <div className="w-full max-w-lg mb-4">
          <p className="text-[10px] text-muted-foreground text-center mb-2">Try saying:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {[
              'Switch to dashboard',
              'Create a task',
              'Set timer for 25 minutes',
              'What time is it?',
              'Dark mode on',
              'Switch to Athena',
            ].map(hint => (
              <span key={hint} className="text-[10px] px-2 py-1 rounded-full bg-secondary/20 text-muted-foreground">
                &quot;{hint}&quot;
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto">
        {/* Voice settings */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-nova-gold" />
            <h3 className="text-sm font-semibold text-foreground">Voice Settings</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Wake Word</span>
              <input
                type="text"
                value={wakeWord}
                onChange={(e) => setWakeWord(e.target.value)}
                className="bg-secondary/50 border border-border rounded-lg px-3 py-1 text-xs text-foreground text-right w-28 focus-gold outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Sensitivity</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="w-20 accent-nova-gold"
                />
                <span className="text-xs text-foreground w-8 text-right">{sensitivity}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Voice Output (TTS)</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className="p-1 rounded-lg hover:bg-secondary/30"
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4 text-nova-gold" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              </motion.button>
            </div>
            {ttsEnabled && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Test Voice</span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const personalityNames: Record<string, string> = { nova: 'Nova', athena: 'Athena', aria: 'Aria', zeus: 'Zeus' }
                    const msg = `Hello! I'm ${personalityNames[personality] || 'Nova'}, your AI assistant. How can I help?`
                    speak(msg, { personality })
                  }}
                  className="px-3 py-1 rounded-lg gold-gradient-bg text-background text-xs font-medium"
                >
                  Test
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Command history */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-nova-gold" />
            <h3 className="text-sm font-semibold text-foreground">Recent Commands</h3>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {commands.length > 0 ? commands.map(cmd => {
              const ActionIcon = cmd.actionType ? actionTypeIcons[cmd.actionType] || Mic : Mic
              return (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-2 p-2 rounded-lg ${cmd.executed ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-secondary/20'}`}
                >
                  <ActionIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${cmd.executed ? 'text-emerald-500' : 'text-nova-purple'}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">&quot;{cmd.text}&quot;</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cmd.response}</p>
                  </div>
                  {cmd.executed && (
                    <CheckSquare className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  )}
                </motion.div>
              )
            }) : (
              <p className="text-xs text-muted-foreground text-center py-4">No voice commands yet. Try saying something!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
