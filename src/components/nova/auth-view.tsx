'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  Zap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface AuthViewProps {
  onAuthSuccess: (user: AuthUser, token: string) => void
}

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string | null
  avatar: string | null
  role: string
  tier: string
  emailVerified: boolean
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

type AuthMode = 'login' | 'register' | 'setup'

export function AuthView({ onAuthSuccess }: AuthViewProps) {
  const { login } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginRemember, setLoginRemember] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Register fields
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  // Check if setup is needed on mount (with timeout)
  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const checkSetup = async () => {
      try {
        const res = await fetch('/api/auth/setup', {
          method: 'GET',
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.needsSetup) {
            setMode('setup')
          }
        }
      } catch {
        // If setup check fails, just show login
      }
      setCheckingSetup(false)
    }
    checkSetup()

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  const resetFields = () => {
    setLoginEmail('')
    setLoginPassword('')
    setLoginRemember(false)
    setShowLoginPassword(false)
    setRegEmail('')
    setRegUsername('')
    setRegPassword('')
    setRegConfirmPassword('')
    setRegName('')
    setShowRegPassword(false)
    setShowRegConfirmPassword(false)
    setError(null)
  }

  const switchMode = (newMode: AuthMode) => {
    resetFields()
    setMode(newMode)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          rememberMe: loginRemember,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      // Store token in cookie if remember me
      if (loginRemember) {
        document.cookie = `nova-session=${data.token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`
      } else {
        document.cookie = `nova-session=${data.token}; path=/; samesite=lax`
      }

      // Also store in localStorage for easy access
      localStorage.setItem('nova-auth-token', data.token)
      localStorage.setItem('nova-auth-user', JSON.stringify(data.user))

      login(data.user, data.token)
      onAuthSuccess(data.user, data.token)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. The server may be starting up — please try again in a moment.')
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check your connection and try again.')
      } else {
        setError('Unable to reach the server. Please wait a moment and try again.')
      }
      setRetryCount(prev => prev + 1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (regUsername.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          username: regUsername,
          password: regPassword,
          name: regName || undefined,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      // Store token
      document.cookie = `nova-session=${data.token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`
      localStorage.setItem('nova-auth-token', data.token)
      localStorage.setItem('nova-auth-user', JSON.stringify(data.user))

      login(data.user, data.token)
      onAuthSuccess(data.user, data.token)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. The server may be starting up — please try again in a moment.')
      } else {
        setError('Unable to reach the server. Please wait a moment and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Setup failed')
        return
      }

      // Store token
      document.cookie = `nova-session=${data.token}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`
      localStorage.setItem('nova-auth-token', data.token)
      localStorage.setItem('nova-auth-user', JSON.stringify(data.user))

      login(data.user, data.token)
      onAuthSuccess(data.user, data.token)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Setup timed out. Please try again.')
      } else {
        setError('Unable to complete setup. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center nova-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-nova-gold animate-spin" />
          <p className="text-sm text-muted-foreground">Initializing NOVA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center nova-bg p-4 sm:p-6">
      {/* Subtle static background - no animations for performance */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-nova-purple/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-nova-gold/10 blur-3xl" />
      </div>

      {/* Auth container - static, no motion animations */}
      <div className="relative w-full max-w-md">
        {/* Logo header - static for speed */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 border border-nova-gold/30 mb-4">
            <Zap className="w-8 h-8 text-nova-gold" />
          </div>
          <h1 className="text-3xl font-bold gold-gradient-text mb-2">NOVA</h1>
          <p className="text-sm text-muted-foreground tracking-widest">
            NEURAL ASSISTANT
          </p>
        </div>

        {/* Auth card */}
        <div className="glass-card gold-glow p-6 sm:p-8">
          {/* Mode toggle - plain buttons, no motion */}
          <div className="flex mb-6 rounded-lg bg-secondary/30 p-1">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-nova-gold/15 text-nova-gold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-nova-purple/15 text-nova-purple-light shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error display with retry hint */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>{error}</span>
                {retryCount > 0 && (
                  <p className="text-xs mt-1 text-destructive/70">
                    Attempt {retryCount + 1} — the server may need a moment to start up.
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === 'setup' ? (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Welcome to NOVA</h3>
                <p className="text-sm text-muted-foreground">
                  This is a fresh installation. Let&apos;s create your admin account to get started.
                </p>
              </div>

              <div className="space-y-3 text-left p-4 rounded-lg bg-secondary/20 border border-border">
                <p className="text-xs font-medium text-nova-gold uppercase tracking-wider">Default Admin Credentials</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <code className="text-foreground font-mono text-xs">admin@nova.ai</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Password:</span>
                    <code className="text-foreground font-mono text-xs">NOVA-Admin-2024!</code>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You can change these after your first login.
                </p>
              </div>

              <button
                onClick={handleSetup}
                disabled={isLoading}
                className="w-full py-3 rounded-lg gold-gradient-bg text-background font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(212,165,116,0.3)] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Admin & Launch
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => switchMode('login')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Already set up? Sign in instead
              </button>
            </div>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-gold/50 focus:ring-1 focus:ring-nova-gold/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-gold/50 focus:ring-1 focus:ring-nova-gold/20 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginRemember(!loginRemember)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      loginRemember
                        ? 'bg-nova-gold border-nova-gold text-background'
                        : 'border-border bg-secondary/30'
                    }`}
                  >
                    {loginRemember && (
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">Remember me</span>
                </div>
              </div>

              {/* Demo credentials hint */}
              <div className="p-3 rounded-lg bg-secondary/15 border border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">Demo Credentials</p>
                <div className="flex items-center gap-2 text-xs">
                  <code className="text-nova-gold/80 font-mono">admin@nova.ai</code>
                  <span className="text-muted-foreground/40">/</span>
                  <code className="text-nova-gold/80 font-mono">NOVA-Admin-2024!</code>
                </div>
              </div>

              {/* Submit - plain button, no motion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg gold-gradient-bg text-background font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(212,165,116,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name (optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Display Name <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your name"
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-purple/50 focus:ring-1 focus:ring-nova-purple/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-purple/50 focus:ring-1 focus:ring-nova-purple/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="cooluser42"
                    required
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-purple/50 focus:ring-1 focus:ring-nova-purple/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-purple/50 focus:ring-1 focus:ring-nova-purple/20 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showRegPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-nova-purple/50 focus:ring-1 focus:ring-nova-purple/20 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showRegConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {regConfirmPassword && regPassword !== regConfirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              {/* Submit - plain button, no motion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg purple-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Switch mode link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => switchMode('register')}
                    className="text-nova-purple-light hover:text-nova-purple-glow transition-colors font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-nova-gold hover:text-nova-gold-light transition-colors font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              End-to-end encrypted
            </span>
            <span>v2.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
