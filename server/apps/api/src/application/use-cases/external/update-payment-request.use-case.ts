import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common'
import { 
  PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY, IPaymentLineItemRepository
} from '../../../domains/payments/payment.repository'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { PaymentRequestUpdatedEvent } from '../../events/definition/payment-request-updated.event'
import { UpdateExternalPaymentRequestPayloadDto } from './external-api.dto'

@Injectable()
export class UpdateExternalPaymentRequestUseCase {
  private readonly logger = new Logger(UpdateExternalPaymentRequestUseCase.name)

  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepository: IPaymentLineItemRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
  ) {}

  async execute(platformId: number, uuid: string, data: UpdateExternalPaymentRequestPayloadDto): Promise<any> {
    const pr = await this.paymentRequestRepository.findByUuid(uuid)
    if (!pr) {
      throw new NotFoundException('Payment request not found')
    }

    if (pr.platformId !== platformId) {
      throw new UnauthorizedException('Unauthorized to update this payment request')
    }

    if (pr.status === 'PAID') {
      throw new BadRequestException('Cannot update a fully paid payment request')
    }

    if (pr.amountPaid && pr.amountPaid > 0) {
      throw new BadRequestException('Cannot update a payment request that has already received payments')
    }

    const targetAmount = data.amount !== undefined ? data.amount : pr.amount

    if (data.lineItems && data.lineItems.length > 0) {
      const lineItemsTotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)
      if (Math.abs(lineItemsTotal - targetAmount) !== 0) {
        throw new BadRequestException(
          `The sum of line items (${lineItemsTotal}) must equal the total amount (${targetAmount})`
        )
      }
      await this.lineItemRepository.deleteByPaymentRequestId(pr.id!)
      await this.lineItemRepository.bulkCreate(
        data.lineItems.map((item, idx) => ({
          paymentRequestId: pr.id!,
          name: item.name || data.description || pr.description || 'Invoice Item',
          totalAmount: item.amount,
          amountPaid: 0,
          status: 'PENDING',
          sortOrder: idx,
        }))
      )
    } else if (data.amount !== undefined && data.amount !== pr.amount) {
      const existingItems = await this.lineItemRepository.findByPaymentRequestId(pr.id!)
      if (existingItems && existingItems.length > 0) {
        throw new BadRequestException('Updating the total amount requires providing the updated line items to match')
      }
    }

    const allowPartial = data.allowPartial ?? pr.allowPartial
    let minAmount = data.minAmount !== undefined ? data.minAmount : pr.minAmount
    if (allowPartial === false) {
      minAmount = 0
    }

    const isScheduled = pr.status === 'SCHEDULED'

    const updated = await this.paymentRequestRepository.update(pr.id!, {
      amount: targetAmount,
      description: data.description ?? pr.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : pr.dueDate,
      allowPartial,
      minAmount: minAmount ?? undefined,
      rentStartDate: data.rentStartDate ? new Date(data.rentStartDate) : pr.rentStartDate,
      rentEndDate: data.rentEndDate ? new Date(data.rentEndDate) : pr.rentEndDate,
      rentType: data.rentType ?? pr.rentType,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : pr.scheduledAt,
      isRecurring: data.isRecurring !== undefined ? data.isRecurring : pr.isRecurring,
      recurrenceInterval: data.recurrenceInterval !== undefined ? data.recurrenceInterval : pr.recurrenceInterval,
    })

    this.logger.log(`Updated payment request: ${pr.uuid} for platform ${platformId}`)

    if (!isScheduled) {
      this.eventBus.publish(new PaymentRequestUpdatedEvent(
        updated.id!,
        updated.uuid,
        updated.userId,
        updated.amount
      ))
    }

    return updated
  }
}
