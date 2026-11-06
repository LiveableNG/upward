import { request, requestBlob } from '@/lib/api-client'
import type {
  TenantOrderDetailDto,
  TenantOrderSummaryDto,
} from '../types/commerce.types'

export async function fetchTenantOrders(
  filter: { status?: string; skip?: number; take?: number } = {},
): Promise<{ orders: TenantOrderSummaryDto[]; total: number }> {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.skip !== undefined) params.set('skip', String(filter.skip))
  if (filter.take !== undefined) params.set('take', String(filter.take))

  const qs = params.toString()
  const res = await request<{ data: { orders: TenantOrderSummaryDto[]; total: number } }>(
    `/user/commerce/orders${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return res.data || { orders: [], total: 0 }
}

export async function fetchTenantOrderDetail(
  orderUuid: string,
): Promise<TenantOrderDetailDto> {
  const res = await request<{ data: TenantOrderDetailDto }>(
    `/user/commerce/orders/${orderUuid}`,
    { method: 'GET' },
  )
  return res.data
}

export async function downloadCommerceReceiptPdf(
  orderUuid: string,
  receiptFileName = 'Upward-Receipt.pdf',
): Promise<void> {
  const blob = await requestBlob(`/user/commerce/orders/${orderUuid}/receipt`, {
    method: 'GET',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = receiptFileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export async function createCommerceDispute(data: {
  subOrderUuid: string
  reason: string
  explanation: string
  evidenceUrls?: string[]
}): Promise<{ message: string; dispute: any }> {
  const res = await request<{ data: { message: string; dispute: any } }>(
    `/user/commerce/orders/disputes`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function createCommerceInquiry(data: {
  offeringUuid: string
  category: string
  message: string
}): Promise<{ message: string; inquiry: any }> {
  const res = await request<{ data: { message: string; inquiry: any } }>(
    `/user/commerce/orders/inquiries`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export async function confirmSubOrderReceipt(
  subOrderUuid: string,
): Promise<{ message: string; subOrder: any }> {
  const res = await request<{ data: { message: string; subOrder: any } }>(
    `/user/commerce/sub-orders/${subOrderUuid}/confirm-receipt`,
    {
      method: 'POST',
    },
  )
  return res.data
}
