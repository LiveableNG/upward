import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestUpdatedEvent } from '../../events/definition/payment-request-updated.event'
import {
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class CancelManualPaymentRequestUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) { }

  async execute(userId: string, uuid: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const pr = await this.paymentRequestRepo.findByUuid(uuid)
    if (!pr) throw new BadRequestException('Payment request not found')

    if (pr.userId !== user.id) {
      throw new UnauthorizedException('Unauthorized to cancel this payment request')
    }

    if (!pr.isManual && !pr.description?.includes('Manual') && !pr.description?.includes('Self-initiated')) {
      throw new BadRequestException('Only self-initiated manual requests can be cancelled')
    }

    if (pr.status === 'CANCELLED') {
      return { success: true }
    }

    if (pr.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a fully paid payment request')
    }

    if (pr.amountPaid && pr.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel a request that has partial payments')
    }

    await this.paymentRequestRepo.update(pr.id!, {
      status: 'CANCELLED',
    })

    this.eventBus.publish(new PaymentRequestUpdatedEvent(
      pr.id!,
      pr.uuid,
      pr.userId,
      pr.amount
    ))

    return { success: true }
  }
}
