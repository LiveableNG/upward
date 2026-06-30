export function isGoogleAuthEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_MOBILE
  )
}
