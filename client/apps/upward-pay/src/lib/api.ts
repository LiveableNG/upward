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
  getTransaction: (id: string) =>
    request<any>(`/payments/transactions/${id}`, {
      method: 'GET',
    }),
  getTransactions: () =>
    request<any[]>('/payments/transactions', {
      method: 'GET',
    }),
  getReceiptPdf: (id: string) =>
    request<{ url: string }>(`/payments/transactions/${id}/receipt`, {
      method: 'GET',
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

  getProfile: () =>
    request<any>('/tenant/auth/me', {
      method: 'GET',
    }),
  updateProfile: (data: Partial<any>) =>
    request<any>('/tenant/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Notifications & Announcements
  getNotifications: () =>
    request<any>('/tenant/notifications', {
      method: 'GET',
    }).then((res) => res.data),
  updateAnnouncementState: (data: {
    announcementId: string
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }) =>
    request<any>('/tenant/notifications/announcements/state', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((res) => res.data),
  markNotificationRead: (id: string) =>
    request<any>(`/tenant/notifications/${id}/read`, {
      method: 'PATCH',
    }).then((res) => res.data),
}
