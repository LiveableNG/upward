import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'

@Injectable()
export class CancelExpiredCommerceOrdersUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  /**
   * Releases stock for orders that were placed but never paid within the expiration window.
   */
  async execute(orderId: number, reason = 'Payment window expired without completion'): Promise<void> {
    const order = await this.orderRepo.findOrderById(orderId)
    if (!order) return

    if (order.status === 'PENDING' && order.paymentStatus === 'UNPAID') {
      // 1. Release reserved inventory
      await this.orderRepo.releaseInventory(order.id!, reason)

      // 2. Mark order as cancelled
      await this.orderRepo.updateOrderStatus(order.id!, 'CANCELLED')

      // 3. Log audit event
      await this.orderRepo.recordAuditLog(order.id!, {
        event: 'ORDER_EXPIRED_CANCELLED',
        fromState: 'PENDING',
        toState: 'CANCELLED',
        actorType: 'SYSTEM',
        details: { reason },
      })
    }
  }
}
