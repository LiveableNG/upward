import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { AdminDeletedEvent } from '../../../application/events/definition/admin-deleted.event'

@Injectable()
export class DeleteAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(
    targetAdminId: string,
    requesterAdminId: string,
    requesterRole: string,
    ip?: string,
    ua?: string,
  ): Promise<void> {
    if (requesterRole !== 'SUPERADMIN') {
      throw new ForbiddenException('Only superadmins can delete admin accounts')
    }

    if (targetAdminId === requesterAdminId) {
      throw new ForbiddenException('You cannot delete your own account')
    }

    // Execute in a transaction to ensure integrity, although here we delete via Prisma directly.
    const deletedEvent = await this.prisma.$transaction(async (tx) => {
      const admin = await tx.upward_admin.findUnique({
        where: { id: targetAdminId },
      })

      if (!admin) {
        throw new NotFoundException('Admin not found')
      }

      await tx.upward_admin.delete({
        where: { id: targetAdminId },
      })

      return new AdminDeletedEvent(requesterAdminId, admin.id, admin.email, ip, ua)
    })

    // After successful transaction, dispatch our domain event
    this.eventBus.publish(deletedEvent)
  }
}
