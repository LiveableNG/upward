import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'
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
      // Delete related records first to avoid foreign key constraint violations
      await tx.upward_email_log.deleteMany({
        where: { userId: { in: ids } },
      })
      await tx.upward_attendance.deleteMany({
        where: { userId: { in: ids } },
      })

      const result = await tx.upward_waitlist.deleteMany({
        where: { id: { in: ids } },
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
