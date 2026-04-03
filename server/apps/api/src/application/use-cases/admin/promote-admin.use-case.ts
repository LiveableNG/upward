import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { AdminRoleChangedEvent } from '@application/events/definition/admin-role-changed.event'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class PromoteAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(id: string, requesterId: string) {
    const admin = await this.prisma.upward_admin.findUnique({ where: { id } })
    if (!admin) throw new NotFoundException('Admin not found')

    const oldRole = admin.role
    const newRole = AdminRole.SUPERADMIN

    const updated = await this.prisma.upward_admin.update({
      where: { id },
      data: { role: newRole },
    })

    this.eventBus.publish(new AdminRoleChangedEvent(requesterId, id, oldRole, newRole))

    return updated
  }
}
