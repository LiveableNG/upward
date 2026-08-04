import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { resolve } from 'path'
import { APP_FILTER } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './application/auth/auth.module'
import { ApplicationModule } from './application/application.module'
import { DomainsModule } from './domains/domains.module'
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module'
import { AdminLogModule } from './shared/infrastructure/admin-log/admin-log.module'
import { EmailModule } from './shared/infrastructure/email/email.module'
import { LocationModule } from './shared/infrastructure/location/location.module'
import { BugsnagModule } from './shared/infrastructure/common/bugsnag/bugsnag.module'
import { AllExceptionsFilter } from './shared/infrastructure/common/filters/all-exceptions.filter'
import { EventsModule } from './application/events/events.module'
import { HttpModule } from './interfaces/http/http.module'
import { ActivityTrackingModule } from './shared/infrastructure/activity-tracking/activity-tracking.module'
import { SchedulingModule } from './scheduling/scheduling.module'
import { SubscriptionModule } from './domains/subscription/subscription.module'

import { CommunicationModule } from './shared/infrastructure/communication/communication.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../.env'),
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), 'server/apps/api/.env'),
      ],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AdminLogModule,
    EmailModule,
    CommunicationModule,
    LocationModule,
    BugsnagModule,
    ActivityTrackingModule,
    SchedulingModule,
    SubscriptionModule,

    // Core Layers
    AuthModule,
    DomainsModule,
    ApplicationModule,
    EventsModule,
    HttpModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
