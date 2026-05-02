'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type UserProfile } from './types'
import { getMe, logout as authLogout, refreshToken as authRefresh } from './services/authService'
import { useRouter, usePathname } from 'next/navigation'
import { setAccessToken } from '@/lib/auth-token'
import { usePushNotifications, PushNotificationService } from '@/features/notifications/services/pushNotificationService'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

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
  const pathname = usePathname()

  
  usePushNotifications(!!user)

  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  const refreshUser = async () => {
    console.log('[Auth] Refreshing user...')
    try {
      const profile = await getMe()
      console.log('[Auth] Refresh success, profile:', profile)
      setUser(profile)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('upward_session_active', 'true')
      }
    } catch (err) {
      console.error('[Auth] Refresh failed:', err)
      // Call logout to clear any stale cookies and break potential redirect loops
      await logout()
    } finally {
      console.log('[Auth] Refresh done, setting loading=false')
      setLoading(false)
    }
  }

  useEffect(() => {
    const initSession = async () => {
      console.log('[Auth] Initializing session...')
      
      const sessionActive = typeof window !== 'undefined' ? sessionStorage.getItem('upward_session_active') : null
      
      if (Capacitor.isNativePlatform()) {
        const launchUrl = await App.getLaunchUrl()
        const isDeepLink = !!(launchUrl?.url && (
          launchUrl.url.includes('/pay/') ||
          launchUrl.url.includes('pay/') ||
          launchUrl.url.includes('/invite/') ||
          launchUrl.url.includes('invite/') ||
          launchUrl.url.includes('/waitlist/') ||
          launchUrl.url.includes('waitlist/') ||
          launchUrl.url.includes('/welcome/')
        )) || (
          pathname?.startsWith('/waitlist/') ||
          pathname?.startsWith('/pay/') ||
          pathname?.startsWith('/invite/') ||
          pathname?.startsWith('/welcome/')
        )

        if (!sessionActive && !isDeepLink) {
          console.log('[Auth] Fresh app launch detected (no active session). Requiring login.')
          setLoading(false)
          await logout()
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
                console.log('[Auth] Inactivity timeout (5m) reached. Logging out...')
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

  const login = (newUser: UserProfile) => {
    setUser(newUser)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('upward_session_active', 'true')
    }
  }

  const logout = async () => {
    console.log('[Auth] Logging out...')
    setUser(null)
    setAccessToken(null)
    setLoading(true)
    try {
      // Try to unregister notifications and notify backend, but don't let them block local logout
      await Promise.allSettled([
        PushNotificationService.unregisterDevice(),
        authLogout()
      ])
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_banner_dismissed')
        sessionStorage.removeItem('upward_session_active')
        localStorage.removeItem('app_backgrounded_at')
      }
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      setLoading(false)
      
      // Only redirect if we are NOT on a public page
      const isPublicPath = 
        pathname?.startsWith('/pay/') || 
        pathname?.startsWith('/invite/') || 
        pathname?.startsWith('/welcome/') || 
        pathname?.startsWith('/complete-profile') ||
        pathname?.startsWith('/profile/') ||
        pathname?.startsWith('/fill-record/') ||
        pathname?.startsWith('/waitlist/') ||
        ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname || '')

      if (!isPublicPath) {
        router.replace('/login')
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
