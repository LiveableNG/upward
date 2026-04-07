import { request } from '@/lib/api-client'
import {
  type PaymentInitResponse,
  type PaymentRequestData,
  type PaymentVerifyResponse,
} from '../types'

export async function fetchPaymentRequest(token: string) {
  return request<PaymentRequestData>(`/public/payment-request/${token}`)
}

export async function initializePayment(data: {
  paymentToken: string
  email: string
  amount?: number
}) {
  return request<PaymentInitResponse>('/pay/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function guestInitializePayment(data: { paymentToken: string; email: string }) {
  return request<PaymentInitResponse>('/public/pay/guest-initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function verifyPayment(reference: string) {
  return request<PaymentVerifyResponse>(`/pay/verify/${reference}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function togglePaymentStatus(token: string, status: string) {
  return request<{ success: boolean; status: string }>(`/public/test/toggle-payment/${token}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export async function toggleGuestPaymentStatus(token: string, status: string) {
  return request<{ success: boolean; status: string }>(`/public/test/toggle-payment/${token}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}
export async function getSavedLandlords() {
  return request<any[]>('/payments/landlords', { method: 'GET' })
}

export async function saveLandlord(data: any) {
  return request<any>('/payments/landlords', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function recordTransaction(data: any) {
  return request<any>('/payments/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTransaction(id: string) {
  return request<any>(`/payments/transactions/${id}`, { method: 'GET' })
}

export async function getTransactions() {
  return request<any[]>('/payments/transactions', { method: 'GET' })
}

export async function getReceiptPdf(data: any) {
  return request<{ url: string }>('/payments/transactions/receipt', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getBanks() {
  return request<any[]>('/payments/banks', { method: 'GET' })
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  return request<any>(`/payments/verify-account?accountNumber=${accountNumber}&bankCode=${bankCode}`, {
    method: 'GET',
  })
}
