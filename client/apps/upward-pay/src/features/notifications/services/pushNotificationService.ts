'use client'


import { useEffect } from 'react'
import { api } from '@/lib/api'

let cachedToken: string | null = null

export function usePushNotifications(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return

    async function setup() {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const { Capacitor } = await import('@capacitor/core')

        if (!Capacitor.isNativePlatform()) return // Skip on web

        const perm = await PushNotifications.checkPermissions()
        let status = perm.receive

        if (status === 'prompt') {
          const result = await PushNotifications.requestPermissions()
          status = result.receive
        }

        if (status !== 'granted') {
          console.warn('[Push] Permission not granted:', status)
          return
        }

        await PushNotifications.register()

        PushNotifications.addListener('registration', async (token) => {
          if (cachedToken === token.value) return
          cachedToken = token.value

          const platform = Capacitor.getPlatform() // 'android' | 'ios'
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

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] Registration error', err)
        })

        // Handle foreground notification taps (navigate via URL if present)
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = action.notification.data?.url
          if (url && typeof window !== 'undefined') {
            window.location.href = url
          }
        })
      } catch {
        // Not a Capacitor environment — silently skip
      }
    }

    setup()

    return () => {
      // Listeners are removed when the app unmounts; token stays registered
      // until the user explicitly logs out (handled by useLogout hook)
    }
  }, [isLoggedIn])
}

/** Call this on logout to remove the device token from the backend */
export async function unregisterPushToken() {
  if (!cachedToken) return
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return

    // Use the generic api.patch/delete helper — we send token in body
    const { request } = await import('@/lib/api-client')
    await request('/user/notifications/device-token', {
      method: 'DELETE',
      body: JSON.stringify({ token: cachedToken }),
    })
    cachedToken = null
  } catch {
    // Best-effort
  }
}
