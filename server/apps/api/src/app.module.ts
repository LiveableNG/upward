import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { WaitlistModule } from './waitlist/waitlist.module'
import { LocationsModule } from './locations/locations.module'
import { EmailModule } from './email/email.module'
import { AdminModule } from './admin/admin.module'
import { AuthModule } from './auth/auth.module'
import { AdminLogModule } from './admin-log/admin-log.module'
import { UpwardPayModule } from './upward-pay/upward-pay.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WaitlistModule,
    LocationsModule,
    EmailModule,
    AdminModule,
    AuthModule,
    AdminLogModule,
    UpwardPayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
