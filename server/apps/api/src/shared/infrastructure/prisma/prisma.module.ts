import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository'
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository'
import {
  PrismaSavedLandlordRepository,
  PrismaTransactionRepository,
} from './repositories/prisma-payments.repository'
import {
  PrismaWalletRepository,
  PrismaSavingsGoalRepository,
} from './repositories/prisma-wallet.repository'
import { PaystackGateway } from '../../../domains/payments/paystack.gateway'
import { WAITLIST_REPOSITORY } from '@domains/waitlist/waitlist.repository'
import { TENANT_REPOSITORY } from '@domains/users/tenant.repository'
import {
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
  WALLET_REPOSITORY,
  SAVINGS_GOAL_REPOSITORY,
} from '@domains/payments/payment.repository'
import { PrismaNotificationRepository } from './repositories/prisma-notification.repository'
import { PrismaContractRepository } from './repositories/prisma-contract.repository'
import { NOTIFICATION_REPOSITORY } from '@domains/notifications/notification.repository'
import { CONTRACT_REPOSITORY } from '@domains/contracts/contract.repository'

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
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: WALLET_REPOSITORY,
      useClass: PrismaWalletRepository,
    },
    {
      provide: SAVINGS_GOAL_REPOSITORY,
      useClass: PrismaSavingsGoalRepository,
    },
    {
      provide: CONTRACT_REPOSITORY,
      useClass: PrismaContractRepository,
    },
  ],
  exports: [
    PrismaService,
    WAITLIST_REPOSITORY,
    TENANT_REPOSITORY,
    SAVED_LANDLORD_REPOSITORY,
    TRANSACTION_REPOSITORY,
    PAYMENT_GATEWAY,
    NOTIFICATION_REPOSITORY,
    WALLET_REPOSITORY,
    SAVINGS_GOAL_REPOSITORY,
    CONTRACT_REPOSITORY,
  ],
})
export class PrismaModule {}
