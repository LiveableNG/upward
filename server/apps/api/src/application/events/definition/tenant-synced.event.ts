import { DomainEvent } from '../domain-event';

export interface TenantSyncedPropertyInfo {
  propertyId: number;
  bankCode?: string;
  accountNumber?: string;
  businessName?: string;
}

export class TenantSyncedEvent extends DomainEvent {
  constructor(
    public readonly userId: number,
    public readonly tenantEmail: string,
    public readonly tenantName: string,
    public readonly tenantPhone?: string,
    public readonly properties: TenantSyncedPropertyInfo[] = []
  ) {
    super();
  }

  eventName(): string {
    return 'TenantSyncedEvent';
  }
}
