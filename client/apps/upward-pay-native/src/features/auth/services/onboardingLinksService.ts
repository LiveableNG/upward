import { type AuthResponse, type UserProfile } from '@/features/auth/types'
import { request } from '@/lib/api-client'

export type InvitePreview = {
  success?: boolean
  isWaitlist?: boolean
  hasPassword?: boolean
  email?: string
  phone?: string | null
  isPhoneOnly?: boolean
  firstName?: string
  lastName?: string
  company?: { name: string; profilePic?: string } | null
}

export type WaitlistClaimPreview = {
  success?: boolean
  hasPassword?: boolean
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
}

export async function fetchInvite(token: string): Promise<InvitePreview> {
  return request<InvitePreview>(`/public/invite/${encodeURIComponent(token)}`, { method: 'GET' })
}

export async function acceptInvite(
  token: string,
  body: {
    password: string
    firstName: string
    lastName: string
    email: string
  },
): Promise<AuthResponse & { success?: boolean; message?: string }> {
  return request(`/public/invite/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchWaitlistClaim(uuid: string): Promise<WaitlistClaimPreview> {
  return request<WaitlistClaimPreview>(`/waitlist/claim/${encodeURIComponent(uuid)}`, {
    method: 'GET',
  })
}

export async function acceptWaitlistClaim(
  uuid: string,
  body: {
    password: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  },
): Promise<AuthResponse & { success?: boolean }> {
  return request(`/waitlist/claim/${encodeURIComponent(uuid)}/accept`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function isAuthPayload(
  res: unknown,
): res is AuthResponse & { user: UserProfile; accessToken: string } {
  if (!res || typeof res !== 'object') return false
  const r = res as Record<string, unknown>
  return typeof r.accessToken === 'string' && r.user != null && typeof r.user === 'object'
}
