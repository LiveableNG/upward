import { Module, Global } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGateGuard } from '../../application/auth/guards/subscription-gate.guard';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService, SubscriptionGateGuard],
  exports: [SubscriptionService, SubscriptionGateGuard],
})
export class SubscriptionModule {}
