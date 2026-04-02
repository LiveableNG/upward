export abstract class DomainEvent {
  public readonly occurredOn: Date

  constructor() {
    this.occurredOn = new Date()
  }

  // Name used by event emitter to route events
  abstract eventName(): string
}

import { Subscription } from 'rxjs'

export interface EventBus {
  publish(event: DomainEvent): void
  publishAll(events: DomainEvent[]): void
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
  ): Subscription
}

export const EVENT_BUS = Symbol('EVENT_BUS')
