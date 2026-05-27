'use client'

import { useNovaStore, type NovaView } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import {
  MessageSquare, Mic, CheckSquare, Calendar, FileText, Folder, Puzzle,
  LayoutDashboard, Brain, Zap, Timer, Lock, Code, Calculator, Settings,
  Moon, Sun, Plus, Search
} from 'lucide-react'

interface Command {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
  category: string
}

export function CommandPalette() {
  const {
    showCommandPalette,
    toggleCommandPalette,
    setActiveView,
    setDarkMode,
    darkMode,
    personality,
    setPersonality,
    addTask,
    addNote,
  } = useNovaStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = [
    { id: 'nav-chat', label: 'Go to Chat', icon: MessageSquare, shortcut: '1', action: () => setActiveView('chat'), category: 'Navigate' },
    { id: 'nav-voice', label: 'Go to Voice', icon: Mic, shortcut: '2', action: () => setActiveView('voice'), category: 'Navigate' },
    { id: 'nav-tasks', label: 'Go to Tasks', icon: CheckSquare, shortcut: '3', action: () => setActiveView('tasks'), category: 'Navigate' },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: Calendar, shortcut: '4', action: () => setActiveView('calendar'), category: 'Navigate' },
    { id: 'nav-notes', label: 'Go to Notes', icon: FileText, shortcut: '5', action: () => setActiveView('notes'), category: 'Navigate' },
    { id: 'nav-files', label: 'Go to Files', icon: Folder, action: () => setActiveView('files'), category: 'Navigate' },
    { id: 'nav-plugins', label: 'Go to Plugins', icon: Puzzle, action: () => setActiveView('plugins'), category: 'Navigate' },
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => setActiveView('dashboard'), category: 'Navigate' },
    { id: 'nav-knowledge', label: 'Go to Knowledge', icon: Brain, action: () => setActiveView('knowledge'), category: 'Navigate' },
    { id: 'nav-automation', label: 'Go to Automation', icon: Zap, action: () => setActiveView('automation'), category: 'Navigate' },
    { id: 'nav-focus', label: 'Go to Focus Timer', icon: Timer, action: () => setActiveView('focus'), category: 'Navigate' },
    { id: 'nav-vault', label: 'Go to Password Vault', icon: Lock, action: () => setActiveView('vault'), category: 'Navigate' },
    { id: 'nav-code', label: 'Go to Code Playground', icon: Code, action: () => setActiveView('code'), category: 'Navigate' },
    { id: 'nav-calculator', label: 'Go to Calculator', icon: Calculator, action: () => setActiveView('calculator'), category: 'Navigate' },
    { id: 'nav-settings', label: 'Go to Settings', icon: Settings, action: () => setActiveView('settings'), category: 'Navigate' },
    { id: 'toggle-dark', label: `Switch to ${darkMode ? 'Light' : 'Dark'} Mode`, icon: darkMode ? Sun : Moon, shortcut: '⌘D', action: () => setDarkMode(!darkMode), category: 'Action' },
    { id: 'switch-nova', label: 'Switch to Nova Personality', icon: MessageSquare, action: () => setPersonality('nova'), category: 'Action' },
    { id: 'switch-athena', label: 'Switch to Athena Personality', icon: Brain, action: () => setPersonality('athena'), category: 'Action' },
    { id: 'switch-aria', label: 'Switch to Aria Personality', icon: Mic, action: () => setPersonality('aria'), category: 'Action' },
    { id: 'switch-zeus', label: 'Switch to Zeus Personality', icon: Zap, action: () => setPersonality('zeus'), category: 'Action' },
    { id: 'new-task', label: 'New Task', icon: Plus, action: () => {
      addTask({ id: `t-${Date.now()}`, title: 'New Task', description: '', status: 'todo', priority: 'medium', createdAt: new Date() })
      setActiveView('tasks')
    }, category: 'Create' },
    { id: 'new-note', label: 'New Note', icon: Plus, action: () => {
      addNote({ id: `n-${Date.now()}`, title: 'New Note', content: '', category: 'General', createdAt: new Date(), updatedAt: new Date() })
      setActiveView('notes')
    }, category: 'Create' },
  ]

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    if (showCommandPalette) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [showCommandPalette])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const executeCommand = (cmd: Command) => {
    cmd.action()
    toggleCommandPalette()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      toggleCommandPalette()
    }
  }

  return (
    <AnimatePresence>
      {showCommandPalette && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleCommandPalette}
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[15vh] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-card overflow-hidden"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search className="w-4 h-4 text-nova-gold flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="px-2 py-0.5 rounded bg-secondary/50 text-[10px] text-muted-foreground border border-border">ESC</kbd>
            </div>

            {/* Command list */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-foreground">No commands found</p>
                </div>
              )}
              {['Navigate', 'Action', 'Create'].map(category => {
                const categoryCommands = filtered.filter(c => c.category === category)
                if (categoryCommands.length === 0) return null
                return (
                  <div key={category}>
                    <p className="text-[10px] text-muted-foreground font-medium px-3 py-1.5 uppercase tracking-wider">{category}</p>
                    {categoryCommands.map((cmd) => {
                      const idx = filtered.indexOf(cmd)
                      const Icon = cmd.icon
                      return (
                        <motion.button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            idx === selectedIndex ? 'bg-nova-gold/10 text-nova-gold' : 'text-foreground hover:bg-secondary/20'
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm flex-1">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="px-1.5 py-0.5 rounded bg-secondary/30 text-[10px] text-muted-foreground border border-border">{cmd.shortcut}</kbd>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-secondary/30 text-[8px] border border-border">↑↓</kbd> Navigate
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-secondary/30 text-[8px] border border-border">↵</kbd> Execute
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-secondary/30 text-[8px] border border-border">esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
