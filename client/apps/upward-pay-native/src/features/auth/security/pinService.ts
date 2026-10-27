import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { PIN_HASH_KEY, PIN_SALT_KEY, PIN_USER_KEY } from '@/features/auth/security/pinConfig'
import {
  clearBiometricCredentials,
  setBiometricsEnabled,
} from '@/features/auth/security/biometricsService'

export type PinUserInfo = {
  email: string
  firstName: string
  lastName?: string
}

async function sha256(message: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, message)
}

function generateSalt(): string {
  const bytes = Crypto.getRandomBytes(16)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return
  await SecureStore.setItemAsync(key, value)
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await SecureStore.deleteItemAsync(key)
  } catch {
    // ignore
  }
}

export async function hasAppPin(userEmail?: string): Promise<boolean> {
  try {
    const hash = await secureGet(PIN_HASH_KEY)
    if (!hash) return false
    if (userEmail) {
      const storedUser = await getPinUser()
      if (!storedUser || storedUser.email.toLowerCase() !== userEmail.toLowerCase()) {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

export async function setupAppPin(
  pin: string,
  user: PinUserInfo,
  enableBiometrics = true,
): Promise<void> {
  const salt = generateSalt()
  const hash = await sha256(`${salt}${pin}`)
  const userJson = JSON.stringify(user)

  await Promise.all([
    secureSet(PIN_SALT_KEY, salt),
    secureSet(PIN_HASH_KEY, hash),
    secureSet(PIN_USER_KEY, userJson),
    setBiometricsEnabled(enableBiometrics),
  ])
}

export async function verifyAppPin(pin: string): Promise<boolean> {
  try {
    const salt = await secureGet(PIN_SALT_KEY)
    const storedHash = await secureGet(PIN_HASH_KEY)
    if (!salt || !storedHash) return false
    const computedHash = await sha256(`${salt}${pin}`)
    return computedHash === storedHash
  } catch {
    return false
  }
}

export async function getPinUser(): Promise<PinUserInfo | null> {
  try {
    const value = await secureGet(PIN_USER_KEY)
    if (!value) return null
    return JSON.parse(value) as PinUserInfo
  } catch {
    return null
  }
}

export async function clearAppPin(): Promise<void> {
  await Promise.all([
    secureDelete(PIN_HASH_KEY),
    secureDelete(PIN_SALT_KEY),
    secureDelete(PIN_USER_KEY),
    clearBiometricCredentials(),
  ])
}
