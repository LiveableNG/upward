import { DomainEvent } from '../domain-event'

export class PaymentSucceededEvent extends DomainEvent {
  constructor(
    public readonly data: {
      transactionId: number
      userId: number
      propertyId?: number
      externalUnitId?: any
      amount: number
      rentPortion: number
      paymentRequestId?: number
      paymentRequestUuid?: string
      reference: string
      currency: string
      platformId?: number
      email: string
      narration: string
      excess: number
    }
  ) {
    super()
  }

  eventName(): string {
    return 'payment.succeeded'
  }
}
