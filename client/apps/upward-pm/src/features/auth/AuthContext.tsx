'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type PropertyManagerProfile } from './types'
import { getMe, logout as authLogout } from './services/authService'
import { useRouter } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'

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
  const queryClient = useQueryClient()

  const { error: toastError } = useToast()

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
    } catch (err) {
      setUser(null)
      setAccessToken(null)
      
      const isPortal = window.location.pathname.startsWith('/portal')
      const isPortalLoginPath = window.location.pathname === '/portal/login'
      const isPortalSignupPath = window.location.pathname === '/portal/signup'
      const isPortalPublic = isPortalLoginPath || isPortalSignupPath || window.location.pathname.startsWith('/portal/reset-password')

      // Redirect to login if we're on a protected page and auth fails
      const isPublicPage = window.location.pathname === '/' ||
                           window.location.pathname === '/login' || 
                           window.location.pathname === '/signup' ||
                           window.location.pathname.startsWith('/invite') ||
                           window.location.pathname.startsWith('/reset-password') ||
                           isPortalPublic
      
      if (!isPublicPage) {
        toastError('Your session has expired. Please login again.', 'Session Expired')
        // Use window.location.href for a hard redirect to ensure navigation happens
        const loginPath = isPortal ? '/portal/login' : '/pm-login'
        const redirectUrl = `${loginPath}?redirect=${encodeURIComponent(window.location.pathname)}`
        window.location.href = redirectUrl
      }
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
      queryClient.clear()
      setAccessToken(null)
      setUser(null)
      
      const isPortal = window.location.pathname.startsWith('/portal')
      router.replace(isPortal ? '/portal/login' : '/pm-login')
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
