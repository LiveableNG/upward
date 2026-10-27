import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import {
  BIO_CRED_EMAIL_KEY,
  BIO_CRED_PASSWORD_KEY,
  BIOMETRICS_ENABLED_KEY,
  HAS_RUN_BEFORE_KEY,
} from '@/features/auth/security/pinConfig'

let isPrompting = false
let lastPromptFinishedAt = 0
let lastUnlockedAt = 0

export function getBiometryLabel(types: LocalAuthentication.AuthenticationType[] | null): string {
  if (!types?.length) return 'Biometrics'
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint'
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris unlock'
  }
  return 'Biometrics'
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

export async function initFirstLaunchCheck(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const hasRun = await secureGet(HAS_RUN_BEFORE_KEY)
    if (hasRun === 'true') return
    await clearBiometricCredentials()
    await secureSet(BIOMETRICS_ENABLED_KEY, 'false')
    await secureSet(HAS_RUN_BEFORE_KEY, 'true')
  } catch {
    // ignore
  }
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) return false
    return LocalAuthentication.isEnrolledAsync()
  } catch {
    return false
  }
}

export async function getBiometryTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
  if (Platform.OS === 'web') return []
  try {
    return await LocalAuthentication.supportedAuthenticationTypesAsync()
  } catch {
    return []
  }
}

export async function isBiometricsEnabled(): Promise<boolean> {
  const value = await secureGet(BIOMETRICS_ENABLED_KEY)
  return value === 'true'
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await secureSet(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function saveBiometricCredentials(email: string, password: string): Promise<void> {
  if (Platform.OS === 'web') return
  await secureSet(BIO_CRED_EMAIL_KEY, email)
  await secureSet(BIO_CRED_PASSWORD_KEY, password)
}

export async function getBiometricCredentials(): Promise<{
  email: string
  password: string
} | null> {
  if (Platform.OS === 'web') return null
  try {
    const enabled = await isBiometricsEnabled()
    if (!enabled) return null
    const email = await secureGet(BIO_CRED_EMAIL_KEY)
    const password = await secureGet(BIO_CRED_PASSWORD_KEY)
    if (email && password) return { email, password }
    return null
  } catch {
    return null
  }
}

export async function clearBiometricCredentials(): Promise<void> {
  await Promise.all([
    secureDelete(BIO_CRED_EMAIL_KEY),
    secureDelete(BIO_CRED_PASSWORD_KEY),
    secureSet(BIOMETRICS_ENABLED_KEY, 'false'),
  ])
}

export function isBiometricPrompting(): boolean {
  return isPrompting || Date.now() - lastPromptFinishedAt < 3000
}

export function isJustUnlocked(): boolean {
  return Date.now() - lastUnlockedAt < 3000
}

export function setJustUnlocked(): void {
  lastUnlockedAt = Date.now()
}

export async function authenticateBiometric(
  reason = 'Confirm your identity to access Upward Pay',
): Promise<boolean> {
  if (Platform.OS === 'web') return false
  isPrompting = true
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    })
    return result.success
  } catch {
    return false
  } finally {
    isPrompting = false
    lastPromptFinishedAt = Date.now()
  }
}
