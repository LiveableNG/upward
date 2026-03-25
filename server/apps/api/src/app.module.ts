import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { WaitlistModule } from './waitlist/waitlist.module'
import { LocationsModule } from './locations/locations.module'
import { EmailModule } from './email/email.module'
import { AdminModule } from './admin/admin.module'
import { AuthModule } from './auth/auth.module'
import { AdminLogModule } from './admin-log/admin-log.module'
import { PrismaModule } from './prisma/prisma.module'
import { BugsnagService } from './common/bugsnag/bugsnag.service'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WaitlistModule,
    LocationsModule,
    EmailModule,
    AdminModule,
    AuthModule,
    AdminLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BugsnagService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
