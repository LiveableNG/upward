import { Module, Global } from '@nestjs/common'
import { AdminLogService } from './admin-log.service'
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module'

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AdminLogService],
  exports: [AdminLogService],
})
export class AdminLogModule {}
