import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric'
import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

export const BIOMETRICS_ENABLED_KEY = 'upward_app_biometrics_enabled'
const HAS_RUN_BEFORE_KEY = 'upward_app_has_run_before'

export function getBiometryLabel(type: BiometryType | null): string {
  if (!type) return 'Biometrics'
  if (type === BiometryType.FACE_ID) return 'Face ID'
  if (type === BiometryType.TOUCH_ID) return 'Touch ID'
  if (type === BiometryType.FINGERPRINT) return 'Fingerprint'
  if (type === BiometryType.FACE_AUTHENTICATION) return 'Face Recognition'
  return 'Biometrics'
}

export class BiometricsService {
  private static isPrompting = false
  private static lastPromptFinishedAt = 0
  private static lastUnlockedAt = 0

  /**
   * Detects fresh installs / reinstalls.
   * On iOS, Keychain items persist even after the app is uninstalled.
   * If HAS_RUN_BEFORE_KEY is missing, this is a fresh install, so we clear out any
   * orphaned Keychain credentials from past installations.
   */
  static async initFirstLaunchCheck(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      const { value } = await Preferences.get({ key: HAS_RUN_BEFORE_KEY })
      if (value !== 'true') {
        console.log('[BiometricsService] Fresh install detected. Purging residual data...')
        await NativeBiometric.deleteCredentials({ server: 'upward-pay.app' }).catch(() => {})
        await Preferences.set({ key: BIOMETRICS_ENABLED_KEY, value: 'false' })
        if (typeof window !== 'undefined') {
          localStorage.setItem(BIOMETRICS_ENABLED_KEY, 'false')
        }
        await Preferences.set({ key: HAS_RUN_BEFORE_KEY, value: 'true' })
      }
    } catch (err) {
      console.warn('[BiometricsService] First launch check warning:', err)
    }
  }

  static async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const result = await NativeBiometric.isAvailable()
      return !!result.isAvailable
    } catch (error) {
      console.error('[BiometricsService] Biometrics check failed:', error)
      return false
    }
  }

  static async getBiometryType(): Promise<BiometryType | null> {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const result = await NativeBiometric.isAvailable()
      return result.biometryType || null
    } catch {
      return null
    }
  }

  static async isEnabled(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: BIOMETRICS_ENABLED_KEY })
      if (value === 'true') return true
      if (typeof window !== 'undefined') {
        return localStorage.getItem(BIOMETRICS_ENABLED_KEY) === 'true'
      }
      return false
    } catch {
      return false
    }
  }

  static async setEnabled(enabled: boolean): Promise<void> {
    const val = enabled ? 'true' : 'false'
    try {
      await Preferences.set({
        key: BIOMETRICS_ENABLED_KEY,
        value: val,
      })
    } catch (err) {
      console.warn('[BiometricsService] Failed to setEnabled in preferences:', err)
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(BIOMETRICS_ENABLED_KEY, val)
    }
  }

  static async saveCredentials(email: string, password: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      await NativeBiometric.deleteCredentials({
        server: 'upward-pay.app',
      }).catch(() => {})

      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: 'upward-pay.app',
      })
    } catch (error) {
      console.warn('[BiometricsService] Failed to save credentials to Keychain:', error)
    }
  }

  static async getCredentials(): Promise<{ email: string; password: string } | null> {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const enabled = await this.isEnabled()
      if (!enabled) return null

      const result = await NativeBiometric.getCredentials({
        server: 'upward-pay.app',
      })

      if (result && result.username && result.password) {
        return {
          email: result.username,
          password: result.password,
        }
      }
      return null
    } catch (error) {
      console.warn('[BiometricsService] Failed to get biometric credentials:', error)
      return null
    }
  }

  /**
   * Retrieves credentials securely saved in device Keychain/Keystore regardless of
   * whether biometric unlock toggle is active. Used for silent re-authentication on PIN unlock.
   */
  static async getStoredCredentials(): Promise<{ email: string; password: string } | null> {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const result = await NativeBiometric.getCredentials({
        server: 'upward-pay.app',
      })

      if (result && result.username && result.password) {
        return {
          email: result.username,
          password: result.password,
        }
      }
      return null
    } catch (error) {
      console.warn('[BiometricsService] Failed to get stored credentials:', error)
      return null
    }
  }

  static async clearCredentials(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.deleteCredentials({
          server: 'upward-pay.app',
        }).catch(() => {})
      }
    } catch (e) {
      console.warn('[BiometricsService] Error during deleteCredentials:', e)
    }
    await this.setEnabled(false)
  }

  /**
   * Tracks whether the native biometric dialog is active OR has just dismissed.
   * On iOS/Android, dismissing the biometric dialog fires appStateChange(isActive: true).
   * We suppress background/lock checks during prompt and for 3s afterwards to prevent infinite loops.
   */
  static isBiometricPrompting(): boolean {
    return this.isPrompting || Date.now() - this.lastPromptFinishedAt < 3000
  }

  static isJustUnlocked(): boolean {
    return Date.now() - this.lastUnlockedAt < 3000
  }

  static setJustUnlocked(): void {
    this.lastUnlockedAt = Date.now()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_backgrounded_at')
    }
  }

  static async authenticate(reason: string = 'Please authenticate to access Upward Pay'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false

    this.isPrompting = true
    try {
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Biometric Login',
        subtitle: 'Log in securely',
        description: 'Use your biometrics to access your account',
        negativeButtonText: 'Use PIN',
      })
      return true
    } catch (error) {
      console.warn('[BiometricsService] Biometric verification dismissed or failed:', error)
      return false
    } finally {
      this.isPrompting = false
      this.lastPromptFinishedAt = Date.now()
    }
  }
}
