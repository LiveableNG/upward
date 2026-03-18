/**
 * AuthContext — stores the access token in React memory only (never localStorage).
 *
 * Flow:
 *  1. On mount, call POST /auth/refresh (uses the HttpOnly cookie automatically).
 *     If the cookie is valid, we get a fresh access token back.
 *  2. On login,  POST /auth/login → server sets the HttpOnly cookie, we store
 *     the returned access token in state only.
 *  3. On logout, POST /auth/logout → server clears the cookie,
 *     we clear the in-memory token.
 *  4. Every 14 minutes a silent refresh is fired so the 15-min access token
 *     never expires while the tab is open.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export interface AuthUser {
  id: string
  email: string
  role: string
  mustChangePassword: boolean
}

interface AuthState {
  token: string
  user: AuthUser
}

interface AuthContextValue {
  auth: AuthState | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setAuth: React.Dispatch<React.SetStateAction<AuthState | null>>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callRefresh(): Promise<AuthState | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // send the HttpOnly cookie
    })
    if (!res.ok) return null
    const data = await res.json()
    return { token: data.accessToken, user: data.user }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Schedule a silent token refresh 30 seconds before the 15-min token expires
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(
      async () => {
        const refreshed = await callRefresh()
        if (refreshed) {
          setAuth(refreshed)
          scheduleRefresh()
        } else {
          // Refresh token expired → force logout
          setAuth(null)
        }
      },
      14 * 60 * 1000,
    ) // 14 minutes
  }, [])

  // On mount: attempt a silent refresh using the existing HttpOnly cookie
  useEffect(() => {
    callRefresh().then((state) => {
      if (state) {
        setAuth(state)
        scheduleRefresh()
      }
      setLoading(false)
    })
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [scheduleRefresh])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include', // allow the server to set the HttpOnly cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw { status: res.status, message: data.message || 'Login failed' }
      }
      const data = await res.json()
      setAuth({ token: data.accessToken, user: data.user })
      scheduleRefresh()
    },
    [scheduleRefresh],
  )

  const logout = useCallback(async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      setAuth(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ auth, loading, login, logout, setAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
