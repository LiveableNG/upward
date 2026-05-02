'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useRouter } from 'next/navigation'

export const APP_NAVIGATE_EVENT = 'app:navigate'
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

  static async registerDevice(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      // 1. Check existing permission status
      const status = await this.getPermissionStatus()
      if (status !== 'granted') {
        console.warn('[Push] Registration skipped: Permission not granted')
        return
      }

      // 2. Clear existing listeners to prevent leaks
      await PushNotifications.removeAllListeners()
      
      // 3. Add listeners before registering
      await PushNotifications.addListener('registration', async (token) => {
        if (cachedToken === token.value) return
        cachedToken = token.value

        const platform = Capacitor.getPlatform()
        try {
          await api.post('/user/notifications/device-token', {
            token: token.value,
            platform,
          })
          console.log('[Push] Token registered successfully on', platform)
        } catch (err) {
          console.error('[Push] Backend token registration failed', err)
        }
      })

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err)
      })

      // Handle incoming notifications and taps
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
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
      if (cachedToken) {
        const { request } = await import('@/lib/api-client')
        await request('/user/notifications/device-token', {
          method: 'DELETE',
          body: JSON.stringify({ token: cachedToken }),
        })
        cachedToken = null
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
    const setup = async () => {
      if (!isLoggedIn || !Capacitor.isNativePlatform()) return
      
      const status = await PushNotificationService.getPermissionStatus()
      if (status === 'granted') {
        await PushNotificationService.registerDevice()
      }
    }
    
    setup()
  }, [isLoggedIn])
}

