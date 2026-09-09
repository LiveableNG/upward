import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'
import { setCookie, deleteCookie } from './cookie-utils'

let inMemoryToken: string | null = null
let inMemoryRefreshToken: string | null = null

const ACCESS_TOKEN_KEY = 'upward_pay_access_token'
const REFRESH_TOKEN_KEY = 'upward_pay_refresh_token'

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return true

    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64

    const payload = JSON.parse(atob(padded))
    const now = Math.floor(Date.now() / 1000)

    // Consider expired if less than 30 seconds remaining
    return payload.exp < now + 30
  } catch {
    return true
  }
}

export const setAccessToken = (token: string | null) => {
  inMemoryToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
      setCookie('pay_access_token', token)
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: ACCESS_TOKEN_KEY, value: token }).catch(() => {})
      }
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      deleteCookie('pay_access_token')
      if (Capacitor.isNativePlatform()) {
        Preferences.remove({ key: ACCESS_TOKEN_KEY }).catch(() => {})
      }
    }
  }
}

export const getAccessToken = () => {
  if (!inMemoryToken && typeof window !== 'undefined') {
    inMemoryToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  }
  return inMemoryToken
}

export const setRefreshToken = (token: string | null) => {
  inMemoryRefreshToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
      if (Capacitor.isNativePlatform()) {
        Preferences.set({ key: REFRESH_TOKEN_KEY, value: token }).catch(() => {})
      }
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      if (Capacitor.isNativePlatform()) {
        Preferences.remove({ key: REFRESH_TOKEN_KEY }).catch(() => {})
      }
    }
  }
}

export const getRefreshToken = () => {
  if (!inMemoryRefreshToken && typeof window !== 'undefined') {
    inMemoryRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  }
  return inMemoryRefreshToken
}

/**
 * Initializes tokens from native Preferences if localStorage was reset by the OS.
 */
export const initStoredTokens = async () => {
  if (typeof window === 'undefined') return
  try {
    let token = inMemoryToken || localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token && Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY })
      if (value) {
        token = value
        localStorage.setItem(ACCESS_TOKEN_KEY, value)
      }
    }
    if (token) {
      inMemoryToken = token
      setCookie('pay_access_token', token)
    }

    let rToken = inMemoryRefreshToken || localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!rToken && Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY })
      if (value) {
        rToken = value
        localStorage.setItem(REFRESH_TOKEN_KEY, value)
      }
    }
    if (rToken) {
      inMemoryRefreshToken = rToken
    }
  } catch (e) {
    console.warn('[auth-token] Error initializing stored tokens:', e)
  }
}




