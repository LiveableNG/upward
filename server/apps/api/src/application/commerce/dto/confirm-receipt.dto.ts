import { CustomerFulfilmentStatus } from '../../../domains/commerce/commerce-order.repository'

export interface ConfirmSubOrderReceiptResultDto {
  success: boolean
  message: string
  subOrderUuid: string
  subOrderNumber: string
  customerStatus: CustomerFulfilmentStatus
  tenantConfirmedAt: Date
  orderStatus: string
}
