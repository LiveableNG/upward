import { DomainEvent } from '../domain-event'

export class RentVaultUpdatedEvent extends DomainEvent {
  constructor(
    public readonly userId: number,
    public readonly vaultUuid: string,
    public readonly amountKobo?: number,
    public readonly reference?: string,
  ) {
    super()
  }

  eventName(): string {
    return 'rent-vault.updated'
  }
}
