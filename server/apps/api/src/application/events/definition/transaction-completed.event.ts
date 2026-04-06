import { DomainEvent } from '../domain-event'

export class TransactionCompletedEvent extends DomainEvent {
  constructor(
    public readonly transactionId: string,
    public readonly tenantId: string,
    public readonly type: string, // RENT, SAVINGS
    public readonly amount: number,
    public readonly reference: string,
    public readonly status: string, // SUCCESS
    public readonly paidAt: Date,
  ) {
    super()
  }

  eventName(): string {
    return 'TransactionCompletedEvent'
  }
}
