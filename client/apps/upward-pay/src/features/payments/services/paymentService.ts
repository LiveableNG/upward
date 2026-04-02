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
