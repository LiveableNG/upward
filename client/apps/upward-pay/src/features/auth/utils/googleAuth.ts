export function isGoogleAuthEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
}
