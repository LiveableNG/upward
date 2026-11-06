import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { AppSecurityOverlay } from '@/features/auth/components/AppSecurityOverlay'
import { getMe, logout as apiLogout } from '@/features/auth/services/authService'
import { useAppSecurity } from '@/features/auth/security/useAppSecurity'
import { type UserProfile } from '@/features/auth/types'
import {
  clearAuthTokens,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/auth-storage'

type AuthContextValue = {
  user: UserProfile | null
  loading: boolean
  isLoggedIn: boolean
  isPinLocked: boolean
  signIn: (
    tokens: { accessToken: string; refreshToken?: string },
    user: UserProfile,
  ) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  unlockApp: () => void
  promptPinSetup: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const {
    isPinLocked,
    pinSetupVisible,
    securityReady,
    unlockApp,
    completePinSetup,
    dismissPinSetup,
    promptPinSetup,
    notifyFreshSignIn,
    resetSecuritySession,
  } = useAppSecurity(user, authLoading)

  const loading = authLoading || (!!user && !securityReady)

  const refreshUser = useCallback(async () => {
    const profile = await getMe()
    setUser(profile)
    queryClient.setQueryData(['user'], profile)
  }, [queryClient])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const profile = await getMe()
        if (!cancelled) {
          setUser(profile)
          queryClient.setQueryData(['user'], profile)
        }
      } catch {
        await clearAuthTokens()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [queryClient])

  const signIn = useCallback(
    async (tokens: { accessToken: string; refreshToken?: string }, profile: UserProfile) => {
      notifyFreshSignIn()
      await setAccessToken(tokens.accessToken)
      if (tokens.refreshToken) {
        await setRefreshToken(tokens.refreshToken)
      }
      queryClient.clear()
      setUser(profile)
      queryClient.setQueryData(['user'], profile)
    },
    [queryClient, notifyFreshSignIn],
  )

  const signOut = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Still clear local session if the network call fails.
    }
    await clearAuthTokens()
    queryClient.clear()
    resetSecuritySession()
    setUser(null)
  }, [queryClient, resetSecuritySession])

  const handleLockLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isLoggedIn: !!user,
      isPinLocked,
      signIn,
      signOut,
      refreshUser,
      unlockApp,
      promptPinSetup,
    }),
    [user, loading, isPinLocked, signIn, signOut, refreshUser, unlockApp, promptPinSetup],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AppSecurityOverlay
        user={user}
        isPinLocked={isPinLocked}
        pinSetupVisible={pinSetupVisible}
        onUnlock={unlockApp}
        onLogout={() => void handleLockLogout()}
        onPinSetupComplete={completePinSetup}
        onPinSetupDismiss={dismissPinSetup}
      />
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
