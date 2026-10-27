import { request } from '@/lib/api-client'
import { type AuthResponse, type UserProfile } from '@/features/auth/types'

export type CheckEmailResult = {
  exists: boolean
  hasPassword?: boolean
  isInvited?: boolean
  isWaitlist?: boolean
  authProvider?: string
}

function parseCheckEmailResult(raw: unknown): CheckEmailResult {
  if (!raw || typeof raw !== 'object') {
    return { exists: false }
  }
  const record = raw as Record<string, unknown>
  if (typeof record.exists === 'boolean') {
    return {
      exists: record.exists,
      hasPassword: record.hasPassword as boolean | undefined,
      isInvited: record.isInvited as boolean | undefined,
      isWaitlist: record.isWaitlist as boolean | undefined,
      authProvider: record.authProvider as string | undefined,
    }
  }
  if (record.data && typeof record.data === 'object') {
    return parseCheckEmailResult(record.data)
  }
  return { exists: false }
}

export async function signup(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  isFromWaitlist?: boolean
  isFromInvite?: boolean
  hearAboutUs?: string
}) {
  return request<AuthResponse>('/user/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function socialSignIn(data: {
  provider: 'google' | 'apple'
  idToken: string
  firstName?: string
  lastName?: string
}) {
  return request<AuthResponse>('/user/auth/social', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(credentials: {
  email: string
  password: string
  type?: 'email' | 'phone'
}) {
  return request<AuthResponse>('/user/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function loginWithOTP(email: string, otp: string, type?: 'email' | 'phone') {
  return request<AuthResponse>('/user/auth/otp-login', {
    method: 'POST',
    body: JSON.stringify({ email, otp, type }),
  })
}

export async function logout() {
  return request<{ message: string }>('/user/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function getMe() {
  return request<UserProfile>('/user/auth/me')
}

export async function updateProfile(data: Partial<UserProfile>) {
  return request<{ success: boolean; user: UserProfile }>('/user/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getAvatarUploadUrl(contentType: string, filename: string) {
  return request<{ key: string; uploadUrl: string; publicUrl: string }>(
    '/user/auth/avatar-upload-url',
    {
      method: 'POST',
      body: JSON.stringify({ contentType, filename }),
    },
  )
}

export async function checkEmail(email: string, type?: 'email' | 'phone') {
  const raw = await request<unknown>('/user/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  })
  return parseCheckEmailResult(raw)
}

export async function requestOTP(
  email: string,
  context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' | 'WAITLIST',
  type?: 'email' | 'phone',
  channel?: 'SMS' | 'WHATSAPP',
) {
  return request<{ success: boolean; message: string }>('/user/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, context, type, channel }),
  })
}

export async function verifyOTP(
  email: string,
  otp: string,
  context: string,
  type?: 'email' | 'phone',
) {
  return request<{ success: boolean; message?: string; inviteToken?: string }>(
    '/user/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, otp, context, type }),
    },
  )
}

export async function forgotPassword(email: string) {
  return request<{ success: boolean; message: string }>('/user/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyResetOtp(email: string, otp: string) {
  return request<{ success: boolean; message: string }>('/user/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

export async function resetPassword(data: { email: string; otp: string; new: string }) {
  return request<{ success: boolean; message: string }>('/user/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function changePassword(data: { current: string; new: string; confirm: string }) {
  return request<{ success?: boolean; message?: string }>('/user/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function submitFeedback(data: {
  userId: number
  email: string
  name: string
  type: string
  message: string
}) {
  return request<{ success?: boolean; message?: string }>('/public/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function requestDeleteAccountOtp() {
  return request<{ success: boolean; emailMasked?: string; cooldownSeconds?: number }>(
    '/user/auth/delete-account/request-otp',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

export async function deleteAccount(data: { reason?: string; otp: string }) {
  return request<{ success: boolean; message?: string }>('/user/auth/delete-account', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function verifyKyc(data: { type: 'BVN' | 'NIN'; idNumber: string }) {
  return request<{ success: boolean; message?: string }>('/user/auth/verify-kyc', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
