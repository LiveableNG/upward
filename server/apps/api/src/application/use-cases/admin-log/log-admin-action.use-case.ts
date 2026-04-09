import { Injectable } from '@nestjs/common'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class LogAdminActionUseCase {
  constructor(private readonly adminLogService: AdminLogService) {}

  async execute(adminId: string, action: string, details?: string, ip?: string, ua?: string) {
    return this.adminLogService.logAction(adminId, action, details, ip, ua)
  }
}
