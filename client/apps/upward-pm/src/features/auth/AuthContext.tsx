'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type PropertyManagerProfile } from './types'
import { getMe, logout as authLogout } from './services/authService'
import { useRouter } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'

interface AuthContextType {
  user: PropertyManagerProfile | null
  loading: boolean
  isLoggedIn: boolean
  login: (user: PropertyManagerProfile) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PropertyManagerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
    } catch (err) {
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = (newUser: PropertyManagerProfile) => {
    setUser(newUser)
  }

  const logout = async () => {
    try {
      await authLogout()
    } finally {
      setAccessToken(null)
      setUser(null)
      router.replace('/login')
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
