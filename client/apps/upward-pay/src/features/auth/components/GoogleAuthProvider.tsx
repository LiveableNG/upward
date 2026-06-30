'use client'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { Capacitor } from '@capacitor/core'

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform()
  const clientId = isNative
    ? (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_MOBILE || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
    : (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)

  if (!clientId) {
    return <>{children}</>
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
}
