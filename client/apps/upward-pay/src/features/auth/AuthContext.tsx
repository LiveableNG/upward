'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { type UserProfile } from './types'
import { getMe, logout as authLogout, refreshToken as authRefresh } from './services/authService'
import { useRouter } from 'next/navigation'
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

  
  usePushNotifications(!!user)

  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
      // Marker for "Throw away" (Termination) check
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('upward_session_active', 'true')
      }
    } catch (err) {
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initSession = async () => {
      if (Capacitor.isNativePlatform()) {
        // 1. Termination Check (SessionStorage marker)
        // sessionStorage is typically cleared when the webview task is killed
        const isSessionActive = sessionStorage.getItem('upward_session_active')
        
        // If we were supposedly logged in (persistent cookies exist) but the marker is gone,
        // it means the app was terminated (swiped away). Force logout.
        if (!isSessionActive) {
          console.log('[Auth] App terminated/fresh launch detected. Hardening session...')
          await logout()
          setLoading(false)
          return
        }

        // 2. Background Inactivity Listener (5 min timeout)
        await App.addListener('appStateChange', async (state) => {
          if (!state.isActive) {
            // App backgrounded
            localStorage.setItem('app_backgrounded_at', Date.now().toString())
          } else {
            // App focused
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
    try {
      await PushNotificationService.unregisterDevice() 
      await authLogout()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('app_banner_dismissed')
        sessionStorage.removeItem('upward_session_active')
        localStorage.removeItem('app_backgrounded_at')
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
