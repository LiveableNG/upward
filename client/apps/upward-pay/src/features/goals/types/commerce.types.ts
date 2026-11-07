export type CustomerFulfilmentStatus =
  | 'ORDER_CONFIRMED'
  | 'PROCESSING'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'SERVICE_SCHEDULED'
  | 'TECHNICIAN_EN_ROUTE'
  | 'SERVICE_COMPLETED'
  | 'RECEIVED_CONFIRMED'
  | 'DISPUTED'
  | 'CANCELLED'

export type CommerceOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'

export type CommercePaymentStatus =
  | 'UNPAID'
  | 'INITIATED'
  | 'PAID'
  | 'FAILED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'REVERSED'

export interface CommerceOrderItemDto {
  uuid: string
  offeringId?: number | null
  offeringType: 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'BUNDLE'
  quantity: number
  unitPriceKobo: string
  totalPriceKobo: string
  title: string
  thumbnailUrl?: string | null
  snapshotData?: Record<string, any>
}

export interface CommerceFulfilmentEventDto {
  uuid: string
  status: CustomerFulfilmentStatus
  title: string
  description: string
  carrierName?: string | null
  trackingNumber?: string | null
  serviceDateTime?: string | null
  createdAt: string
}

export interface TenantSubOrderDetailDto {
  uuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  vendorName: string
  vendorSlug: string
  vendor?: {
    id: number
    uuid: string
    name: string
    slug: string
    logoUrl?: string | null
    rating: number
  }
  subtotalKobo: string
  deliveryFeeKobo: string
  carrierName?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  serviceScheduledAt?: string | null
  serviceWindowNotes?: string | null
  technicianName?: string | null
  technicianPhone?: string | null
  deliveredAt?: string | null
  tenantConfirmedAt?: string | null
  adminOperationalNotes?: string | null
  items: CommerceOrderItemDto[]
  fulfilmentEvents: CommerceFulfilmentEventDto[]
}

export interface TenantOrderDetailDto {
  uuid: string
  orderNumber: string
  status: CommerceOrderStatus
  paymentStatus: CommercePaymentStatus
  currency: string
  totalAmountKobo: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  discountKobo: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryInstructions?: string | null
  deliveryNotes?: string | null
  paidAt?: string | null
  createdAt: string
  subOrders: TenantSubOrderDetailDto[]
}

export interface TenantOrderSummaryDto {
  uuid: string
  orderNumber: string
  status: CommerceOrderStatus
  paymentStatus: CommercePaymentStatus
  currency: string
  totalAmountKobo: string
  deliveryAddress: string
  itemsCount: number
  itemsPreview: Array<{
    title: string
    thumbnailUrl?: string | null
    offeringType: string
    quantity: number
  }>
  subOrdersCount: number
  primaryStatus: CustomerFulfilmentStatus
  createdAt: string
  paidAt?: string | null
}
