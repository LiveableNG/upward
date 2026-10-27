import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { request } from '@/lib/api-client'

let cachedToken: string | null = null

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerPushTokenWithBackend(token: string): Promise<void> {
  if (cachedToken === token) return
  cachedToken = token
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS
  await request('/user/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  })
}

export async function unregisterPushToken(): Promise<void> {
  if (!cachedToken) return
  const token = cachedToken
  try {
    await request('/user/notifications/device-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    })
  } finally {
    cachedToken = null
  }
}

export async function obtainExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Upward Pay',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined,
    )
    return tokenData.data
  } catch {
    return null
  }
}

export async function syncPushRegistrationForLoggedInUser(): Promise<void> {
  const token = await obtainExpoPushToken()
  if (token) {
    await registerPushTokenWithBackend(token)
  }
}
