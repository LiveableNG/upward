import { Capacitor } from '@capacitor/core'

export function isAppleAuthEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    return true
  }
  return !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID
}
