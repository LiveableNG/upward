/* eslint-disable @typescript-eslint/no-explicit-any */
import { request } from './api-client'
import * as authService from '@/features/auth/services/authService'
import * as paymentService from '@/features/payments/services/paymentService'
import * as documentService from '@/features/documents/services/documentService'
import * as notificationService from '@/features/notifications/services/notificationService'
import * as financeService from '@/features/finance/services/financeService'
import * as supportService from '@/features/support/services/supportService'

export const api = {
  // Auth & Profile
  signup: authService.signup,
  login: authService.login,
  logout: authService.logout,
  getProfile: authService.getMe,
  updateProfile: authService.updateProfile,
  getAvatarUploadUrl: authService.getAvatarUploadUrl,
  completeProfile: authService.completeProfile,
  forgotPassword: authService.forgotPassword,
  resetPassword: (email: string, otp: string, newPass: string) =>
    authService.resetPassword({ email, otp, new: newPass }),

  // Payments
  initializePayment: paymentService.initializePayment,
  guestInitializePayment: paymentService.guestInitializePayment,
  verifyPayment: paymentService.verifyPayment,
  getSavedLandlords: paymentService.getSavedLandlords,
  saveLandlord: paymentService.saveLandlord,
  recordTransaction: paymentService.recordTransaction,
  getTransaction: paymentService.getTransaction,
  getPendingPayments: paymentService.getPendingPayments,
  getTransactions: paymentService.getTransactions,
  getReceiptPdf: paymentService.getReceiptPdf,
  getBanks: paymentService.getBanks,
  resolveAccount: paymentService.resolveAccount,
  resolveSubaccount: paymentService.resolveSubaccount,

  // Documents
  getMyDocuments: documentService.getMyDocuments,
  getContracts: documentService.getContracts,
  uploadContract: documentService.uploadContract,
  deleteContract: documentService.removeContract,

  // Notifications & Announcements
  getNotifications: notificationService.getNotifications,
  updateAnnouncementState: notificationService.updateAnnouncementState,
  markNotificationRead: notificationService.markNotificationRead,

  // Wallet & Savings
  getWallet: financeService.getWallet,
  fundWallet: financeService.fundWallet,
  getSavingsGoals: financeService.getSavingsGoals,
  createSavingsGoal: financeService.createSavingsGoal,
  updateSavingsGoal: financeService.updateSavingsGoal,

  // Support Tickets
  createSupportTicket: supportService.createSupportTicket,
  getMyTickets: supportService.getMyTickets,

  // Public (Leaving as raw for now)
  getPublicProfile: (slug: string) =>
    request<any>(`/public/profile/${slug}`, { method: 'GET' }),

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
