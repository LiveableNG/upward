import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityTrackingService } from './activity-tracking.service';
import { ActivityTrackingListener } from './activity-tracking.listener';
import { ActivityTrackingInterceptor } from './activity-tracking.interceptor';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    ActivityTrackingService,
    ActivityTrackingListener,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityTrackingInterceptor,
    },
  ],
  exports: [ActivityTrackingService],
})
export class ActivityTrackingModule {}
