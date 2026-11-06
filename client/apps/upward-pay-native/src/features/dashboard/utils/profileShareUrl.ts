import { WEB_BASE_URL } from '@/lib/config'

export function buildProfileShareUrl(identifier: string | null | undefined): string | null {
  if (!identifier?.trim()) return null
  const base = WEB_BASE_URL.replace(/\/$/, '')
  return `${base}/profile/${encodeURIComponent(identifier.trim())}`
}
