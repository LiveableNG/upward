/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'

export const api = {
  signup: (data: any) =>
    request<any>('/tenant/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  login: (data: any) =>
    request<any>('/tenant/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<any>('/tenant/auth/logout', {
      method: 'POST',
    }),

  // Payments
  getPaymentRequest: (token: string) =>
    request<any>(`/payments/request/${token}`, {
      method: 'GET',
    }),
  getSavedLandlords: () =>
    request<any>('/payments/landlords', {
      method: 'GET',
    }),
  saveLandlord: (data: any) =>
    request<any>('/payments/landlords', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordTransaction: (data: any) =>
    request<any>('/payments/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBanks: () =>
    request<any[]>('/payments/banks', {
      method: 'GET',
    }),
  resolveAccount: (accountNumber: string, bankCode: string) =>
    request<any>(`/payments/verify-account?accountNumber=${accountNumber}&bankCode=${bankCode}`, {
      method: 'GET',
    }),

  // Mocked for receipts page currently
  getMyDocuments: async () => {
    return { receipts: [], contracts: [] }
  },

  getProfile: () => async () => {
    return
  },
  updateProfile: (data: Partial<any>) =>
    request<any>('/tenant/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
