import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class BulkDeleteEmailLogsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ids: string[], requesterRole: string) {
    if (requesterRole !== AdminRole.SUPERADMIN && requesterRole !== AdminRole.DEVELOPER) {
      throw new ForbiddenException('Only superadmins or developers can delete communication logs')
    }

    if (!ids || ids.length === 0) return { count: 0 }

    const result = await this.prisma.upward_communication_log.deleteMany({
      where: { id: { in: ids } },
    })

    return { count: result.count }
  }
}
