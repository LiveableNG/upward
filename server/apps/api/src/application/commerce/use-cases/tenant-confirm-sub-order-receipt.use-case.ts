import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import { ConfirmSubOrderReceiptResultDto } from '../dto/confirm-receipt.dto'

@Injectable()
export class TenantConfirmSubOrderReceiptUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  async execute(
    userId: number,
    subOrderUuid: string,
  ): Promise<ConfirmSubOrderReceiptResultDto> {
    const subOrder = await this.orderRepo.findSubOrderByUuid(subOrderUuid)
    if (!subOrder) {
      throw new NotFoundException(`Vendor sub-order '${subOrderUuid}' not found`)
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order || order.userId !== userId) {
      // Strict data isolation: prevent unauthorized access or existence probing
      throw new NotFoundException(`Vendor sub-order '${subOrderUuid}' not found`)
    }

    // Idempotency: already confirmed
    if (subOrder.customerStatus === 'RECEIVED_CONFIRMED') {
      return {
        success: true,
        message: 'Receipt has already been confirmed',
        subOrderUuid: subOrder.uuid,
        subOrderNumber: subOrder.subOrderNumber,
        customerStatus: subOrder.customerStatus,
        tenantConfirmedAt: subOrder.tenantConfirmedAt || new Date(),
        orderStatus: order.status,
      }
    }

    // Sub-order must be in DELIVERED or SERVICE_COMPLETED
    if (
      subOrder.customerStatus !== 'DELIVERED' &&
      subOrder.customerStatus !== 'SERVICE_COMPLETED'
    ) {
      throw new BadRequestException(
        `Cannot confirm receipt for sub-order in status '${subOrder.customerStatus}'. Sub-order must be in DELIVERED or SERVICE_COMPLETED status.`,
      )
    }

    const now = new Date()

    const updatedSubOrder = await this.orderRepo.executeSubOrderFulfilmentTransition({
      subOrderId: subOrder.id!,
      orderId: order.id!,
      customerStatus: 'RECEIVED_CONFIRMED',
      operationalStatus: 'FULFILMENT_CLOSED',
      dispatchData: {
        tenantConfirmedAt: now,
      },
      event: {
        status: 'RECEIVED_CONFIRMED',
        title: 'Receipt Confirmed',
        description: 'Customer confirmed receipt and satisfactory delivery of offering',
        isCustomerVisible: true,
        actorType: 'TENANT',
        actorId: String(userId),
      },
      payableStatusUpdate: {
        status: 'ELIGIBLE_FOR_PAYOUT',
        eligibleAt: now,
      },
      checkAllSubOrdersCompleted: true,
      auditLog: {
        event: 'TENANT_CONFIRMED_RECEIPT',
        fromState: subOrder.customerStatus,
        toState: 'RECEIVED_CONFIRMED',
        actorType: 'TENANT',
        actorId: String(userId),
        details: {
          subOrderUuid,
          subOrderNumber: subOrder.subOrderNumber,
        },
      },
    })

    const parentOrder = await this.orderRepo.findOrderById(order.id!)

    return {
      success: true,
      message: 'Receipt successfully confirmed',
      subOrderUuid: updatedSubOrder.uuid,
      subOrderNumber: updatedSubOrder.subOrderNumber,
      customerStatus: updatedSubOrder.customerStatus,
      tenantConfirmedAt: updatedSubOrder.tenantConfirmedAt || now,
      orderStatus: parentOrder?.status || order.status,
    }
  }
}
