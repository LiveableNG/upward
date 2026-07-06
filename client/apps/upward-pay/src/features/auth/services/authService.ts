import { request } from '@/lib/api-client'
import { type AuthResponse, type UserProfile } from '../types'

export async function signup(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  phone?: string
  address?: string
  isFromWaitlist?: boolean
  isFromInvite?: boolean
  properties?: Array<{
    uuid?: string;
    address: string;
    subarea?: string;
    state?: string;
    country?: string;
    rentDueDate?: string;
    companyName?: string;
    managerName?: string;
  }>
}) {
  return request<AuthResponse>('/user/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function socialSignIn(data: { provider: 'google'; idToken: string }) {
  return request<AuthResponse>('/user/auth/social', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(credentials: { email: string; password: string; type?: 'email' | 'phone' }) {
  return request<AuthResponse>('/user/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export async function logout() {
  return request<{ message: string }>('/user/auth/logout', { method: 'POST', body: JSON.stringify({}) })
}

export async function refreshToken() {
  return request<AuthResponse>('/user/auth/refresh', { method: 'POST', body: JSON.stringify({}) })
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
  return request<{ key: string; uploadUrl: string; publicUrl: string }>('/user/auth/avatar-upload-url', {
    method: 'POST',
    body: JSON.stringify({ contentType, filename }),
  })
}

export async function completeProfile(data: {
  email: string
  password?: string
  fullName: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  invitedByCompanyId?: string
  invitedByCompanyName?: string
  invitedByCompanyLogo?: string
  address?: string
  profilePic?: string
  properties?: Array<{
    uuid?: string;
    address: string;
    subarea?: string;
    state?: string;
    country?: string;
    rentDueDate?: string;
    companyName?: string;
    managerName?: string;
  }>
}) {
  return request<AuthResponse>('/user/auth/complete-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
export async function forgotPassword(email: string) {
  return request<{ success: boolean; message: string }>('/user/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(data: { email: string; otp: string; new: string }) {
  return request<{ success: boolean; message: string }>('/user/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function checkEmail(email: string, type?: 'email' | 'phone') {
  return request<{
    exists: boolean
    hasPassword?: boolean
    isInvited?: boolean
    uuid?: string
    isWaitlist?: boolean
    authProvider?: string
  }>('/user/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  })
}

export async function requestOTP(email: string, context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' | 'WAITLIST', type?: 'email' | 'phone') {
  return request<{ success: boolean; message: string }>('/user/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, context, type }),
  })
}

export async function verifyOTP(email: string, otp: string, context: string, type?: 'email' | 'phone') {
  return request<{ success: boolean; message?: string; inviteToken?: string }>('/user/auth/verify-otp', {

    method: 'POST',
    body: JSON.stringify({ email, otp, context, type }),
  })
}

export async function loginWithOTP(email: string, otp: string, type?: 'email' | 'phone') {
  return request<AuthResponse>('/user/auth/otp-login', {
    method: 'POST',
    body: JSON.stringify({ email, otp, type }),
  })
}

export async function verifyBvn(bvn: string) {
  return request<{ success: boolean; message: string }>('/user/auth/verify-bvn', {
    method: 'POST',
    body: JSON.stringify({ bvn }),
  })
}

