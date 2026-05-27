'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  email: string
  username: string
  name: string | null
  avatar: string | null
  role: string
  tier: string
  isActive: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
  /** Authenticated fetch - automatically includes the auth token */
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  /** Get auth headers for manual use */
  getAuthHeaders: () => Record<string, string>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('nova-auth-token')
      if (storedToken) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // Reduced from 8s to 5s
          
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
            setToken(storedToken)
          } else {
            localStorage.removeItem('nova-auth-token')
            localStorage.removeItem('nova-auth-user')
            document.cookie = 'nova-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          }
        } catch {
          // Network error during auth check - keep stored token for retry
          // Don't clear credentials on transient failures
        }
      }
      setIsLoading(false)
    }
    
    // Safety timeout: force loading to finish after 6s max
    const safetyTimeout = setTimeout(() => setIsLoading(false), 6000)
    checkAuth().finally(() => clearTimeout(safetyTimeout))
  }, [])

  const login = useCallback((authUser: AuthUser, authToken: string) => {
    setUser(authUser)
    setToken(authToken)
    localStorage.setItem('nova-auth-token', authToken)
    localStorage.setItem('nova-auth-user', JSON.stringify(authUser))
    // Also set as cookie for middleware
    document.cookie = `nova-session=${authToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // Ignore errors on logout
      }
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('nova-auth-token')
    localStorage.removeItem('nova-auth-user')
    document.cookie = 'nova-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }, [token])

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    }
    // Add auth token if available
    const currentToken = token || localStorage.getItem('nova-auth-token')
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }
    // Add Content-Type for POST/PUT/PATCH if not already set and body is not FormData
    if (['POST', 'PUT', 'PATCH'].includes(options.method || '') && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    return fetch(url, { ...options, headers })
  }, [token])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    const currentToken = token || localStorage.getItem('nova-auth-token')
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`
    }
    return headers
  }, [token])

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    authFetch,
    getAuthHeaders,
  }

  // Show loading spinner while checking auth (prevents blank screen)
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center nova-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-nova-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading NOVA...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
