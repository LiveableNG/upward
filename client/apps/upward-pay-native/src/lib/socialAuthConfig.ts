export function getGoogleClientIds() {
  return {
    web:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
      undefined,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? undefined,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? undefined,
  }
}

export function isGoogleAuthEnabled(): boolean {
  const ids = getGoogleClientIds()
  return !!(ids.web || ids.ios || ids.android)
}

export function isAppleAuthEnabled(): boolean {
  return process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED !== 'false'
}
