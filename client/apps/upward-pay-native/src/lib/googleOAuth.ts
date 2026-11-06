import Constants from 'expo-constants'
import { makeRedirectUri } from 'expo-auth-session'
import { Platform } from 'react-native'

const APP_SCHEME = 'goodtenants'

export function getGoogleOAuthPath(): string {
  const extra = Constants.expoConfig?.extra as { googleOAuthPath?: string } | undefined
  return extra?.googleOAuthPath ?? 'oauth/google'
}

/** Redirect URI registered in Google Cloud Console for this build. */
export function getGoogleRedirectUri(): string {
  return makeRedirectUri({
    scheme: APP_SCHEME,
    path: getGoogleOAuthPath(),
    preferLocalhost: false,
  })
}

/**
 * URIs to add under Google Cloud → OAuth client → Authorized redirect URIs.
 * Logged in dev when Google sign-in is enabled.
 */
export function getGoogleOAuthSetupHints(): string[] {
  const native = getGoogleRedirectUri()
  const hints = [native]

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    hints.push(`${APP_SCHEME}:/${getGoogleOAuthPath()}`)
  }

  return [...new Set(hints)]
}
