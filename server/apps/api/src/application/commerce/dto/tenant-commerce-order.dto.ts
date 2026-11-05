import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  CommerceOrderStatus,
  CommercePaymentStatus,
  CustomerFulfilmentStatus,
} from '../../../domains/commerce/commerce-order.repository'

export class GetTenantOrdersFilterDto {
  @IsEnum([
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
  ])
  @IsOptional()
  status?: CommerceOrderStatus

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  take?: number
}

export interface TenantFulfilmentEventDto {
  uuid: string
  status: CustomerFulfilmentStatus
  title: string
  description: string
  carrierName?: string | null
  trackingNumber?: string | null
  serviceDateTime?: Date | null
  createdAt: Date
}

export interface TenantOrderItemDto {
  uuid: string
  offeringId?: number | null
  offeringType: string
  quantity: number
  unitPriceKobo: string
  totalPriceKobo: string
  snapshotData: Record<string, any>
}

export interface TenantVendorSubOrderDto {
  uuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  subtotalKobo: string
  deliveryFeeKobo: string
  allocatedDiscountKobo: string
  carrierName?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  serviceScheduledAt?: Date | null
  serviceWindowNotes?: string | null
  technicianName?: string | null
  technicianPhone?: string | null
  deliveredAt?: Date | null
  tenantConfirmedAt?: Date | null
  coolingPeriodEndsAt?: Date | null
  vendor: {
    id: number
    uuid: string
    name: string
    slug: string
    logoUrl?: string | null
    phone?: string | null
    email?: string | null
    rating: number
  }
  items: TenantOrderItemDto[]
  fulfilmentEvents: TenantFulfilmentEventDto[]
}

export interface TenantOrderSummaryDto {
  id: number
  uuid: string
  orderNumber: string
  status: CommerceOrderStatus
  paymentStatus: CommercePaymentStatus
  currency: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  taxKobo: string
  discountKobo: string
  totalAmountKobo: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  subOrderCount: number
  createdAt: Date
  subOrders: Array<{
    uuid: string
    subOrderNumber: string
    customerStatus: CustomerFulfilmentStatus
    vendorName: string
    vendorSlug: string
    itemCount: number
  }>
}

export interface TenantOrderDetailDto {
  id: number
  uuid: string
  orderNumber: string
  status: CommerceOrderStatus
  paymentStatus: CommercePaymentStatus
  currency: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  taxKobo: string
  discountKobo: string
  totalAmountKobo: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryNotes?: string | null
  createdAt: Date
  subOrders: TenantVendorSubOrderDto[]
}
