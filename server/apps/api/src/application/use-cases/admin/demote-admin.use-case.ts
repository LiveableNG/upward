import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class DemoteAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot demote yourself')
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.upward_admin.update({
        where: { id },
        data: { role: AdminRole.ADMIN },
      })
      await this.adminLogService.logAction(
        requesterId,
        'DEMOTE_ADMIN',
        `Demoted admin to ADMIN: ${updated.email}`,
      )
      return updated
    })
  }
}
