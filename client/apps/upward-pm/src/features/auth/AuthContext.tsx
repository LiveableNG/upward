'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type PropertyManagerProfile } from './types'
import { getMe, logout as authLogout } from './services/authService'
import { useRouter } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/common/Toast'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('upward_session_active', 'true')
      }
    } catch (err) {
      setUser(null)
      setAccessToken(null)
      
      const isPortal = window.location.pathname.startsWith('/portal')
      const isPortalLoginPath = window.location.pathname === '/portal/login'
      const isPortalSignupPath = window.location.pathname === '/portal/signup'
      const isPortalPublic = isPortalLoginPath || isPortalSignupPath || window.location.pathname.startsWith('/portal/reset-password')

      // Redirect to login if we're on a protected page and auth fails
      const isPublicPage = window.location.pathname === '/' ||
                           window.location.pathname === '/welcome' ||
                           window.location.pathname === '/login' || 
                           window.location.pathname === '/signup' ||
                           window.location.pathname === '/pm-login' || 
                           window.location.pathname === '/pm-signup' ||
                           window.location.pathname === '/forgot-password' ||
                           window.location.pathname === '/pm-forgot-password' ||
                           window.location.pathname.startsWith('/invite') ||
                           window.location.pathname.startsWith('/reset-password') ||
                           isPortalPublic
      
      if (!isPublicPage) {
        toastError('Your session has expired. Please login again.', 'Session Expired')
        // Use window.location.href for a hard redirect to ensure navigation happens
        const loginPath = isPortal ? '/portal/login' : '/login'
        const redirectUrl = `${loginPath}?redirect=${encodeURIComponent(window.location.pathname)}`
        window.location.href = redirectUrl
      }
    } finally {
      setLoading(false)
    }
  }

  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    const initSession = async () => {
      const sessionActive = typeof window !== 'undefined' ? sessionStorage.getItem('upward_session_active') : null
      
      if (Capacitor.isNativePlatform()) {
        const launchUrl = await App.getLaunchUrl()
        const isDeepLink = !!(launchUrl?.url && (
          launchUrl.url.includes('/login') ||
          launchUrl.url.includes('/signup') ||
          launchUrl.url.includes('/invite') ||
          launchUrl.url.includes('/invited') ||
          launchUrl.url.includes('/welcome') ||
          launchUrl.url.includes('/public') ||
          launchUrl.url.includes('/reset-password')
        )) || (
          window.location.pathname.startsWith('/login') ||
          window.location.pathname.startsWith('/signup') ||
          window.location.pathname.startsWith('/invite') ||
          window.location.pathname.startsWith('/invited') ||
          window.location.pathname.startsWith('/welcome') ||
          window.location.pathname.startsWith('/public') ||
          window.location.pathname.startsWith('/reset-password')
        )

        if (!sessionActive && !isDeepLink) {
          setLoading(false)
          return
        }

        await App.addListener('appStateChange', async (state) => {
          if (!state.isActive) {
            localStorage.setItem('app_backgrounded_at', Date.now().toString())
          } else {
            const backgroundedAt = localStorage.getItem('app_backgrounded_at')
            if (backgroundedAt) {
              const diff = Date.now() - parseInt(backgroundedAt)
              if (diff > INACTIVITY_TIMEOUT) {
                await logout()
              }
              localStorage.removeItem('app_backgrounded_at')
            }
          }
        })
      }
      
      await refreshUser()
    }

    initSession()

    return () => {
      if (Capacitor.isNativePlatform()) {
        App.removeAllListeners()
      }
    }
  }, [])

  const login = (newUser: PropertyManagerProfile) => {
    setUser(newUser)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('upward_session_active', 'true')
    }
  }

  const logout = async () => {
    try {
      await authLogout()
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('upward_session_active')
        localStorage.removeItem('app_backgrounded_at')
      }
      queryClient.clear()
      setAccessToken(null)
      setUser(null)
      
      const isPortal = window.location.pathname.startsWith('/portal')
      if (isPortal) {
        window.location.href = '/portal/login'
      } else if (Capacitor.isNativePlatform()) {
        router.replace('/welcome')
      } else {
        window.location.href = '/pm-login'
      }
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
