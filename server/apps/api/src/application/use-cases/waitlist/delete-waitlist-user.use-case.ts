import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class DeleteWaitlistUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(id: string, requesterRole: AdminRole, requesterId: string) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.upward_waitlist.findUnique({
        where: { id },
        select: { email: true },
      })

      // Delete related records first to avoid foreign key constraint violations
      await tx.upward_email_log.deleteMany({
        where: { userId: id },
      })
      await tx.upward_attendance.deleteMany({
        where: { userId: id },
      })

      const deleted = await tx.upward_waitlist.delete({
        where: { id },
      })

      if (user) {
        await this.adminLogService.logAction(
          requesterId,
          'DELETE_USER',
          `Deleted user: ${user.email}`,
        )
      }

      return deleted
    })
  }
}
