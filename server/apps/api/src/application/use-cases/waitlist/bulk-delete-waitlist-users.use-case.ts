import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class BulkDeleteWaitlistUsersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(ids: string[], requesterRole: AdminRole, requesterId: string) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }

    return this.prisma.$transaction(async (tx) => {
      const count = ids.length

      const result = await tx.upward_user.deleteMany({
        where: { uuid: { in: ids } },
      })

      await this.adminLogService.logAction(
        requesterId,
        'DELETE_USER',
        `Bulk deleted ${count} users`,
      )

      return result
    })
  }
}
