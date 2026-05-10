/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'
import * as authService from '@/features/auth/services/authService'
import * as pmService from '@/features/pm/services/pmService'
import * as propertyService from '@/features/pm/services/propertyService'
import * as paymentService from '@/features/pm/services/paymentService'

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
  sendLandlordReport: pmService.sendLandlordReport,
  getLandlordReports: pmService.getLandlordReports,
  getLandlordReport: pmService.getLandlordReport,
  sendBulkReminders: pmService.sendBulkReminders,

  // Properties & Units
  getProperties: propertyService.getProperties,
  getProperty: propertyService.getProperty,
  createProperty: propertyService.createProperty,
  updateProperty: propertyService.updateProperty,
  deleteProperty: propertyService.deleteProperty,
  getUnits: propertyService.getUnits,
  getUnit: propertyService.getUnit,
  updateUnit: propertyService.updateUnit,
  deleteUnit: propertyService.deleteUnit,
  getUnitPayments: propertyService.getUnitPayments,
  addUnitPayment: propertyService.addUnitPayment,
  updateUnitPayment: propertyService.updateUnitPayment,
  bulkCreateUnits: propertyService.bulkCreateUnits,
  syncToUpward: propertyService.syncToUpward,
  bulkFullImport: propertyService.bulkFullImport,
  getPropertyImageUploadUrl: propertyService.getPropertyImageUploadUrl,
  
  // Payments
  getPaymentRequests: paymentService.getPaymentRequests,
  getPaymentRequest: paymentService.getPaymentRequest,
  createPaymentRequest: paymentService.createPaymentRequest,
  updatePaymentRequest: paymentService.updatePaymentRequest,
  resendPaymentRequest: paymentService.resendPaymentRequest,
  
  // Team Collaboration
  inviteTeamMember: pmService.inviteTeamMember,
  getTeamMembers: pmService.getTeamMembers,
  updateTeamMemberPermissions: pmService.updateTeamMemberPermissions,
  revokeTeamMember: pmService.revokeTeamMember,
  getCollaboratorActivities: pmService.getCollaboratorActivities,

  // Generic Helpers
  get: <T = any>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  patch: <T = any>(url: string, data?: any) =>
    request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
}
