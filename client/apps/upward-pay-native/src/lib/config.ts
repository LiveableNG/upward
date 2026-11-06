import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined

const DEV_API = 'http://127.0.0.1:4500/api/v1'

/** Override with EXPO_PUBLIC_API_URL in app env. In dev, local API wins unless env is set explicitly. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? DEV_API : (extra?.apiUrl ?? DEV_API))

/** Public web app origin for profile links (Rent Passport share). */
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://upward.goodtenants.io'
