import { request } from '@/lib/api-client'
import { setAccessToken } from '@/lib/auth-token'

export const signup = async (data: any) => {
  const res = await request<any>('/pm/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (res.accessToken) setAccessToken(res.accessToken)
  return res
}

export const login = async (data: any) => {
  const res = await request<any>('/pm/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (res.accessToken) setAccessToken(res.accessToken)
  return res
}

export const requestOTP = async (email: string, context: 'SIGNUP' | 'LOGIN') => {
  return request<any>('/pm/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, context })
  })
}

export const verifyOTP = async (email: string, otp: string, context: string) => {
  return request<any>('/pm/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, context })
  })
}

export const otpLogin = async (email: string, otp: string) => {
  const res = await request<any>('/pm/auth/otp-login', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  })
  if (res.accessToken) setAccessToken(res.accessToken)
  return res
}

export const logout = async () => {
  await request('/pm/auth/logout', { method: 'POST' })
  setAccessToken(null)
}

export const getMe = async () => {
  return request<any>('/pm/auth/me', { method: 'GET' })
}

export const acceptTerms = async (version: string = '2026-08-24') => {
  return request<{ success: boolean; termsAcceptedAt: string; termsVersion: string }>('/pm/auth/accept-terms', {
    method: 'POST',
    body: JSON.stringify({ version }),
  })
}

export const checkEmail = async (email: string) => {
  return request<{ exists: boolean; isInvited?: boolean; inviteToken?: string }>('/pm/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const forgotPassword = async (email: string) => {
  return request<{ success: boolean; message: string }>('/pm/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const resetPassword = async (email: string, otp: string, newPass: string) => {
  return request<{ success: boolean; message: string }>('/pm/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, new: newPass })
  })
}

export const verifyResetOtp = async (email: string, otp: string) => {
  return request<{ success: boolean; message: string }>('/pm/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  })
}
