import { Module, Global } from '@nestjs/common'
import { AdminLogService } from './admin-log.service'
import { AdminLogController } from './admin-log.controller'
import { PrismaModule } from '@shared/infrastructure/prisma/prisma.module'

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AdminLogService],
  controllers: [AdminLogController],
  exports: [AdminLogService],
})
export class AdminLogModule {}
