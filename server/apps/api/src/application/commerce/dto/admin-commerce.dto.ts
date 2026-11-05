import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Max,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  CommerceOrderStatus,
  CommercePaymentStatus,
  CustomerFulfilmentStatus,
  AdminOperationalStatus,
} from '../../../domains/commerce/commerce-order.repository'
import { VendorPayableStatus } from '../../../domains/commerce/vendor-payable.repository'

export enum AdminFulfilmentTransitionAction {
  CONFIRM_BY_VENDOR = 'CONFIRM_BY_VENDOR',
  DISPATCH = 'DISPATCH',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVER = 'DELIVER',
  SCHEDULE_SERVICE = 'SCHEDULE_SERVICE',
  ASSIGN_TECHNICIAN = 'ASSIGN_TECHNICIAN',
  TECHNICIAN_EN_ROUTE = 'TECHNICIAN_EN_ROUTE',
  COMPLETE_SERVICE = 'COMPLETE_SERVICE',
  ADMIN_CONFIRM_RECEIPT = 'ADMIN_CONFIRM_RECEIPT',
}

export class AdminGetCommerceOrdersFilterDto {
  @IsOptional()
  @IsString()
  status?: CommerceOrderStatus

  @IsOptional()
  @IsString()
  paymentStatus?: CommercePaymentStatus

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 50
}

export class AdminUpdateFulfilmentDto {
  @IsNotEmpty()
  @IsEnum(AdminFulfilmentTransitionAction)
  action!: AdminFulfilmentTransitionAction

  @IsOptional()
  @IsString()
  carrierName?: string

  @IsOptional()
  @IsString()
  trackingNumber?: string

  @IsOptional()
  @IsString()
  trackingUrl?: string

  @IsOptional()
  @IsString()
  serviceScheduledAt?: string

  @IsOptional()
  @IsString()
  serviceWindowNotes?: string

  @IsOptional()
  @IsString()
  technicianName?: string

  @IsOptional()
  @IsString()
  technicianPhone?: string

  @IsOptional()
  @IsString()
  adminOperationalNotes?: string

  @IsOptional()
  @IsString()
  customTitle?: string

  @IsOptional()
  @IsString()
  customDescription?: string

  @IsOptional()
  @IsBoolean()
  isCustomerVisible?: boolean
}

export interface AdminCommerceOrderCustomerDto {
  id: number
  uuid: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}

export interface AdminCommerceOrderItemDto {
  id?: number
  uuid: string
  offeringId?: number | null
  offeringType: string
  quantity: number
  unitPriceKobo: string
  totalPriceKobo: string
  snapshotData: Record<string, any>
  createdAt?: Date
}

export interface AdminCommerceFulfilmentEventDto {
  id?: number
  uuid: string
  status: CustomerFulfilmentStatus
  title: string
  description: string
  isCustomerVisible: boolean
  carrierName?: string | null
  trackingNumber?: string | null
  serviceDateTime?: Date | null
  actorType: string
  actorId?: string | null
  createdAt: Date
}

export interface AdminCommerceVendorPayableDto {
  id?: number
  uuid: string
  status: VendorPayableStatus
  grossAmountKobo: string
  commissionKobo: string
  netPayableKobo: string
  bankCode: string
  accountNumber: string
  accountName: string
  eligibleAt?: Date | null
  paidAt?: Date | null
}

export interface AdminCommerceSubOrderDto {
  id?: number
  uuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  operationalStatus: AdminOperationalStatus
  subtotalKobo: string
  deliveryFeeKobo: string
  allocatedDiscountKobo: string
  platformFeeKobo: string
  vendorPayoutKobo: string
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
  vendor: {
    id: number
    uuid?: string
    name: string
    slug?: string
    email?: string | null
    phone?: string | null
  }
  items: AdminCommerceOrderItemDto[]
  fulfilmentEvents: AdminCommerceFulfilmentEventDto[]
  payableRecord?: AdminCommerceVendorPayableDto | null
  createdAt?: Date
  updatedAt?: Date
}

export interface AdminCommercePaymentAttemptDto {
  uuid: string
  reference: string
  amountKobo: string
  currency: string
  channel?: string | null
  status: string
  gatewayResponse?: string | null
  ipAddress?: string | null
  createdAt: Date
}

export interface AdminCommerceOrderAuditDto {
  uuid: string
  event: string
  fromState?: string | null
  toState: string
  actorType: string
  actorId?: string | null
  details?: Record<string, any> | null
  createdAt: Date
}

export interface AdminCommerceOrderSummaryDto {
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
  paymentReference?: string | null
  paidAt?: Date | null
  customer: AdminCommerceOrderCustomerDto
  subOrdersCount: number
  subOrders: Array<{
    uuid: string
    subOrderNumber: string
    vendorName: string
    customerStatus: CustomerFulfilmentStatus
    operationalStatus: AdminOperationalStatus
    subtotalKobo: string
    vendorPayoutKobo: string
  }>
  createdAt: Date
  updatedAt: Date
}

export interface AdminCommerceOrderDetailDto {
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
  idempotencyKey?: string | null
  paymentReference?: string | null
  paidAt?: Date | null
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryNotes?: string | null
  customer: AdminCommerceOrderCustomerDto
  subOrders: AdminCommerceSubOrderDto[]
  paymentAttempts: AdminCommercePaymentAttemptDto[]
  auditLogs: AdminCommerceOrderAuditDto[]
  createdAt: Date
  updatedAt: Date
}
