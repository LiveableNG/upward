import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    adminId: string,
    action: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.upward_admin_log.create({
      data: {
        adminId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    })
  }
}
