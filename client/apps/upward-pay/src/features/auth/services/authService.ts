import { request } from '@/lib/api-client'
import { type AuthResponse, type UserProfile } from '../types'

export async function signup(data: {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  rentEndDate?: string
  address?: string
  isFromWaitlist?: boolean
  isFromInvite?: boolean
  properties?: Array<{
    address: string;
    rentEndDate: string;
    companyName?: string;
    managerName?: string;
  }>
}) {
  return request<AuthResponse>('/user/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(data: { email: string; password: string }) {
  return request<AuthResponse>('/user/auth/login', { method: 'POST', body: JSON.stringify(data) })
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

export async function completeProfile(data: {
  email: string
  password?: string
  fullName: string
  phone?: string
  dateOfBirth?: string
  occupation?: string
  gender?: string
  invitedByCompanyId?: string
  invitedByCompanyName?: string
  invitedByCompanyLogo?: string
  address?: string
  profilePic?: string
  properties?: Array<{
    address: string;
    rentEndDate: string;
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
