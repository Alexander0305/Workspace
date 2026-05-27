'use client'

import { useNovaStore } from '@/lib/nova-store'
import { AuthProvider, useAuth, type AuthUser } from '@/lib/auth-context'
import { AuthView } from '@/components/nova/auth-view'
import { lazy, Suspense, useEffect, useState, useRef } from 'react'

// Lazy-loaded views for code splitting & reduced initial bundle
const ChatView = lazy(() => import('@/components/nova/chat-view').then(m => ({ default: m.ChatView })))
const VoiceView = lazy(() => import('@/components/nova/voice-view').then(m => ({ default: m.VoiceView })))
const TasksView = lazy(() => import('@/components/nova/tasks-view').then(m => ({ default: m.TasksView })))
const CalendarView = lazy(() => import('@/components/nova/calendar-view').then(m => ({ default: m.CalendarView })))
const NotesView = lazy(() => import('@/components/nova/notes-view').then(m => ({ default: m.NotesView })))
const FilesView = lazy(() => import('@/components/nova/files-view').then(m => ({ default: m.FilesView })))
const PluginsView = lazy(() => import('@/components/nova/plugins-view').then(m => ({ default: m.PluginsView })))
const DashboardView = lazy(() => import('@/components/nova/dashboard-view').then(m => ({ default: m.DashboardView })))
const KnowledgeView = lazy(() => import('@/components/nova/knowledge-view').then(m => ({ default: m.KnowledgeView })))
const AutomationView = lazy(() => import('@/components/nova/automation-view').then(m => ({ default: m.AutomationView })))
const FocusTimerView = lazy(() => import('@/components/nova/focus-timer-view').then(m => ({ default: m.FocusTimerView })))
const PasswordVaultView = lazy(() => import('@/components/nova/password-vault-view').then(m => ({ default: m.PasswordVaultView })))
const CodePlaygroundView = lazy(() => import('@/components/nova/code-playground-view').then(m => ({ default: m.CodePlaygroundView })))
const CalculatorView = lazy(() => import('@/components/nova/calculator-view').then(m => ({ default: m.CalculatorView })))
const WebSearchView = lazy(() => import('@/components/nova/web-search-view').then(m => ({ default: m.WebSearchView })))
const ImageGenerationView = lazy(() => import('@/components/nova/image-generation-view').then(m => ({ default: m.ImageGenerationView })))
const VideoGenerationView = lazy(() => import('@/components/nova/video-generation-view').then(m => ({ default: m.VideoGenerationView })))
const PromptEnhancerView = lazy(() => import('@/components/nova/prompt-enhancer-view').then(m => ({ default: m.PromptEnhancerView })))
const PromptTemplatesView = lazy(() => import('@/components/nova/prompt-templates-view').then(m => ({ default: m.PromptTemplatesView })))
const IntegrationsView = lazy(() => import('@/components/nova/integrations-view').then(m => ({ default: m.IntegrationsView })))
const AIProvidersView = lazy(() => import('@/components/nova/ai-providers-view').then(m => ({ default: m.AIProvidersView })))
const SettingsView = lazy(() => import('@/components/nova/settings-view').then(m => ({ default: m.SettingsView })))
const AdminView = lazy(() => import('@/components/nova/admin-view').then(m => ({ default: m.AdminView })))

// Lazy-loaded overlay components
const Sidebar = lazy(() => import('@/components/nova/sidebar').then(m => ({ default: m.Sidebar })))
const CommandPalette = lazy(() => import('@/components/nova/command-palette').then(m => ({ default: m.CommandPalette })))
const NotificationPanel = lazy(() => import('@/components/nova/notification-panel').then(m => ({ default: m.NotificationPanel })))
const Onboarding = lazy(() => import('@/components/nova/onboarding').then(m => ({ default: m.Onboarding })))

// Loading fallback for lazy-loaded views
function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-nova-gold border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

function ViewRenderer() {
  const { activeView } = useNovaStore()

  const views: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
    chat: ChatView,
    voice: VoiceView,
    tasks: TasksView,
    calendar: CalendarView,
    notes: NotesView,
    files: FilesView,
    plugins: PluginsView,
    dashboard: DashboardView,
    knowledge: KnowledgeView,
    automation: AutomationView,
    focus: FocusTimerView,
    vault: PasswordVaultView,
    code: CodePlaygroundView,
    calculator: CalculatorView,
    settings: SettingsView,
    admin: AdminView,
    websearch: WebSearchView,
    imagegen: ImageGenerationView,
    videogen: VideoGenerationView,
    promptenhancer: PromptEnhancerView,
    templates: PromptTemplatesView,
    integrations: IntegrationsView,
    aiproviders: AIProvidersView,
  }

  const ViewComponent = views[activeView] || ChatView

  return (
    <div className="flex-1 overflow-hidden animate-fade-in" key={activeView}>
      <Suspense fallback={<ViewLoader />}>
        <ViewComponent />
      </Suspense>
    </div>
  )
}

function AuthenticatedApp() {
  const { user, isAuthenticated, logout } = useAuth()
  const { customCSS, darkMode, activeView, trackAction, adaptiveLearningEnabled } = useNovaStore()

  // Apply custom CSS
  useEffect(() => {
    let styleEl = document.getElementById('nova-custom-css')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'nova-custom-css'
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = customCSS
    return () => {
      const el = document.getElementById('nova-custom-css')
      if (el) el.textContent = ''
    }
  }, [customCSS])

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Defer heavy initialization until after first render
  const initDone = useRef(false)
  useEffect(() => {
    if (!isAuthenticated || initDone.current) return
    initDone.current = true

    // Defer data sync and plugin initialization to avoid blocking the UI
    const timer = setTimeout(async () => {
      try {
        const { initializeApp } = await import('@/lib/data-sync-v2')
        const { registerNotificationSender } = await import('@/lib/plugin-engine')
        registerNotificationSender((payload) => {
          const store = useNovaStore.getState()
          store.addNotification({
            id: payload.id || `plugin-${Date.now()}`,
            title: payload.title || 'Plugin',
            message: payload.message || payload.body || '',
            type: payload.type || 'info',
            read: false,
            createdAt: new Date(),
          })
        })
        await initializeApp()
      } catch (err) {
        console.warn('App initialization deferred:', err)
      }
    }, 500) // 500ms delay to let the UI render first

    return () => clearTimeout(timer)
  }, [isAuthenticated])

  // Track view switches for adaptive learning (lightweight)
  useEffect(() => {
    if (adaptiveLearningEnabled) {
      trackAction('view_switch', { view: activeView })
    }
  }, [activeView, adaptiveLearningEnabled, trackAction])

  // Show auth view if not authenticated
  if (!isAuthenticated || !user) {
    return <AuthView onAuthSuccess={() => { /* AuthProvider handles this */ }} />
  }

  // Main app interface
  return (
    <div className="h-screen w-screen flex nova-bg overflow-hidden">
      {/* Sidebar - lazy loaded to avoid pulling framer-motion into initial bundle */}
      <Suspense fallback={
        <div className="w-16 md:w-64 h-full glass-card border-r border-border flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-nova-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Sidebar />
      </Suspense>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with user info */}
        <Topbar user={user} onLogout={logout} />

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          <ViewRenderer />
        </main>
      </div>

      {/* Overlay components (lazy-loaded) */}
      <Suspense fallback={null}>
        <CommandPalette />
        <NotificationPanel />
        <Onboarding />
      </Suspense>
    </div>
  )
}

function Topbar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
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

  const [showUserMenu, setShowUserMenu] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const VIEW_TITLES: Record<string, string> = {
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
    admin: 'Admin',
    websearch: 'Web Search',
    imagegen: 'Image Gen',
    videogen: 'Video Gen',
    promptenhancer: 'Prompt Enhancer',
    templates: 'Templates',
    integrations: 'Integrations',
    aiproviders: 'AI Providers',
  }

  return (
    <header
      className="h-16 flex items-center gap-4 px-4 lg:px-6 glass-card border-b border-border rounded-none animate-slide-down"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(10,10,10,0.8)' }}
    >
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors active:scale-95"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* View title */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">{VIEW_TITLES[activeView] || 'Chat'}</h2>
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
          <svg className="w-4 h-4 text-muted-foreground ml-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
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
        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors active:scale-95"
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-nova-purple text-[10px] font-bold text-white flex items-center justify-center animate-scale-in">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors active:scale-95"
        >
          {darkMode ? (
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* User avatar & menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-gold to-nova-gold-dark flex items-center justify-center text-xs font-bold text-background">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-12 z-50 w-64 glass-card gold-glow p-3 space-y-1 animate-fade-in">
                <div className="px-3 py-2 border-b border-border mb-2">
                  <p className="text-sm font-medium text-foreground">{user.name || user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-nova-gold/15 text-nova-gold uppercase tracking-wider">
                      {user.tier}
                    </span>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-nova-purple/15 text-nova-purple-light uppercase tracking-wider">
                        admin
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowUserMenu(false)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogout() }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function NOVA() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
