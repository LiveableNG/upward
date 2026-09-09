'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { type UserProfile } from './types'
import { getMe, logout as authLogout, refreshToken as authRefresh, login as authLogin } from './services/authService'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, usePathname } from 'next/navigation'
import { setAccessToken, setRefreshToken, getAccessToken, isTokenExpired, initStoredTokens } from '@/lib/auth-token'
import { deleteCookie, setCookie } from '@/lib/cookie-utils'
import { runRefresh } from '@/lib/api-client'
import { usePushNotifications, PushNotificationService } from '@/features/notifications/services/pushNotificationService'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { BiometricsService } from './services/biometricsService'
import { PinService, type PinUserInfo } from './services/pinService'
import { PinLockScreen } from './components/PinLockScreen'
import { PinSetupModal } from './components/PinSetupModal'

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
  const [isPinLocked, setIsPinLocked] = useState(false)
  const [pinUser, setPinUser] = useState<PinUserInfo | null>(null)
  const [showPinSetup, setShowPinSetup] = useState(false)
  const userRef = useRef<UserProfile | null>(user)
  const router = useRouter()
  const pathname = usePathname()

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
        sessionStorage.setItem('upward_session_active', 'true')
        localStorage.setItem('upward_cached_user_profile', JSON.stringify(profile))
      }
    } catch (err) {
      // If on native platform with PIN enrolled, retain the user session and do not eject to login
      const hasPin = await PinService.hasPin().catch(() => false)
      if (Capacitor.isNativePlatform() && hasPin) {
        console.warn('[Auth] refreshUser failed while PIN enrolled. Retaining session for unlock re-auth.')
        if (!userRef.current && typeof window !== 'undefined') {
          const cached = localStorage.getItem('upward_cached_user_profile')
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              setUser(parsed)
              userRef.current = parsed
            } catch {}
          }
        }
      } else {
        setUser(null)
        userRef.current = null
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('upward_session_active')
          localStorage.removeItem('upward_cached_user_profile')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initSession = async () => {
      console.log('[Auth] Initializing session...')
      await initStoredTokens()
      
      if (Capacitor.isNativePlatform()) {
        await BiometricsService.initFirstLaunchCheck()

        // Check if device has a PIN enrolled
        const hasPin = await PinService.hasPin()
        if (hasPin) {
          const pUser = await PinService.getPinUser()
          setPinUser(pUser)
          setIsPinLocked(true)
        }

        await App.addListener('appStateChange', async (state) => {
          if (BiometricsService.isBiometricPrompting() || BiometricsService.isJustUnlocked()) {
            console.log('[Auth] Ignoring appStateChange caused by active biometric prompt or recent unlock')
            return
          }

          if (!state.isActive) {
            console.log('[Auth] App went to background')
            if (typeof window !== 'undefined') {
              localStorage.setItem('app_backgrounded_at', Date.now().toString())
            }
          } else {
            console.log('[Auth] App resumed from background. Checking PIN lock state...')
            const bgTimeStr = typeof window !== 'undefined' ? localStorage.getItem('app_backgrounded_at') : null
            if (typeof window !== 'undefined') {
              localStorage.removeItem('app_backgrounded_at')
            }

            const bgTime = bgTimeStr ? parseInt(bgTimeStr, 10) : 0
            const elapsedMs = bgTime > 0 ? Date.now() - bgTime : 0

            let locked = false
            // Lock if backgrounded for more than 1.5 seconds, PIN exists for this user, and not recently unlocked
            if (elapsedMs > 1500 && !BiometricsService.isJustUnlocked()) {
              const activeUser = userRef.current
              const hasPin = await PinService.hasPin(activeUser?.email)
              if (hasPin) {
                const pUser = await PinService.getPinUser()
                setPinUser(pUser)
                setIsPinLocked(true)
                locked = true
              }
            }

            // Only refresh user and invalidate queries if the app did NOT lock.
            // If the app IS locked, queries will be safely refreshed upon successful unlock.
            if (!locked) {
              await refreshUser()
              queryClient.invalidateQueries()
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

  const login = async (newUser: UserProfile) => {
    setUser(newUser)
    userRef.current = newUser
    setIsPinLocked(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('upward_session_active', 'true')
      localStorage.setItem('upward_cached_user_profile', JSON.stringify(newUser))
    }

    if (Capacitor.isNativePlatform()) {
      // Check if device has a PIN enrolled for THIS user
      const hasPinForThisUser = await PinService.hasPin(newUser.email)
      if (!hasPinForThisUser) {
        // Clear any orphaned PIN from a previous user
        await PinService.clearPin()
        await BiometricsService.clearCredentials()
        setPinUser(null)
        setShowPinSetup(true)
      } else {
        const pUser = await PinService.getPinUser()
        setPinUser(pUser)
      }
    }
  }

  const logout = async () => {
    console.log('[Auth] Logging out...')
    setUser(null)
    userRef.current = null
    setAccessToken(null)
    setRefreshToken(null)
    setIsPinLocked(false)
    setShowPinSetup(false)
    setPinUser(null)
    setLoading(true)

    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_backgrounded_at')
      localStorage.removeItem('upward_cached_user_profile')
    }

    try {
      // Clear PIN, biometrics, notifications, and notify backend
      await Promise.allSettled([
        PinService.clearPin(),
        BiometricsService.clearCredentials(),
        PushNotificationService.unregisterDevice(),
        // Timeout authLogout so network delays or 401s never block logout
        Promise.race([
          authLogout(),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]),
      ])

      // Explicitly delete cookies
      deleteCookie('pay_access_token')
      deleteCookie('access_token')
      deleteCookie('tenant_refresh')
      deleteCookie('user_refresh')
      
      if (typeof window !== 'undefined') {
        const keysToRemove = [
          'upward_pay_access_token',
          'upward_pay_refresh_token',
          'app_banner_dismissed',
          'upward_session_active',
          'upward_cached_user_profile',
          'app_backgrounded_at',
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

      // Clear ALL cached query data so no previous account's data leaks into the next session
      queryClient.clear()
    } catch (err) {
      console.error('[Auth] Logout error:', err)
    } finally {
      setLoading(false)
      router.refresh()
      router.replace('/login')
    }
  }

  const handleUnlock = async () => {
    BiometricsService.setJustUnlocked()

    const currentToken = getAccessToken()
    const tokenExpired = isTokenExpired(currentToken)

    // 1. If access token is still active, unlock immediately without touching tokens!
    if (currentToken && !tokenExpired) {
      console.log('[Auth] Unlocked: current access token is active and valid.')
      setIsPinLocked(false)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('upward_session_active', 'true')
      }
      queryClient.invalidateQueries()
      if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) {
        router.replace('/dashboard')
      }
      return
    }

    // 2. Token is expired or missing. Attempt silent renewal:
    console.log('[Auth] Token expired or missing on unlock. Attempting silent renewal...')
    let sessionRestored = false

    if (Capacitor.isNativePlatform()) {
      // A. Try token refresh
      try {
        const refreshedToken = await runRefresh()
        if (refreshedToken && !isTokenExpired(refreshedToken)) {
          const profile = await getMe().catch(() => null)
          if (profile) {
            setUser(profile)
            userRef.current = profile
            queryClient.setQueryData(['user'], profile)
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('upward_session_active', 'true')
              localStorage.setItem('upward_cached_user_profile', JSON.stringify(profile))
            }
            sessionRestored = true
          }
        }
      } catch (err) {
        console.warn('[Auth] Silent token refresh on unlock failed:', err)
      }

      // B. If token refresh failed, try Keychain password credentials fallback
      if (!sessionRestored) {
        console.log('[Auth] Attempting fallback silent re-authentication with Keychain credentials...')
        try {
          const creds = await BiometricsService.getStoredCredentials()
          if (creds && creds.email && creds.password) {
            const res = await authLogin({ email: creds.email, password: creds.password })
            if (res.accessToken) {
              setAccessToken(res.accessToken)
            }
            if (res.refreshToken) {
              setRefreshToken(res.refreshToken)
            }
            setUser(res.user)
            userRef.current = res.user
            queryClient.setQueryData(['user'], res.user)
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('upward_session_active', 'true')
              localStorage.setItem('upward_cached_user_profile', JSON.stringify(res.user))
            }
            sessionRestored = true
          }
        } catch (err) {
          console.warn('[Auth] Silent password re-authentication on unlock failed:', err)
        }
      }
    }

    // 3. If session was restored:
    if (sessionRestored) {
      console.log('[Auth] Session successfully renewed on unlock.')
      setIsPinLocked(false)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('upward_session_active', 'true')
      }
      queryClient.invalidateQueries()
      if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) {
        router.replace('/dashboard')
      }
      return
    }

    // 4. If token was expired and could NOT be renewed:
    console.warn('[Auth] Session expired and could not be renewed. Routing to login.')
    setIsPinLocked(false)
    setUser(null)
    userRef.current = null
    setAccessToken(null)
    setRefreshToken(null)
    router.replace('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        isPinLocked,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
      {isPinLocked && (
        <PinLockScreen
          user={user ? { email: user.email, firstName: user.firstName, lastName: user.lastName } : pinUser}
          onUnlock={handleUnlock}
          onLogout={logout}
        />
      )}
      {showPinSetup && user && (
        <PinSetupModal
          user={{ email: user.email, firstName: user.firstName, lastName: user.lastName }}
          onComplete={() => setShowPinSetup(false)}
        />
      )}
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
