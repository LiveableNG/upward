import { request } from '@/lib/api-client'
import { setAccessToken } from '@/lib/auth-token'

export const landlordLogin = async (data: { email: string; password?: string; otp?: string; type: 'PASSWORD' | 'OTP' }) => {
  const res = await request<any>('/landlords/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (res.accessToken) setAccessToken(res.accessToken)
  return res
}

export const landlordRequestOTP = async (email: string) => {
  return request<any>('/landlords/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const checkLandlordExistence = async (email: string) => {
  return request<{ exists: boolean }>('/landlords/auth/check-existence', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}

export const landlordRefresh = async () => {
  const res = await request<any>('/landlords/auth/refresh', {
    method: 'POST'
  })
  if (res.accessToken) setAccessToken(res.accessToken)
  return res
}

export const getLandlordPortfolio = async () => {
  return request<any>('/landlords/portfolio/summary', { method: 'GET' })
}

export const landlordChangePassword = async (password: string) => {
  return request<any>('/landlords/portfolio/change-password', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}
