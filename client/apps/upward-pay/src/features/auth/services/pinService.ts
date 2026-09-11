import { Preferences } from '@capacitor/preferences'
import { BiometricsService } from './biometricsService'

const PIN_HASH_KEY = 'upward_app_pin_hash'
const PIN_SALT_KEY = 'upward_app_pin_salt'
const PIN_USER_KEY = 'upward_app_pin_user'

export interface PinUserInfo {
  email: string
  firstName: string
  lastName?: string
}

async function sha256(message: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    let hash = 0
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return hash.toString(16)
  }

  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(16)
    window.crypto.getRandomValues(arr)
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).substring(2, 15)
}

export class PinService {
  /**
   * Checks whether a valid PIN is enrolled on the device.
   * If `userEmail` is provided, verifies that the PIN belongs to THIS specific user.
   * If a PIN belongs to a previous or different account, returns false.
   */
  static async hasPin(userEmail?: string): Promise<boolean> {
    try {
      let hash: string | null = null
      const { value } = await Preferences.get({ key: PIN_HASH_KEY })
      hash = value
      if (!hash && typeof window !== 'undefined') {
        hash = localStorage.getItem(PIN_HASH_KEY)
      }

      if (!hash) return false

      if (userEmail) {
        const storedUser = await this.getPinUser()
        if (!storedUser || storedUser.email.toLowerCase() !== userEmail.toLowerCase()) {
          return false
        }
      }
      return true
    } catch {
      return false
    }
  }

  static async setupPin(
    pin: string,
    user: PinUserInfo,
    enableBiometrics: boolean = true
  ): Promise<void> {
    const salt = generateSalt()
    const hash = await sha256(pin + salt)
    const userJson = JSON.stringify(user)

    await Promise.allSettled([
      Preferences.set({ key: PIN_SALT_KEY, value: salt }),
      Preferences.set({ key: PIN_HASH_KEY, value: hash }),
      Preferences.set({ key: PIN_USER_KEY, value: userJson }),
      BiometricsService.setEnabled(enableBiometrics),
    ])

    if (typeof window !== 'undefined') {
      localStorage.setItem(PIN_SALT_KEY, salt)
      localStorage.setItem(PIN_HASH_KEY, hash)
      localStorage.setItem(PIN_USER_KEY, userJson)
    }
  }

  static async verifyPin(pin: string): Promise<boolean> {
    try {
      let salt: string | null = null
      let storedHash: string | null = null

      const saltRes = await Preferences.get({ key: PIN_SALT_KEY })
      const hashRes = await Preferences.get({ key: PIN_HASH_KEY })
      salt = saltRes.value
      storedHash = hashRes.value

      if ((!salt || !storedHash) && typeof window !== 'undefined') {
        salt = salt || localStorage.getItem(PIN_SALT_KEY)
        storedHash = storedHash || localStorage.getItem(PIN_HASH_KEY)
      }

      if (!salt || !storedHash) return false

      const computedHash = await sha256(pin + salt)
      return computedHash === storedHash
    } catch (err) {
      console.error('[PinService] Error verifying PIN:', err)
      return false
    }
  }

  static async getPinUser(): Promise<PinUserInfo | null> {
    try {
      const { value } = await Preferences.get({ key: PIN_USER_KEY })
      if (value) {
        return JSON.parse(value) as PinUserInfo
      }
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem(PIN_USER_KEY)
        if (local) return JSON.parse(local) as PinUserInfo
      }
      return null
    } catch {
      return null
    }
  }

  static async isBiometricsEnabled(): Promise<boolean> {
    return BiometricsService.isEnabled()
  }

  static async setBiometricsEnabled(enabled: boolean): Promise<void> {
    await BiometricsService.setEnabled(enabled)
  }

  static async clearPin(): Promise<void> {
    try {
      await Promise.allSettled([
        Preferences.remove({ key: PIN_HASH_KEY }),
        Preferences.remove({ key: PIN_SALT_KEY }),
        Preferences.remove({ key: PIN_USER_KEY }),
        Preferences.set({ key: PIN_HASH_KEY, value: '' }),
        Preferences.set({ key: PIN_USER_KEY, value: '' }),
      ])
    } catch (err) {
      console.warn('[PinService] Error clearing PIN from preferences:', err)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(PIN_HASH_KEY)
      localStorage.removeItem(PIN_SALT_KEY)
      localStorage.removeItem(PIN_USER_KEY)
    }
  }
}
