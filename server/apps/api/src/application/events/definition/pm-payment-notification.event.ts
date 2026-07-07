import { DomainEvent } from '../domain-event';

export class PmPaymentNotificationEvent extends DomainEvent {
  constructor(
    public readonly email: string,
    public readonly tenantName: string,
    public readonly pmName: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly dueDate: any,
    public readonly description: string | undefined,
    public readonly paymentLink: string,
    public readonly corePrUuid: string,
    public readonly isReminder: boolean = false,
    public readonly pmType?: string | null,
    public readonly channels: ('EMAIL' | 'WHATSAPP' | 'SMS')[] = ['EMAIL'],
    public readonly tenantPhoneNumber?: string,
  ) {
    super();
  }

  eventName(): string {
    return 'PmPaymentNotificationEvent';
  }
}
