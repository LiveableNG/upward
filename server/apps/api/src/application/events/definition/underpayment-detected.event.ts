import { DomainEvent } from '../domain-event';

export class UnderpaymentDetectedEvent extends DomainEvent {
  constructor(
    public readonly userId: number,
    public readonly propertyId: number,
    public readonly paymentRequestId: number,
    public readonly amountPaid: number,
    public readonly amountExpected: number,
    public readonly reference: string,
    public readonly isFullOnly: boolean
  ) {
    super();
  }

  eventName(): string {
    return 'UnderpaymentDetectedEvent';
  }
}
