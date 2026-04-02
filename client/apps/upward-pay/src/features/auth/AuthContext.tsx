'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type TenantProfile } from './types'
import { getMe, logout as authLogout } from './services/authService'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: TenantProfile | null
  loading: boolean
  isLoggedIn: boolean
  login: (user: TenantProfile) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TenantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = (newUser: TenantProfile) => {
    setUser(newUser)
  }

  const logout = async () => {
    try {
      await authLogout()
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
