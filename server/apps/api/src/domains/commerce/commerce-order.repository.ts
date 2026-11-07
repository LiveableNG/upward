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

export interface CommerceOrderItem {
  id?: number
  uuid: string
  subOrderId: number
  offeringId?: number | null
  offeringType: string
  quantity: number
  unitPriceKobo: bigint
  totalPriceKobo: bigint
  snapshotData: Record<string, any>
  createdAt?: Date
  offering?: any
}

export interface CommerceFulfilmentEvent {
  id?: number
  uuid: string
  subOrderId: number
  status: CustomerFulfilmentStatus
  title: string
  description: string
  isCustomerVisible: boolean
  carrierName?: string | null
  trackingNumber?: string | null
  serviceDateTime?: Date | null
  actorType: string
  actorId?: string | null
  createdAt?: Date
}

export interface CommerceVendorSuborder {
  id?: number
  uuid: string
  orderId: number
  vendorId: number
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  operationalStatus: AdminOperationalStatus
  subtotalKobo: bigint
  deliveryFeeKobo: bigint
  allocatedDiscountKobo: bigint
  platformFeeKobo: bigint
  vendorPayoutKobo: bigint
  carrierName?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  serviceScheduledAt?: Date | null
  serviceWindowNotes?: string | null
  technicianName?: string | null
  technicianPhone?: string | null
  adminOperationalNotes?: string | null
  deliveredAt?: Date | null
  tenantConfirmedAt?: Date | null
  coolingPeriodEndsAt?: Date | null
  items?: CommerceOrderItem[]
  fulfilmentEvents?: CommerceFulfilmentEvent[]
  vendor?: any
  order?: CommerceOrder
  payableRecord?: any
  createdAt?: Date
  updatedAt?: Date
}

export interface CommercePaymentAttempt {
  id?: number
  uuid: string
  orderId: number
  reference: string
  amountKobo: bigint
  currency?: string
  channel?: string | null
  status: string
  gatewayResponse?: string | null
  ipAddress?: string | null
  createdAt?: Date
  updatedAt?: Date
  order?: CommerceOrder
}

export interface CommerceOrderAudit {
  id?: number
  uuid: string
  orderId: number
  event: string
  fromState?: string | null
  toState: string
  actorType: string
  actorId?: string | null
  details?: Record<string, any> | null
  createdAt?: Date
}

export interface CommerceOrder {
  id?: number
  uuid: string
  orderNumber: string
  userId: number
  status: CommerceOrderStatus
  paymentStatus: CommercePaymentStatus
  currency: string
  itemsSubtotalKobo: bigint
  deliveryFeeKobo: bigint
  taxKobo: bigint
  discountKobo: bigint
  totalAmountKobo: bigint
  idempotencyKey?: string | null
  paymentReference?: string | null
  paidAt?: Date | null
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryNotes?: string | null
  deliveryZoneTag?: string | null
  subOrders?: CommerceVendorSuborder[]
  paymentAttempts?: CommercePaymentAttempt[]
  auditLogs?: CommerceOrderAudit[]
  user?: any
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateOrderData {
  userId: number
  orderNumber: string
  currency: string
  itemsSubtotalKobo: bigint
  deliveryFeeKobo: bigint
  taxKobo: bigint
  discountKobo: bigint
  totalAmountKobo: bigint
  idempotencyKey?: string
  paymentReference?: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryNotes?: string
  deliveryZoneTag?: string
  subOrders: Array<{
    vendorId: number
    subOrderNumber: string
    subtotalKobo: bigint
    deliveryFeeKobo: bigint
    allocatedDiscountKobo: bigint
    platformFeeKobo: bigint
    vendorPayoutKobo: bigint
    items: Array<{
      offeringId?: number
      offeringType: string
      quantity: number
      unitPriceKobo: bigint
      totalPriceKobo: bigint
      snapshotData: Record<string, any>
    }>
  }>
}

export interface CommerceOrderRepository {
  createOrder(data: CreateOrderData): Promise<CommerceOrder>
  findOrderById(id: number): Promise<CommerceOrder | null>
  findOrderByUuid(uuid: string): Promise<CommerceOrder | null>
  findOrderByNumber(orderNumber: string): Promise<CommerceOrder | null>
  findOrderByPaymentReference(paymentReference: string): Promise<CommerceOrder | null>
  findOrderByIdempotencyKey(idempotencyKey: string): Promise<CommerceOrder | null>
  findOrdersByUserId(
    userId: number,
    options?: { skip?: number; take?: number; status?: CommerceOrderStatus },
  ): Promise<{ items: CommerceOrder[]; total: number }>
  findAdminOrders(filter?: {
    status?: CommerceOrderStatus
    paymentStatus?: CommercePaymentStatus
    vendorId?: number
    search?: string
    startDate?: Date
    endDate?: Date
    skip?: number
    take?: number
  }): Promise<{ items: CommerceOrder[]; total: number }>
  updateOrderStatus(
    orderId: number,
    status: CommerceOrderStatus,
    paymentStatus?: CommercePaymentStatus,
    paidAt?: Date,
  ): Promise<CommerceOrder>
  findSubOrderByUuid(uuid: string): Promise<CommerceVendorSuborder | null>
  findSubOrderById(id: number): Promise<CommerceVendorSuborder | null>
  findSubOrdersByVendorId(
    vendorId: number,
    options?: { customerStatus?: CustomerFulfilmentStatus; operationalStatus?: AdminOperationalStatus; skip?: number; take?: number },
  ): Promise<{ items: CommerceVendorSuborder[]; total: number }>
  updateSubOrderStatus(
    subOrderId: number,
    customerStatus?: CustomerFulfilmentStatus,
    operationalStatus?: AdminOperationalStatus,
    dispatchData?: {
      carrierName?: string
      trackingNumber?: string
      trackingUrl?: string
      serviceScheduledAt?: Date
      serviceWindowNotes?: string
      technicianName?: string
      technicianPhone?: string
      adminOperationalNotes?: string
      deliveredAt?: Date
      tenantConfirmedAt?: Date
      coolingPeriodEndsAt?: Date
    },
  ): Promise<CommerceVendorSuborder>
  addFulfilmentEvent(
    subOrderId: number,
    event: Omit<CommerceFulfilmentEvent, 'id' | 'uuid' | 'createdAt' | 'subOrderId'>,
  ): Promise<CommerceFulfilmentEvent>
  executeSubOrderFulfilmentTransition(params: {
    subOrderId: number
    orderId: number
    customerStatus?: CustomerFulfilmentStatus
    operationalStatus?: AdminOperationalStatus
    dispatchData?: {
      carrierName?: string
      trackingNumber?: string
      trackingUrl?: string
      serviceScheduledAt?: Date
      serviceWindowNotes?: string
      technicianName?: string
      technicianPhone?: string
      adminOperationalNotes?: string
      deliveredAt?: Date
      tenantConfirmedAt?: Date
      coolingPeriodEndsAt?: Date
    }
    event: {
      status: CustomerFulfilmentStatus
      title: string
      description: string
      isCustomerVisible: boolean
      carrierName?: string | null
      trackingNumber?: string | null
      serviceDateTime?: Date | null
      actorType: string
      actorId?: string | null
    }
    payableStatusUpdate?: {
      status: string
      eligibleAt?: Date
    }
    checkAllSubOrdersCompleted?: boolean
    auditLog?: {
      event: string
      fromState?: string
      toState: string
      actorType: string
      actorId?: string
      details?: Record<string, any>
    }
  }): Promise<CommerceVendorSuborder>
  recordPaymentAttempt(
    orderId: number,
    attempt: { reference: string; amountKobo: bigint; currency?: string; channel?: string; status?: string; ipAddress?: string; gatewayResponse?: string },
  ): Promise<CommercePaymentAttempt>
  findPaymentAttemptByReference(reference: string): Promise<CommercePaymentAttempt | null>
  updatePaymentAttemptStatus(reference: string, status: string, gatewayResponse?: string): Promise<CommercePaymentAttempt>
  findActivePaymentAttempt(orderId: number): Promise<CommercePaymentAttempt | null>
  confirmOrderPayment(params: {
    orderId: number
    paymentReference: string
    channel?: string
    paidAt: Date
  }): Promise<CommerceOrder>
  recordAuditLog(
    orderId: number,
    audit: { event: string; fromState?: string; toState: string; actorType: string; actorId?: string; details?: Record<string, any> },
  ): Promise<CommerceOrderAudit>
  releaseInventory(orderId: number, reason?: string): Promise<void>
}

export const COMMERCE_ORDER_REPOSITORY = Symbol('COMMERCE_ORDER_REPOSITORY')
