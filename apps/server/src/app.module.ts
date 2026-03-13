import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { WaitlistModule } from './waitlist/waitlist.module'
import { LocationsModule } from './locations/locations.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), WaitlistModule, LocationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
