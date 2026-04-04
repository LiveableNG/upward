import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository'
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository'
import {
  PrismaSavedLandlordRepository,
  PrismaTransactionRepository,
} from './repositories/prisma-payments.repository'
import { PaystackGateway } from '../../../domains/payments/paystack.gateway'
import { WAITLIST_REPOSITORY } from '@domains/waitlist/waitlist.repository'
import { TENANT_REPOSITORY } from '@domains/users/tenant.repository'
import {
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
} from '@domains/payments/payment.repository'

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: WAITLIST_REPOSITORY,
      useClass: PrismaWaitlistRepository,
    },
    {
      provide: TENANT_REPOSITORY,
      useClass: PrismaTenantRepository,
    },
    {
      provide: SAVED_LANDLORD_REPOSITORY,
      useClass: PrismaSavedLandlordRepository,
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useClass: PrismaTransactionRepository,
    },
    {
      provide: PAYMENT_GATEWAY,
      useClass: PaystackGateway,
    },
  ],
  exports: [
    PrismaService,
    WAITLIST_REPOSITORY,
    TENANT_REPOSITORY,
    SAVED_LANDLORD_REPOSITORY,
    TRANSACTION_REPOSITORY,
    PAYMENT_GATEWAY,
  ],
})
export class PrismaModule {}
