import * as Notifications from 'expo-notifications'
import { useRouter, type Href } from 'expo-router'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'
import {
  syncPushRegistrationForLoggedInUser,
  unregisterPushToken,
} from '@/features/notifications/services/pushNotificationService'

function resolveNotificationHref(url: string): Href | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('goodtenants://')) {
    const path = trimmed.replace(/^goodtenants:\/\//, '/')
    return path as Href
  }
  if (trimmed.startsWith('/')) return trimmed as Href
  return null
}

export function PushNotificationsSync() {
  const { isLoggedIn } = useAuth()
  const router = useRouter()
  const wasLoggedIn = useRef(false)

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url
      if (typeof url !== 'string') return
      const href = resolveNotificationHref(url)
      if (href) router.push(href)
    })
    return () => sub.remove()
  }, [router])

  useEffect(() => {
    if (isLoggedIn) {
      wasLoggedIn.current = true
      void syncPushRegistrationForLoggedInUser()
      return
    }
    if (wasLoggedIn.current) {
      void unregisterPushToken()
      wasLoggedIn.current = false
    }
  }, [isLoggedIn])

  return null
}
