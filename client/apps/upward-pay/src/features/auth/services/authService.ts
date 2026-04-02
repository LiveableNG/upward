import { request } from '@/lib/api-client'
import { type AuthResponse, type TenantProfile } from '../types'

export async function signup(data: {
  email: string
  password: string
  fullName: string
  phone?: string
}) {
  return request<AuthResponse>('/tenant-auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function login(data: { email: string; password: string }) {
  return request<AuthResponse>('/tenant-auth/login', { method: 'POST', body: JSON.stringify(data) })
}

export async function logout() {
  return request<{ message: string }>('/tenant-auth/logout', { method: 'POST' })
}

export async function getMe() {
  return request<TenantProfile>('/tenant-auth/me')
}

export async function updateProfile(data: Partial<TenantProfile>) {
  return request<{ success: boolean; tenant: TenantProfile }>('/tenant-auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function completeProfile(data: {
  email: string
  password: string
  phone?: string
  dateOfBirth?: string
  occupation?: string
  gender?: string
}) {
  return request<AuthResponse>('/tenant-auth/complete-profile', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
