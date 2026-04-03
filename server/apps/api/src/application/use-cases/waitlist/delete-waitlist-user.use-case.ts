import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { AdminRole } from '@upward/shared-types'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { WaitlistUserDeletedEvent } from '@application/events/definition/waitlist-user-deleted.event'
import { Inject } from '@nestjs/common'

@Injectable()
export class DeleteWaitlistUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
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

      const deleted = await tx.upward_waitlist.delete({
        where: { id },
      })

      if (user) {
        this.eventBus.publish(new WaitlistUserDeletedEvent(requesterId, id, user.email))
      }

      return deleted
    })
  }
}
