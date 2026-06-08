import { DomainEvent } from '../domain-event'

export class PaymentRequestCreatedEvent extends DomainEvent {
  constructor(
    public readonly id: number,
    public readonly uuid: string,
    public readonly userId: number,
    public readonly amount: number
  ) {
    super()
  }

  eventName(): string {
    return 'payment.request.created'
  }
}
