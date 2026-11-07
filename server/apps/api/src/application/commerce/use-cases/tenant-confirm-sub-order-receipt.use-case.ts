import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  ConfirmSubOrderReceiptInputDto,
  ConfirmSubOrderReceiptResultDto,
} from '../dto/confirm-receipt.dto'
import { SendCommerceThankYouEmailUseCase } from './send-commerce-thank-you-email.use-case'

@Injectable()
export class TenantConfirmSubOrderReceiptUseCase {
  private readonly logger = new Logger(TenantConfirmSubOrderReceiptUseCase.name)

  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Optional()
    private readonly thankYouEmailUseCase?: SendCommerceThankYouEmailUseCase,
  ) {}

  async execute(
    userIdentifier: number | string,
    subOrderUuid: string,
    input?: ConfirmSubOrderReceiptInputDto,
  ): Promise<ConfirmSubOrderReceiptResultDto> {
    const user = typeof userIdentifier === 'number'
      ? await this.userRepo.findById(userIdentifier)
      : await this.userRepo.findByUuid(userIdentifier)
    if (!user?.id) {
      throw new NotFoundException(`Vendor sub-order '${subOrderUuid}' not found`)
    }

    const subOrder = await this.orderRepo.findSubOrderByUuid(subOrderUuid)
    if (!subOrder) {
      throw new NotFoundException(`Vendor sub-order '${subOrderUuid}' not found`)
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order || order.userId !== user.id) {
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
        description: input?.rating
          ? `Customer confirmed receipt with ${input.rating}★ rating${input.feedback?.trim() ? `: "${input.feedback.trim()}"` : ''}`
          : 'Customer confirmed receipt and satisfactory delivery of offering',
        isCustomerVisible: true,
        actorType: 'TENANT',
        actorId: String(user.id!),
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
        actorId: String(user.id!),
        details: {
          subOrderUuid,
          subOrderNumber: subOrder.subOrderNumber,
          rating: input?.rating,
          feedback: input?.feedback?.trim(),
        },
      },
    })

    const parentOrder = await this.orderRepo.findOrderById(order.id!)

    if (this.thankYouEmailUseCase) {
      this.thankYouEmailUseCase
        .execute(order.id!, subOrder.id!)
        .catch((err) =>
          this.logger.error(`Failed to dispatch thank-you email on receipt confirmation for order #${order.id}`, err),
        )
    }

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
