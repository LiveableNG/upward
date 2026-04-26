/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'
import * as authService from '@/features/auth/services/authService'
import * as pmService from '@/features/pm/services/pmService'
import * as propertyService from '@/features/pm/services/propertyService'

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

  // Properties & Units
  getProperties: propertyService.getProperties,
  createProperty: propertyService.createProperty,
  updateProperty: propertyService.updateProperty,
  getUnits: propertyService.getUnits,
  getUnit: propertyService.getUnit,
  updateUnit: propertyService.updateUnit,
  deleteUnit: propertyService.deleteUnit,
  getUnitPayments: propertyService.getUnitPayments,
  addUnitPayment: propertyService.addUnitPayment,
  bulkCreateUnits: propertyService.bulkCreateUnits,

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
