import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const ACCESS_KEY = 'upward_access_token'
const REFRESH_KEY = 'upward_refresh_token'

const canUseSecureStore = Platform.OS !== 'web'

export async function getAccessToken(): Promise<string | null> {
  if (!canUseSecureStore) return null
  return SecureStore.getItemAsync(ACCESS_KEY)
}

export async function getRefreshToken(): Promise<string | null> {
  if (!canUseSecureStore) return null
  return SecureStore.getItemAsync(REFRESH_KEY)
}

export async function setAccessToken(token: string): Promise<void> {
  if (!canUseSecureStore) return
  await SecureStore.setItemAsync(ACCESS_KEY, token)
}

export async function setRefreshToken(token: string): Promise<void> {
  if (!canUseSecureStore) return
  await SecureStore.setItemAsync(REFRESH_KEY, token)
}

export async function clearAuthTokens(): Promise<void> {
  if (!canUseSecureStore) return
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ])
}
