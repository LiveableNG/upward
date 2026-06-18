import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../domains/payments/payment.repository'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestUpdatedEvent } from '../../events/definition/payment-request-updated.event'

@Injectable()
export class CancelExternalPaymentRequestUseCase {
  private readonly logger = new Logger(CancelExternalPaymentRequestUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  async execute(platformId: number, uuid: string): Promise<{ success: boolean; message: string }> {
    const pr = await this.paymentRequestRepository.findByUuid(uuid)
    if (!pr) {
      throw new NotFoundException('Payment request not found')
    }

    if (pr.platformId !== platformId) {
      throw new UnauthorizedException('Unauthorized to cancel this payment request')
    }

    if (pr.status === 'CANCELLED') {
      return {
        success: true,
        message: 'Payment request is already cancelled',
      }
    }

    if (pr.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a fully paid payment request')
    }

    if (pr.amountPaid && pr.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel a request that has partial payments')
    }

    await this.paymentRequestRepository.update(pr.id!, {
      status: 'CANCELLED',
    })

    this.logger.log(`Cancelled payment request: ${pr.uuid} for platform ${platformId}`)

    this.eventBus.publish(new PaymentRequestUpdatedEvent(
      pr.id!,
      pr.uuid,
      pr.userId,
      pr.amount
    ))

    return {
      success: true,
      message: 'Payment request cancelled successfully',
    }
  }
}
