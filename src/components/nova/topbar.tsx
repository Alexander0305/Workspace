'use client'

import { useNovaStore, type NovaView } from '@/lib/nova-store'
import { PersonalitySwitcher } from './personality-switcher'
import { motion } from 'framer-motion'
import { Search, Bell, Moon, Sun, Menu } from 'lucide-react'
import { useEffect, useRef } from 'react'

const VIEW_TITLES: Record<NovaView, string> = {
  chat: 'Chat',
  voice: 'Voice',
  tasks: 'Tasks',
  calendar: 'Calendar',
  notes: 'Notes',
  files: 'Files',
  plugins: 'Plugins',
  dashboard: 'Dashboard',
  knowledge: 'Knowledge',
  automation: 'Automation',
  focus: 'Focus Timer',
  vault: 'Password Vault',
  code: 'Code Playground',
  calculator: 'Calculator',
  settings: 'Settings',
  admin: 'Admin Panel',
  websearch: 'Web Search',
  imagegen: 'Image Generation',
  videogen: 'Video Generation',
  promptenhancer: 'Prompt Enhancer',
  templates: 'Prompt Templates',
  aiproviders: 'AI Providers',
  integrations: 'Integrations',
}

export function Topbar() {
  const {
    activeView,
    darkMode,
    setDarkMode,
    searchQuery,
    setSearchQuery,
    showSearch,
    setShowSearch,
    setMobileSidebarOpen,
    notifications,
    showNotifications,
    setShowNotifications,
    toggleCommandPalette,
  } = useNovaStore()

  const unreadCount = notifications.filter(n => !n.read).length
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleCommandPalette])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 flex items-center gap-4 px-4 lg:px-6 glass-card border-b border-border rounded-none"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,10,0.8)' }}
    >
      {/* Mobile menu button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      {/* View title */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">{VIEW_TITLES[activeView]}</h2>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-nova-gold/50">/</span>
          <span>NOVA</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-auto hidden sm:block">
        <div className={`relative flex items-center rounded-lg border transition-all duration-200 ${
          showSearch ? 'border-nova-gold/40 bg-secondary/50 focus-gold' : 'border-border bg-secondary/20'
        }`}>
          <Search className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search everything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={toggleCommandPalette}
            className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 mr-2 rounded bg-secondary/50 text-[10px] text-muted-foreground border border-border hover:border-nova-gold/30 transition-colors"
          >
            ⌘K
          </button>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <PersonalitySwitcher />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-nova-purple text-[10px] font-bold text-white flex items-center justify-center"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </motion.button>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-gold to-nova-gold-dark flex items-center justify-center text-xs font-bold text-background cursor-pointer"
        >
          N
        </motion.div>
      </div>
    </motion.header>
  )
}
