import { Module, Global } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository'
import { WAITLIST_REPOSITORY } from '@domains/waitlist/waitlist.repository'

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: WAITLIST_REPOSITORY,
      useClass: PrismaWaitlistRepository,
    },
  ],
  exports: [PrismaService, WAITLIST_REPOSITORY],
})
export class PrismaModule {}
