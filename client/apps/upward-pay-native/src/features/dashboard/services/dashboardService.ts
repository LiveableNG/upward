import { request } from '@/lib/api-client'
import { type CompletedPayment, type PendingPayment } from '@/features/dashboard/types'
import { inferTransactionCategory } from '@/features/dashboard/utils/transactions'

function mapPending(p: Record<string, unknown>): PendingPayment {
  const lineItems = (p.lineItemRecords as Array<Record<string, unknown>>) || []
  const lineItemsSum = lineItems.reduce((sum, item) => {
    const name = String(item.name ?? '')
    const id = Number(item.id)
    const isFee =
      name === 'Processing Fee' ||
      id === -2 ||
      name === 'Transaction Fee' ||
      id === -3 ||
      name === 'Upward Benefits'
    if (isFee) return sum
    return sum + Number(item.totalAmount ?? item.amount ?? 0)
  }, 0)

  const fullTotal = lineItemsSum > 0 ? lineItemsSum : Number(p.total_amount ?? p.amount ?? 0)

  return {
    uuid: String(p.uuid),
    amount: fullTotal,
    currency: String(p.currency ?? 'NGN'),
    total_amount: fullTotal,
    amountPaid: Number(p.amountPaid ?? 0),
    company_name: String(p.company_name ?? p.manager_name ?? 'Unmanaged Property'),
    property_address: p.property_address ? String(p.property_address) : null,
    userPropertyUuid: p.userPropertyUuid ? String(p.userPropertyUuid) : null,
    due_date: p.due_date ? String(p.due_date) : undefined,
    dueDate: p.dueDate ? String(p.dueDate) : undefined,
    latestProof: (p.latestProof as PendingPayment['latestProof']) ?? null,
    lineItemRecords: (p.lineItemRecords as PendingPayment['lineItemRecords']) ?? [],
    status: p.status ? String(p.status) : undefined,
    description: p.description ? String(p.description) : undefined,
  }
}

export async function fetchPendingPayments(): Promise<PendingPayment[]> {
  const res = await request<unknown>('/payments/transactions/pending', { method: 'GET' })
  const list = Array.isArray(res) ? res : []
  return list.map((item) => mapPending(item as Record<string, unknown>))
}

export async function fetchTransactions(): Promise<CompletedPayment[]> {
  const res = await request<unknown>('/payments/transactions', { method: 'GET' })
  const raw =
    res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res
  const list = Array.isArray(raw) ? raw : []
  return list.map((t) => {
    const row = t as Record<string, unknown>
    const apiType = row.type != null ? String(row.type) : undefined
    const company_name = String(row.narration ?? (apiType === 'RENT' ? 'Rent Payment' : 'Transfer'))
    const property_address = row.propertyAddress ? String(row.propertyAddress) : undefined
    const base = {
      uuid: String(row.uuid),
      amount: Number(row.amount ?? 0),
      currency: String(row.currency ?? 'NGN'),
      paid_at: String(row.createdAt ?? row.paid_at ?? ''),
      company_name,
      type: 'debit' as const,
      channel: row.channel != null ? String(row.channel) : 'Paystack',
      status: row.status != null ? String(row.status) : undefined,
      paystack_reference: row.reference != null ? String(row.reference) : undefined,
      property_address,
      transactionType: row.transactionType as CompletedPayment['transactionType'],
      isManual: Boolean(row.isManual),
      apiType,
    }
    return {
      ...base,
      category: inferTransactionCategory(base),
    }
  })
}

export async function fetchBenefitsStatus() {
  return request<{ isActive: boolean; endsAt: string | null }>('/payments/benefits/status', {
    method: 'GET',
  })
}
