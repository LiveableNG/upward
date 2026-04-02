import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { Subject, Subscription, filter } from 'rxjs'
import { DomainEvent, EventBus } from './domain-event'

@Injectable()
export class RxjsEventBus implements EventBus, OnModuleDestroy {
  private readonly subject = new Subject<DomainEvent>()

  publish(event: DomainEvent): void {
    this.subject.next(event)
  }

  publishAll(events: DomainEvent[]): void {
    events.forEach((event) => this.publish(event))
  }

  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
  ): Subscription {
    return this.subject
      .pipe(filter((event) => event.eventName() === eventName))
      .subscribe(async (event) => {
        try {
          await handler(event as T)
        } catch (error) {
          // Log errors but avoid crashing the event bus pipeline
          console.error(`Error handling event ${eventName}:`, error)
        }
      })
  }

  onModuleDestroy() {
    this.subject.complete()
  }
}
