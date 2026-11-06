import { request } from '@/lib/api-client'

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

export type TransactionDetail = {
  uuid: string
  amount: number
  currency: string
  status?: string
  channel?: string
  reference?: string
  narration?: string
  type?: string
  transactionType?: string
  createdAt?: string
  propertyAddress?: string
  isManual?: boolean
  lineItems?: Array<{ label?: string; name?: string; amount?: number; totalAmount?: number }>
  paymentRequest?: {
    propertyLocation?: string
    lineItemRecords?: Array<{ name?: string; totalAmount?: number }>
  }
}

export async function fetchTransactionDetail(uuid: string): Promise<TransactionDetail> {
  const res = await request<unknown>(`/payments/transactions/${uuid}`, { method: 'GET' })
  const row = unwrap<Record<string, unknown>>(res)
  return {
    uuid: String(row.uuid ?? uuid),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'NGN'),
    status: row.status != null ? String(row.status) : undefined,
    channel: row.channel != null ? String(row.channel) : 'Paystack',
    reference: row.reference != null ? String(row.reference) : undefined,
    narration: row.narration != null ? String(row.narration) : undefined,
    type: row.type != null ? String(row.type) : undefined,
    transactionType: row.transactionType != null ? String(row.transactionType) : undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
    propertyAddress: row.propertyAddress != null ? String(row.propertyAddress) : undefined,
    isManual: Boolean(row.isManual),
    lineItems: (row.lineItems as TransactionDetail['lineItems']) ?? undefined,
    paymentRequest: row.paymentRequest as TransactionDetail['paymentRequest'],
  }
}

export type ReceiptPdfPayload = {
  title: string
  receiptNumber: string
  paidAt: string
  tenantName?: string
  landlordName?: string
  paymentType?: string
  propertyAddress?: string
  amount: number
  currency: string
  reference?: string
  channel?: string
  type: 'RENT' | 'SAVINGS'
  status?: string
  lineItems?: Array<{ label: string; amount: number; category?: string }>
}

export async function fetchReceiptPdfUrl(payload: ReceiptPdfPayload): Promise<string | null> {
  const res = await request<unknown>('/payments/transactions/receipt', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = unwrap<{ url?: string }>(res)
  return body.url ?? null
}
