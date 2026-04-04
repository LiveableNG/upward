import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository'
import { PrismaTenantRepository } from './repositories/prisma-tenant.repository'
import { WAITLIST_REPOSITORY } from '@domains/waitlist/waitlist.repository'
import { TENANT_REPOSITORY } from '@domains/users/tenant.repository'

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
  ],
  exports: [PrismaService, WAITLIST_REPOSITORY, TENANT_REPOSITORY],
})
export class PrismaModule {}
