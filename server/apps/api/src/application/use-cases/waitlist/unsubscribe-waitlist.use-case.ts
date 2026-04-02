import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class UnsubscribeWaitlistUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(email: string): Promise<boolean> {
    const user = await this.prisma.upward_waitlist.findUnique({
      where: { email },
    })

    if (!user) return false

    await this.prisma.upward_waitlist.update({
      where: { email },
      data: { unsubscribed: true, unsubscribedAt: new Date() },
    })

    // Log the interaction for analytics (without requiring a visitorId)
    await this.prisma.upward_interaction.create({
      data: {
        visitorId: `unsub-${Date.now()}`,
        type: 'CLICK',
        target: 'EMAIL_UNSUBSCRIBE',
        abVariant: 'UNSUB',
        metadata: JSON.stringify({ email }),
      },
    })

    return true
  }
}
