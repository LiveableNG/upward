import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository'
import { PrismaUserRepository } from './repositories/prisma-user.repository'
import {
  PrismaSavedLandlordRepository,
  PrismaTransactionRepository,
} from './repositories/prisma-payments.repository'
import {
  PrismaCompanyRepository,
  PrismaCompanyUserRepository,
  PrismaManagerRepository,
} from './repositories/prisma-company.repository'
import {
  PrismaPropertyRepository,
  PrismaLocationRepository,
} from './repositories/prisma-property.repository'
import { PaystackGateway } from '@domains/payments/paystack.gateway'
import { WAITLIST_REPOSITORY } from '@domains/waitlist/waitlist.repository'
import { USER_REPOSITORY } from '@domains/users/user.repository'
import {
  SAVED_LANDLORD_REPOSITORY,
  TRANSACTION_REPOSITORY,
  PAYMENT_GATEWAY,
} from '@domains/payments/payment.repository'
import {
  COMPANY_REPOSITORY,
  COMPANY_USER_REPOSITORY,
  MANAGER_REPOSITORY,
} from '@domains/companies/company.repository'
import {
  PROPERTY_REPOSITORY,
  LOCATION_REPOSITORY,
} from '@domains/companies/property.repository'
import { PrismaNotificationRepository } from './repositories/prisma-notification.repository'
import { NOTIFICATION_REPOSITORY } from '@domains/notifications/notification.repository'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

@Global()
@Module({
  providers: [
    PrismaService,
    EncryptionService,
    {
      provide: WAITLIST_REPOSITORY,
      useClass: PrismaWaitlistRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
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
      provide: COMPANY_REPOSITORY,
      useClass: PrismaCompanyRepository,
    },
    {
      provide: COMPANY_USER_REPOSITORY,
      useClass: PrismaCompanyUserRepository,
    },
    {
      provide: MANAGER_REPOSITORY,
      useClass: PrismaManagerRepository,
    },
    {
      provide: PROPERTY_REPOSITORY,
      useClass: PrismaPropertyRepository,
    },
    {
      provide: LOCATION_REPOSITORY,
      useClass: PrismaLocationRepository,
    },
  ],
  exports: [
    PrismaService,
    EncryptionService,
    WAITLIST_REPOSITORY,
    USER_REPOSITORY,
    SAVED_LANDLORD_REPOSITORY,
    TRANSACTION_REPOSITORY,
    PAYMENT_GATEWAY,
    NOTIFICATION_REPOSITORY,
    COMPANY_REPOSITORY,
    COMPANY_USER_REPOSITORY,
    MANAGER_REPOSITORY,
    PROPERTY_REPOSITORY,
    LOCATION_REPOSITORY,
  ],
})
export class PrismaModule {}
