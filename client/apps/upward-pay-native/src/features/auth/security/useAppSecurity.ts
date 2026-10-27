import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'

import { BACKGROUND_LOCK_MS } from '@/features/auth/security/pinConfig'
import {
  initFirstLaunchCheck,
  isBiometricPrompting,
  isJustUnlocked,
} from '@/features/auth/security/biometricsService'
import { hasAppPin } from '@/features/auth/security/pinService'
import { type UserProfile } from '@/features/auth/types'

export function useAppSecurity(user: UserProfile | null, authLoading: boolean) {
  const [isPinLocked, setIsPinLocked] = useState(false)
  const [pinSetupVisible, setPinSetupVisible] = useState(false)
  const [securityReady, setSecurityReady] = useState(Platform.OS === 'web')
  const backgroundedAt = useRef<number | null>(null)
  const skipLockOnNextUserCheck = useRef(false)
  const pinSetupPrompted = useRef(false)

  useEffect(() => {
    void initFirstLaunchCheck()
  }, [])

  const evaluateSessionSecurity = useCallback(async (profile: UserProfile | null) => {
    if (Platform.OS === 'web') {
      setSecurityReady(true)
      return
    }
    if (!profile) {
      setIsPinLocked(false)
      setPinSetupVisible(false)
      setSecurityReady(true)
      return
    }

    const enrolled = await hasAppPin(profile.email)
    if (skipLockOnNextUserCheck.current) {
      skipLockOnNextUserCheck.current = false
      if (!enrolled && !pinSetupPrompted.current) {
        pinSetupPrompted.current = true
        setPinSetupVisible(true)
      }
      setIsPinLocked(false)
      setSecurityReady(true)
      return
    }

    if (enrolled) {
      setIsPinLocked(true)
      setPinSetupVisible(false)
    } else if (!pinSetupPrompted.current) {
      pinSetupPrompted.current = true
      setPinSetupVisible(true)
    }
    setSecurityReady(true)
  }, [])

  useEffect(() => {
    if (authLoading) return
    void evaluateSessionSecurity(user)
  }, [authLoading, user?.email, evaluateSessionSecurity, user])

  useEffect(() => {
    if (Platform.OS === 'web') return

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (user && !isBiometricPrompting()) {
          backgroundedAt.current = Date.now()
        }
        return
      }

      if (nextState !== 'active') return
      if (isBiometricPrompting() || isJustUnlocked()) return

      void (async () => {
        if (!user) return
        const enrolled = await hasAppPin(user.email)
        if (!enrolled) return
        const at = backgroundedAt.current
        if (at && Date.now() - at < BACKGROUND_LOCK_MS) return
        setIsPinLocked(true)
        backgroundedAt.current = null
      })()
    })

    return () => sub.remove()
  }, [user?.email, user])

  const notifyFreshSignIn = useCallback(() => {
    skipLockOnNextUserCheck.current = true
  }, [])

  const unlockApp = useCallback(() => {
    setIsPinLocked(false)
  }, [])

  const completePinSetup = useCallback(() => {
    setPinSetupVisible(false)
    setIsPinLocked(false)
  }, [])

  const dismissPinSetup = useCallback(() => {
    setPinSetupVisible(false)
  }, [])

  const promptPinSetup = useCallback(() => {
    setPinSetupVisible(true)
  }, [])

  const resetSecuritySession = useCallback(() => {
    pinSetupPrompted.current = false
    skipLockOnNextUserCheck.current = false
    setIsPinLocked(false)
    setPinSetupVisible(false)
    setSecurityReady(Platform.OS === 'web')
  }, [])

  return {
    isPinLocked,
    pinSetupVisible,
    securityReady,
    unlockApp,
    completePinSetup,
    dismissPinSetup,
    promptPinSetup,
    notifyFreshSignIn,
    resetSecuritySession,
  }
}
