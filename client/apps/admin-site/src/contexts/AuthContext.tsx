import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL

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

const AuthContext = createContext<AuthContextValue | null>(null)

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
