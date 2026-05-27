'use client'

import { useNovaStore, PERSONALITIES, type NovaView } from '@/lib/nova-store'
import { useAuth } from '@/lib/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Mic,
  CheckSquare,
  Calendar,
  FileText,
  Folder,
  Puzzle,
  LayoutDashboard,
  Brain,
  Zap,
  Timer,
  Lock,
  Code,
  Calculator,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Globe,
  ImageIcon,
  Video,
  Wand2,
  LayoutList,
  Key,
} from 'lucide-react'

interface NavSection {
  label: string
  items: { view: NovaView; icon: React.ElementType; label: string; adminOnly?: boolean }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Core',
    items: [
      { view: 'chat', icon: MessageSquare, label: 'Chat' },
      { view: 'voice', icon: Mic, label: 'Voice' },
      { view: 'tasks', icon: CheckSquare, label: 'Tasks' },
      { view: 'calendar', icon: Calendar, label: 'Calendar' },
      { view: 'notes', icon: FileText, label: 'Notes' },
    ],
  },
  {
    label: 'AI',
    items: [
      { view: 'websearch', icon: Globe, label: 'Web Search' },
      { view: 'imagegen', icon: ImageIcon, label: 'Image Gen' },
      { view: 'videogen', icon: Video, label: 'Video Gen' },
      { view: 'promptenhancer', icon: Wand2, label: 'Prompt Enhance' },
      { view: 'templates', icon: LayoutList, label: 'Templates' },
      { view: 'aiproviders', icon: Key, label: 'AI Providers' },
      { view: 'integrations', icon: Puzzle, label: 'Integrations', adminOnly: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { view: 'files', icon: Folder, label: 'Files' },
      { view: 'plugins', icon: Puzzle, label: 'Plugins' },
      { view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { view: 'knowledge', icon: Brain, label: 'Knowledge' },
    ],
  },
  {
    label: 'Power',
    items: [
      { view: 'automation', icon: Zap, label: 'Automation' },
      { view: 'focus', icon: Timer, label: 'Focus' },
      { view: 'vault', icon: Lock, label: 'Vault' },
      { view: 'code', icon: Code, label: 'Code' },
      { view: 'calculator', icon: Calculator, label: 'Calculator' },
    ],
  },
  {
    label: '',
    items: [
      { view: 'admin', icon: Shield, label: 'Admin', adminOnly: true },
      { view: 'settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function Sidebar() {
  const {
    activeView,
    setActiveView,
    personality,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useNovaStore()

  const { isAdmin } = useAuth()
  const currentPersonality = PERSONALITIES[personality]

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/30"
        >
          <Zap className="w-5 h-5 text-nova-gold" />
        </motion.div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-xl font-bold gold-gradient-text whitespace-nowrap">NOVA</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest whitespace-nowrap">NEURAL ASSISTANT</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gold divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-nova-gold/30 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => {
          // Filter items based on admin access
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin)
          if (visibleItems.length === 0) return null

          return (
            <div key={si}>
              {section.label && !sidebarCollapsed && (
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest px-3 py-2 whitespace-nowrap">{section.label}</p>
              )}
              {section.label && sidebarCollapsed && si > 0 && (
                <div className="mx-2 my-1 h-px bg-gradient-to-r from-transparent via-nova-gold/10 to-transparent" />
              )}
              {visibleItems.map(({ view, icon: Icon, label }) => {
                const isActive = activeView === view
                return (
                  <motion.button
                    key={view}
                    whileHover={{ x: 4, backgroundColor: 'rgba(212,165,116,0.1)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setActiveView(view)
                      setMobileSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative group ${
                      isActive
                        ? 'bg-nova-gold/10 text-nova-gold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-nova-gold"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-nova-gold' : ''}`} />
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && !sidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-nova-gold shadow-[0_0_6px_rgba(212,165,116,0.5)]"
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3">
        {/* Gold divider */}
        <div className="mx-1 h-px bg-gradient-to-r from-transparent via-nova-gold/20 to-transparent" />

        {/* Personality indicator */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/30">
          <span className="text-base flex-shrink-0">{currentPersonality.emoji}</span>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs font-medium text-foreground whitespace-nowrap">{currentPersonality.name}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{currentPersonality.description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* System status */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
          />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-500 whitespace-nowrap"
              >
                System Online
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: mobileSidebarOpen ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 w-[280px] bg-background border-r border-border z-50 md:hidden"
      >
        {sidebarContent}
      </motion.aside>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:block h-full bg-background border-r border-border flex-shrink-0 overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}
