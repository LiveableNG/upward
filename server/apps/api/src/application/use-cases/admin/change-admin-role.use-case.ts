import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { AdminRoleChangedEvent } from '../../../application/events/definition/admin-role-changed.event'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class ChangeAdminRoleUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(id: string, newRole: AdminRole, requesterId: string) {
    if (newRole === AdminRole.DEVELOPER) {
      throw new ForbiddenException('DEVELOPER role can only be assigned via direct database intervention.')
    }

    if (id === requesterId) {
      throw new ForbiddenException('You cannot change your own role.')
    }

    const admin = await this.prisma.upward_admin.findUnique({ where: { id } })
    if (!admin) throw new NotFoundException('Admin not found')

    if (admin.role === AdminRole.DEVELOPER) {
      throw new ForbiddenException('You cannot change the role of the DEVELOPER.')
    }

    const oldRole = admin.role

    const updated = await this.prisma.upward_admin.update({
      where: { id },
      data: { role: newRole },
    })

    this.eventBus.publish(new AdminRoleChangedEvent(requesterId, id, oldRole, newRole))

    return updated
  }
}
