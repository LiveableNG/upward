import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminRole } from '@upward/shared-types'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { WaitlistUserDeletedEvent } from '../../../application/events/definition/waitlist-user-deleted.event'
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
      const user = await tx.upward_user.findUnique({
        where: { uuid: id },
        select: { email: true, id: true },
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      const deleted = await tx.upward_user.delete({
        where: { id: user.id },
      })

      this.eventBus.publish(new WaitlistUserDeletedEvent(requesterId, String(user.id), user.email))

      return deleted
    })
  }
}
