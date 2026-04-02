import { Global, Module } from '@nestjs/common'
import { EVENT_BUS } from './domain-event'
import { RxjsEventBus } from './rxjs-event-bus'

@Global()
@Module({
  providers: [
    {
      provide: EVENT_BUS,
      useClass: RxjsEventBus,
    },
  ],
  exports: [EVENT_BUS],
})
export class EventsModule {}
