import { request } from '@/lib/api-client'
import { type PaymentInitResult, type PaymentRequestPayload } from '@/features/payments/types'

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

export async function fetchPaymentRequest(uuid: string): Promise<PaymentRequestPayload> {
  const res = await request<unknown>(`/payment-request/${uuid}`, { method: 'GET' })
  const body = res as Record<string, unknown>
  if (body.payment && typeof body.payment === 'object') {
    return body as unknown as PaymentRequestPayload
  }
  if (body.data && typeof body.data === 'object') {
    return body.data as PaymentRequestPayload
  }
  throw new Error('Could not load payment details')
}

export async function initializePayment(data: {
  amount: number
  paymentRequestUuid?: string
  metadata?: Record<string, unknown>
}) {
  const res = await request<unknown>('/payments/initialize', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return unwrap<PaymentInitResult>(res)
}

export async function verifyPayment(reference: string) {
  const res = await request<unknown>(`/payments/verify/${reference}`, { method: 'GET' })
  return unwrap<{
    isVerified?: boolean
    status?: string
    settlementStatus?: string
  }>(res)
}

export async function confirmPaymentRequest(
  uuid: string,
  body: {
    reference: string
    lineItemPayments: Array<{ id: number; amountPaid: number; name: string }>
  },
) {
  return request<{ success: boolean; settlementStatus?: string }>(
    `/payment-request/${uuid}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export async function switchDedicatedAccount(data: {
  paymentRequestUuid?: string
  userPropertyId?: number
  preferredBank?: string
}) {
  const res = await request<unknown>('/payments/switch-dva', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return unwrap<{
    accountNumber: string
    accountName: string
    bankName: string
  }>(res)
}

export async function createManualPaymentRequest(data: {
  amount: number
  propertyUuid?: string
  metadata?: Record<string, unknown>
}) {
  return request<{ uuid: string }>('/payments/manual-request', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export type BankOption = { code: string; name: string }

export type TenantBankDetails = {
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
}

export async function getBanks(): Promise<BankOption[]> {
  const res = await request<unknown>('/payments/banks', { method: 'GET' })
  const list = Array.isArray(res) ? res : []
  return list
    .map((row) => {
      const r = row as Record<string, unknown>
      const code = String(r.code ?? r.bankCode ?? '')
      const name = String(r.name ?? r.bankName ?? '')
      if (!code || !name) return null
      return { code, name }
    })
    .filter((b): b is BankOption => b != null)
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  const q = new URLSearchParams({ accountNumber, bankCode })
  return request<{ accountName?: string; account_name?: string }>(
    `/payments/verify-account?${q.toString()}`,
    { method: 'GET' },
  )
}

export async function getBankDetails(): Promise<TenantBankDetails | null> {
  try {
    const res = await request<TenantBankDetails>('/payments/bank-details', { method: 'GET' })
    if (!res?.accountNumber) return null
    return res
  } catch {
    return null
  }
}

export async function saveBankDetails(data: TenantBankDetails) {
  return request('/payments/bank-details', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export type RentDepositSummary = {
  availableBalance?: number
  propertyBalance?: number
  currency?: string
  property?: {
    address?: string
    dva?: { accountNumber?: string; bankName?: string; accountName?: string }
  }
  history?: Array<{
    uuid: string
    amount: number
    type?: string
    reference?: string
    createdAt: string
  }>
}

export async function getRentDepositSummary(propertyUuid?: string) {
  const path = propertyUuid
    ? `/payments/rent-deposit?propertyUuid=${encodeURIComponent(propertyUuid)}`
    : '/payments/rent-deposit'
  return request<RentDepositSummary>(path, { method: 'GET' })
}

export async function getRentDepositReceiptUrl(transactionUuid: string) {
  return request<{ url?: string; fileName?: string }>(
    `/payments/rent-deposit/receipt/${encodeURIComponent(transactionUuid)}`,
    { method: 'GET' },
  )
}

export async function applyRentDeposit(data: {
  paymentRequestUuid: string
  amountToApply: number
  lineItemAllocations?: Array<{ lineItemId: number; amount: number }>
}) {
  return request<{ transactionUuid?: string; data?: { transactionUuid?: string } }>(
    '/payments/rent-deposit/apply',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export async function uploadManualProofOfPayment(data: {
  paymentRequestUuid?: string
  userPropertyUuid?: string
  amount?: number
  currency?: string
  senderName: string
  paymentDate: string
  referenceNumber?: string
}) {
  return request('/payments/manual/proof/manual', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function uploadProofOfPaymentFile(data: {
  paymentRequestUuid: string
  amount?: number
  file: { uri: string; name: string; mimeType: string }
}) {
  const formData = new FormData()
  formData.append('paymentRequestId', data.paymentRequestUuid)
  if (data.amount != null) formData.append('amount', String(data.amount))
  formData.append('fileName', data.file.name)
  formData.append('file', {
    uri: data.file.uri,
    name: data.file.name,
    type: data.file.mimeType,
  } as unknown as Blob)

  return request('/payments/manual/proof', {
    method: 'POST',
    body: formData,
  })
}
