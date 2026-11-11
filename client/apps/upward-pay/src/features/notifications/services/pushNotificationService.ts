'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'

export const APP_NAVIGATE_EVENT = 'app:navigate'
const TOKEN_STORAGE_KEY = 'upward_device_push_token'
let cachedToken: string | null = null

export class PushNotificationService {
  static async isAvailable(): Promise<boolean> {
    return Capacitor.isNativePlatform()
  }

  static async getPermissionStatus(): Promise<string> {
    if (!Capacitor.isNativePlatform()) return 'denied'
    const perm = await PushNotifications.checkPermissions()
    return perm.receive
  }

  static async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    const result = await PushNotifications.requestPermissions()
    return result.receive === 'granted'
  }

  static async clearBadge(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await PushNotifications.removeAllDeliveredNotifications()
    } catch (err) {
      console.warn('[Push] Failed to clear badge / delivered notifications:', err)
    }
  }

  static async openSystemSettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    const platform = Capacitor.getPlatform()
    if (platform === 'ios') {
      window.location.href = 'app-settings:'
    } else if (platform === 'android') {
      try {
        window.location.href =
          'intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;S.android.provider.extra.APP_PACKAGE=com.goodtenants.upward;end'
      } catch {
        window.location.href =
          'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.goodtenants.upward;end'
      }
    }
  }

  static async registerDevice(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      // 1. Clear badge / delivered notifications on open
      await this.clearBadge()

      // 2. Check existing permission status
      const status = await this.getPermissionStatus()
      if (status !== 'granted') {
        console.warn('[Push] Registration skipped: Permission not granted')
        return
      }

      // 2. Clear existing listeners to prevent leaks
      await PushNotifications.removeAllListeners()

      // Create high-priority notification channel for Android with custom sound
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'upward_alerts',
          name: 'Upward Alerts',
          description: 'Payment alerts and important updates',
          importance: 5,
          visibility: 1,
          sound: 'upward_chime',
          vibration: true,
        }).catch((err) => console.warn('[Push] Channel creation failed:', err))
      }
      
      // 3. Add listeners before registering
      await PushNotifications.addListener('registration', async (token) => {
        cachedToken = token.value
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_STORAGE_KEY, token.value)
        }

        const platform = Capacitor.getPlatform()
        try {
          await api.post('/user/notifications/device-token', {
            token: token.value,
            platform,
          })
        } catch (err) {
          console.error('[Push] Backend token registration failed', err)
        }
      })

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err)
      })

      // Handle incoming notifications and taps
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        PushNotificationService.clearBadge()
        const url = action.notification.data?.url
        if (url && typeof window !== 'undefined') {
          // Dispatch custom event for client-side navigation
          window.dispatchEvent(new CustomEvent(APP_NAVIGATE_EVENT, { detail: { url } }))
        }
      })

      // 4. Actually call system registration
      await PushNotifications.register()
    } catch (err) {
      console.error('[Push] Unexpected registration setup error', err)
    }
  }

  static async unregisterDevice(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      const tokenToUnregister =
        cachedToken || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null)

      if (tokenToUnregister) {
        const { request } = await import('@/lib/api-client')
        await request('/user/notifications/device-token', {
          method: 'DELETE',
          body: JSON.stringify({ token: tokenToUnregister }),
        }).catch(() => {})
        cachedToken = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_STORAGE_KEY)
        }
      }
      await PushNotifications.removeAllListeners()
    } catch (err) {
      console.error('[Push] Token unregistration failed', err)
    }
  }
}

export function usePushNotifications(isLoggedIn: boolean) {
  const router = useRouter()

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const url = e.detail?.url
      if (url) {
        if (url.startsWith('http') || url.startsWith('upward://')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      }
    }

    window.addEventListener(APP_NAVIGATE_EVENT, handleNavigate)
    return () => window.removeEventListener(APP_NAVIGATE_EVENT, handleNavigate)
  }, [router])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    PushNotificationService.clearBadge()

    const handleAppState = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        PushNotificationService.clearBadge()
        if (isLoggedIn) {
          PushNotificationService.getPermissionStatus().then((status) => {
            if (status === 'granted') {
              PushNotificationService.registerDevice()
            }
          })
        }
      }
    })

    return () => {
      handleAppState.then((h) => h.remove()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (!isLoggedIn) {
      PushNotificationService.unregisterDevice()
    }
  }, [isLoggedIn])

  useEffect(() => {
    const setup = async () => {
      if (!isLoggedIn || !Capacitor.isNativePlatform()) return
      
      const status = await PushNotificationService.getPermissionStatus()

      if (status === 'granted') {
        await PushNotificationService.registerDevice()
      } else if (status === 'prompt') {
        const granted = await PushNotificationService.requestPermission()
        if (granted) {
          await PushNotificationService.registerDevice()
        }
      }
    }
    
    setup()
  }, [isLoggedIn])
}
