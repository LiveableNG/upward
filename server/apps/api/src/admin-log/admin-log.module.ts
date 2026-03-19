import { Module, Global } from '@nestjs/common'
import { AdminLogService } from './admin-log.service'
import { AdminLogController } from './admin-log.controller'

@Global()
@Module({
  providers: [AdminLogService],
  controllers: [AdminLogController],
  exports: [AdminLogService],
})
export class AdminLogModule {}
