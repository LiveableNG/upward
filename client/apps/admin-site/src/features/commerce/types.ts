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

export type AdminOperationalStatus =
  | 'AWAITING_VENDOR_CONFIRMATION'
  | 'VENDOR_CONFIRMED'
  | 'VENDOR_DECLINED'
  | 'CARRIER_DISPATCHED'
  | 'TECHNICIAN_ASSIGNED'
  | 'DELIVERED_PENDING_INSPECTION'
  | 'FULFILMENT_CLOSED'
  | 'DISPUTE_LOGGED'
  | 'CANCELLED_REFUNDED'

export type AdminFulfilmentTransitionAction =
  | 'CONFIRM_BY_VENDOR'
  | 'VENDOR_CONFIRM'
  | 'VENDOR_DECLINE'
  | 'DISPATCH'
  | 'DISPATCH_CARRIER'
  | 'SCHEDULE_SERVICE'
  | 'SERVICE_SCHEDULE'
  | 'ASSIGN_TECHNICIAN'
  | 'TECHNICIAN_ASSIGN'
  | 'TECHNICIAN_EN_ROUTE'
  | 'COMPLETE_SERVICE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVER'
  | 'ADMIN_CONFIRM_RECEIPT'
  | 'CANCEL_REFUND'

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED_REFUND'
  | 'RESOLVED_PAYOUT'
  | 'SETTLED_COMPROMISE'
  | 'CLOSED'

export interface AdminCommerceItem {
  id?: number
  uuid: string
  subOrderId: number
  offeringId?: number | null
  offeringType: string
  quantity: number
  unitPriceKobo: string
  totalPriceKobo: string
  snapshotData?: Record<string, any>
}

export interface AdminCommerceFulfilmentEvent {
  uuid: string
  status: CustomerFulfilmentStatus
  title: string
  description: string
  carrierName?: string | null
  trackingNumber?: string | null
  serviceDateTime?: string | null
  actorType: string
  createdAt: string
}

export interface AdminCommerceSubOrder {
  id?: number
  uuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  operationalStatus: AdminOperationalStatus
  subtotalKobo: string
  deliveryFeeKobo: string
  platformFeeKobo: string
  vendorPayoutKobo: string
  carrierName?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  serviceScheduledAt?: string | null
  serviceWindowNotes?: string | null
  technicianName?: string | null
  technicianPhone?: string | null
  adminOperationalNotes?: string | null
  vendor?: {
    id: number
    name: string
    slug: string
    email?: string
    phone?: string
  }
  items: AdminCommerceItem[]
  fulfilmentEvents?: AdminCommerceFulfilmentEvent[]
}

export interface AdminCommerceOrder {
  id: number
  uuid: string
  orderNumber: string
  status: string
  paymentStatus: string
  currency: string
  totalAmountKobo: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  discountKobo: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryInstructions?: string | null
  paymentReference?: string | null
  paidAt?: string | null
  createdAt: string
  user?: {
    id: number
    uuid: string
    email: string
    firstName?: string
    lastName?: string
    phone?: string
  }
  subOrders: AdminCommerceSubOrder[]
}

export interface AdminCommerceDispute {
  id: number
  uuid: string
  subOrderId: number
  userId: number
  status: DisputeStatus
  reason: string
  explanation: string
  evidenceUrls?: string[]
  resolutionNotes?: string | null
  resolvedAt?: string | null
  resolvedBy?: string | null
  createdAt: string
  subOrder?: {
    id: number
    uuid: string
    subOrderNumber: string
    customerStatus: string
    operationalStatus: string
    subtotalKobo: string
    deliveryFeeKobo: string
    order?: {
      id: number
      uuid: string
      orderNumber: string
      recipientName: string
      recipientPhone: string
      deliveryAddress: string
    }
    vendor?: {
      id: number
      name: string
    }
  }
}

export interface AdminDeliveryZone {
  id: number
  uuid: string
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering: boolean
  deliveryFeeKobo: string
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

