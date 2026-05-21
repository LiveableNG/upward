import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { InteractionEvent } from '../../../application/events/definition/interaction.event'
import { Inject } from '@nestjs/common'

@Injectable()
export class UnsubscribeWaitlistUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(email: string): Promise<boolean> {
    const waitlistUser = await this.prisma.upward_waitlist.findUnique({
      where: { email },
    })

    const registeredUser = await this.prisma.upward_user.findFirst({
      where: { email },
    })

    if (!waitlistUser && !registeredUser) return false

    if (waitlistUser) {
      await this.prisma.upward_waitlist.update({
        where: { email },
        data: { unsubscribed: true, unsubscribedAt: new Date() },
      })
    }

    if (registeredUser) {
      await this.prisma.upward_user.updateMany({
        where: { email },
        data: { unsubscribed: true, unsubscribedAt: new Date() },
      })
    }

    // Log the interaction via event bus
    this.eventBus.publish(
      new InteractionEvent(
        `unsub-${Date.now()}`,
        'CLICK',
        'EMAIL_UNSUBSCRIBE',
        'UNSUB',
        JSON.stringify({ email }),
      ),
    )

    return true
  }
}
