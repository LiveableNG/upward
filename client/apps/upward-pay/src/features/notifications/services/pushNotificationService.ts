'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

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
    
    // Clear existing listeners to prevent duplicates
    await PushNotifications.removeAllListeners()
    
    // Add listeners before registering
    await PushNotifications.addListener('registration', async (token) => {
      if (cachedToken === token.value) return
      cachedToken = token.value

      const platform = Capacitor.getPlatform()
      try {
        await api.post('/user/notifications/device-token', {
          token: token.value,
          platform,
        })
        console.log('[Push] Token registered:', platform)
      } catch (err) {
        console.error('[Push] Token registration failed', err)
      }
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error', err)
    })

    // Handle incoming notifications and taps
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url
      if (url && typeof window !== 'undefined') {
        window.location.href = url
      }
    })

    await PushNotifications.register()
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

// Keep the hook for automatic setup if needed, but refactor to use the service
export function usePushNotifications(isLoggedIn: boolean) {
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

