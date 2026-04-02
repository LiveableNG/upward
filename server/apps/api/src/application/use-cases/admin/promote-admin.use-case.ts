import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class PromoteAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(id: string, requesterId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.upward_admin.update({
        where: { id },
        data: { role: AdminRole.SUPERADMIN },
      })
      await this.adminLogService.logAction(
        requesterId,
        'PROMOTE_ADMIN',
        `Promoted admin to SUPERADMIN: ${updated.email}`,
      )
      return updated
    })
  }
}
