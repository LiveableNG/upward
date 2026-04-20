'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type UserProfile } from './types'
import { getMe, logout as authLogout, refreshToken as authRefresh } from './services/authService'
import { useRouter } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'
import { usePushNotifications, PushNotificationService } from '@/features/notifications/services/pushNotificationService'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isLoggedIn: boolean
  login: (user: UserProfile) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  
  usePushNotifications(!!user)

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
    } catch (err) {
      // Fail silently for initial check - user is just a guest
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = (newUser: UserProfile) => {
    setUser(newUser)
  }

  const logout = async () => {
    try {
      await PushNotificationService.unregisterDevice() 
      await authLogout()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_banner_dismissed')
      }
    } finally {
      setAccessToken(null)
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
