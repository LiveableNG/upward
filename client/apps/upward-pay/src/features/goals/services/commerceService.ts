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
  const res = await request<{ data: any }>(
    `/user/commerce/orders${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  const rawList: any[] = res.data?.orders || res.data?.items || []
  const total: number = res.data?.total ?? rawList.length

  const orders: TenantOrderSummaryDto[] = rawList.map((ord: any) => {
    const subOrders = ord.subOrders || []
    const itemsPreview = ord.itemsPreview || []
    const itemsCount = ord.itemsCount ?? (itemsPreview.length || 1)
    const primaryStatus =
      ord.primaryStatus ||
      (subOrders[0]?.customerStatus ?? (ord.status === 'COMPLETED' ? 'DELIVERED' : 'ORDER_CONFIRMED'))

    return {
      ...ord,
      itemsPreview,
      itemsCount,
      primaryStatus,
      subOrdersCount: ord.subOrdersCount ?? ord.subOrderCount ?? subOrders.length,
    }
  })

  return { orders, total }
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

export interface PreviewCommerceOrderInput {
  items: Array<{ offeringUuid?: string; offeringId?: number; quantity: number }>
  deliveryAddress?: string
  discountKobo?: string
}

export interface PreviewCommerceOrderResult {
  currency: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  taxKobo: string
  discountKobo: string
  totalAmountKobo: string
  deliveryEligible?: boolean
  deliveryMessage?: string
  subOrders: Array<{
    vendorId: number
    vendorName: string
    subtotalKobo: string
    deliveryFeeKobo: string
    items: Array<{
      title: string
      quantity: number
      unitPriceKobo: string
      totalPriceKobo: string
    }>
  }>
}

export async function previewCommerceOrder(
  data: PreviewCommerceOrderInput,
): Promise<PreviewCommerceOrderResult> {
  const res = await request<{ data: PreviewCommerceOrderResult }>(
    `/user/commerce/orders/preview`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export interface CreateCommerceOrderInput {
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryNotes?: string
  items: Array<{ offeringUuid?: string; offeringId?: number; quantity: number }>
  discountKobo?: string
}

export interface CreateCommerceOrderResult {
  message: string
  order: TenantOrderDetailDto
  paymentRequired: boolean
}

export async function createCommerceOrder(
  data: CreateCommerceOrderInput,
): Promise<CreateCommerceOrderResult> {
  const res = await request<{ data: CreateCommerceOrderResult }>(
    `/user/commerce/orders`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
  return res.data
}

export interface InitializeCommercePaymentResult {
  authorizationUrl: string
  accessCode?: string
  reference: string
  orderNumber: string
  amountKobo: string
  currency: string
}

export async function initializeCommercePayment(
  orderUuid: string,
): Promise<InitializeCommercePaymentResult> {
  const res = await request<{ data: InitializeCommercePaymentResult }>(
    `/user/commerce/orders/${orderUuid}/pay`,
    {
      method: 'POST',
    },
  )
  return res.data
}
