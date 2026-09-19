'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { type UserProfile } from './types'
import { getMe, logout as authLogout } from './services/authService'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, initStoredTokens } from '@/lib/auth-token'
import { deleteCookie } from '@/lib/cookie-utils'
import { usePushNotifications, PushNotificationService } from '@/features/notifications/services/pushNotificationService'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isLoggedIn: boolean
  isPinLocked: boolean
  login: (user: UserProfile) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('upward_cached_user_profile')
        return cached ? JSON.parse(cached) : null
      } catch {
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(true)
  const userRef = useRef<UserProfile | null>(user)
  const router = useRouter()

  useEffect(() => {
    userRef.current = user
  }, [user])

  const queryClient = useQueryClient()

  usePushNotifications(!!user)

  useEffect(() => {
    if (!user?.uuid) return

    const getSseUrl = (userUuid: string) => {
      if (typeof window === 'undefined') return ''
      const apiRoot = process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`
      return `${apiRoot}/payments/sse/${userUuid}`
    }

    const sseUrl = getSseUrl(user.uuid)
    console.log('[SSE] Connecting to:', sseUrl)
    const eventSource = new EventSource(sseUrl)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'heartbeat') return

        console.log('[SSE] Event received:', data)

        if (data.type === 'payment.succeeded') {
          const keysToInvalidate = [
            'dashboard',
            'scoreProfile',
            'score-profile',
            'notifications',
            'pendingPayments',
            'pending-payments',
            'transactions',
            'profile',
            'user-profile',
            'wallet',
            'dashboard-counts',
            'activeTenancy',
            'rentalDetails',
            'tenancies',
          ]
          keysToInvalidate.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] })
          })
          
          window.dispatchEvent(new CustomEvent('upward:payment.succeeded', { detail: data }))
        } else if (data.type === 'payment.request.created' || data.type === 'payment.request.updated') {
          const keysToInvalidate = [
            'dashboard',
            'notifications',
            'pendingPayments',
            'pending-payments',
            'dashboard-counts',
            'activeTenancy',
            'rentalDetails',
          ]
          keysToInvalidate.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] })
          })
          
          window.dispatchEvent(new CustomEvent('upward:payment.request.changed', { detail: data }))
        }
      } catch (err) {
        console.error('[SSE] Error processing event:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err)
      eventSource.close()
    }

    return () => {
      console.log('[SSE] Disconnecting')
      eventSource.close()
    }
  }, [user?.uuid, queryClient])

  const refreshUser = async () => {
    try {
      const profile = await getMe()
      setUser(profile)
      userRef.current = profile
      if (typeof window !== 'undefined') {
        localStorage.setItem('upward_cached_user_profile', JSON.stringify(profile))
      }
    } catch (err: any) {
      console.warn('[Auth] refreshUser error:', err)
      const isAuthRejected = err?.status === 401 || err?.message === 'Session expired'
      if (Capacitor.isNativePlatform() && !isAuthRejected && userRef.current) {
        console.warn('[Auth] Retaining session on native platform during temporary network fluctuation.')
      } else {
        setUser(null)
        userRef.current = null
        setAccessToken(null)
        setRefreshToken(null)
        deleteCookie('pay_access_token')
        if (typeof window !== 'undefined') {
          localStorage.removeItem('upward_cached_user_profile')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initSession = async () => {
      console.log('[Auth] Initializing persistent session...')
      await initStoredTokens()

      const token = getAccessToken()
      const refreshToken = getRefreshToken()

      if (!token && !refreshToken) {
        console.log('[Auth] No stored tokens found. Starting in logged-out state.')
        setUser(null)
        userRef.current = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem('upward_cached_user_profile')
        }
        setLoading(false)
        return
      }

      if (Capacitor.isNativePlatform()) {
        await App.addListener('appStateChange', async (state) => {
          if (state.isActive) {
            console.log('[Auth] App resumed from background')
            await refreshUser()
            queryClient.invalidateQueries()
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

  const login = async (newUser: UserProfile) => {
    setUser(newUser)
    userRef.current = newUser
    setLoading(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('upward_cached_user_profile', JSON.stringify(newUser))
    }
  }

  const logout = async () => {
    console.log('[Auth] Logging out...')
    setUser(null)
    userRef.current = null
    setAccessToken(null)
    setRefreshToken(null)
    setLoading(true)

    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_backgrounded_at')
      localStorage.removeItem('upward_cached_user_profile')
    }

    try {
      await Promise.allSettled([
        PushNotificationService.unregisterDevice(),
        Promise.race([
          authLogout(),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]),
      ])

      deleteCookie('pay_access_token')
      deleteCookie('access_token')
      deleteCookie('tenant_refresh')
      deleteCookie('user_refresh')

      if (typeof window !== 'undefined') {
        const keysToRemove = [
          'upward_pay_access_token',
          'upward_pay_refresh_token',
          'app_banner_dismissed',
          'upward_cached_user_profile',
          'exclusive_home_applications',
          'exclusive_home_requests',
        ]
        keysToRemove.forEach((k) => localStorage.removeItem(k))

        const allKeys = Object.keys(localStorage)
        allKeys.forEach((k) => {
          if (k.startsWith('profile_popup_dismissed_') || k.startsWith('rent_support_policy_')) {
            localStorage.removeItem(k)
          }
        })

        sessionStorage.clear()
      }

      queryClient.clear()
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      setLoading(false)
      router.refresh()
      router.replace('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        isPinLocked: false,
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
