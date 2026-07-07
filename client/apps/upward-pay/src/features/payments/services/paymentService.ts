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
  amount: number
  paymentRequestUuid?: string
  metadata?: any
}) {
  const res = await request<any>('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data || res
}

export async function guestInitializePayment(data: { paymentToken: string; email: string }) {
  return request<PaymentInitResponse>('/public/pay/guest-initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function verifyPayment(reference: string) {
  const res = await request<any>(`/payments/verify/${reference}`, {
    method: 'GET',
  })
  return res.data || res
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
  const res = await request<any[]>('/payments/landlords', { method: 'GET' })
  return (res as any).data || res
}

export async function saveLandlord(data: any) {
  const res = await request<any>('/payments/landlords', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data || res
}

export async function recordTransaction(data: any) {
  const res = await request<any>('/payments/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return res.data || res
}

export async function getTransaction(id: string) {
  const res = await request<any>(`/payments/transactions/${id}`, { method: 'GET' })
  return res.data || res
}

export async function getTransactions() {
  const res = await request<any[]>('/payments/transactions', { method: 'GET' })
  return (res as any).data || res
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
export async function getPendingPayments() {
  const res = await request<any[]>('/payments/transactions/pending', { method: 'GET' })
  return (res as any).data || res
}
export async function resolveSubaccount(accountNumber: string, bankCode: string, businessName?: string) {
  let url = `/payments/resolve-subaccount?accountNumber=${accountNumber}&bankCode=${bankCode}`
  if (businessName) url += `&businessName=${encodeURIComponent(businessName)}`
  const res = await request<any>(url, { method: 'GET' })
  return res.data || res
}

export async function getPropertyBalance(propertyUuid: string) {
  const res = await request<any>(`/payments/property-balance/${propertyUuid}`, { method: 'GET' })
  return res.data || res
}

export async function getBankDetails() {
  return request<any>('/payments/bank-details', { method: 'GET' })
}

export async function saveBankDetails(data: any) {
  return request<any>('/payments/bank-details', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function createManualPaymentRequest(data: {
  amount: number
  landlordUuid?: string
  landlordDetails?: {
    accountNumber: string
    bankCode: string
    name: string
  }
  propertyUuid?: string
  metadata?: any
}) {
  return request<{ uuid: string }>('/payments/manual-request', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function addManualAccount(data: { accountNumber: string, accountName: string, bankName: string, bankCode?: string, propertyId?: number }) {
  return request<any>('/payments/manual/account', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getProofUploadUrl(fileName: string, fileType: string, fileSize: number) {
  return request<{ uuid: string, uploadUrl: string, fileUrl: string }>(`/payments/manual/proof/upload-url?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}&fileSize=${fileSize}`, {
    method: 'GET'
  })
}

export async function uploadFileToS3(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  })

  if (!response.ok) {
    throw new Error('Failed to upload file to S3')
  }
}

export async function uploadProofOfPayment(data: { paymentRequestId?: number, userPropertyId?: number, amount?: number, currency?: string, fileUrl: string, fileName: string }) {
  return request<any>('/payments/manual/proof', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteProofOfPayment(proofId: number) {
  return request<any>(`/payments/manual/proof/${proofId}`, {
    method: 'DELETE',
  })
}

export async function reviewProofOfPayment(proofId: number, data: { status: 'APPROVED' | 'REJECTED', remarks?: string }) {
  return request<any>(`/payments/manual/proof/${proofId}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
