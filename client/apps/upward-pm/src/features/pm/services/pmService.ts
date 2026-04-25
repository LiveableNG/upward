import { request } from '@/lib/api-client'

export const updateProfile = async (data: any) => {
  return request('/pm/profile', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const updateBankInfo = async (data: any) => {
  return request('/pm/profile/bank-info', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const verifyBank = async (accountNumber: string, bankCode: string) => {
  return request<any>('/pm/profile/verify-bank', {
    method: 'POST',
    body: JSON.stringify({ accountNumber, bankCode })
  })
}

export const getBanks = async () => {
  return request<any[]>('/pm/profile/banks', {
    method: 'GET'
  })
}

export const changePassword = async (data: any) => {
  return request('/pm/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}

export const getAvatarUploadUrl = async (contentType: string, filename: string) => {
  return request<any>('/pm/profile/avatar-url', {
    method: 'POST',
    body: JSON.stringify({ contentType, filename })
  })
}
