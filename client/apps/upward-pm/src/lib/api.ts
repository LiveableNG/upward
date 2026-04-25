/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'
import * as authService from '@/features/auth/services/authService'
import * as pmService from '@/features/pm/services/pmService'

export const api = {
  // Auth & Profile
  signup: authService.signup,
  login: authService.login,
  logout: authService.logout,
  getProfile: authService.getMe,
  requestOTP: authService.requestOTP,
  verifyOTP: authService.verifyOTP,
  updatePmProfile: pmService.updateProfile,
  updatePmBankInfo: pmService.updateBankInfo,
  verifyPmBank: pmService.verifyBank,
  getBanks: pmService.getBanks,
  changePmPassword: pmService.changePassword,
  getPmAvatarUploadUrl: pmService.getAvatarUploadUrl,

  // Generic Helpers
  get: <T = any>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, data: any) =>
    request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  patch: <T = any>(url: string, data: any) =>
    request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
