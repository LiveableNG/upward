import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'

@Injectable()
export class ResendConfirmationEmailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(userId: string, requesterId: string) {
    const user = await this.prisma.upward_waitlist.findUnique({
      where: { id: userId },
    })

    if (!user) throw new NotFoundException('User not found')
    if (!user.acceptTerms) throw new ForbiddenException('User has not accepted terms yet')

    const result = await this.emailService.sendWaitlistConfirmation(
      user.id,
      user.email,
      user.firstName ?? undefined,
    )

    await this.adminLogService.logAction(
      requesterId,
      'RESEND_EMAIL',
      `Manually resent confirmation email to: ${user.email}. Result: ${result.success ? 'Success' : 'Failed'}`,
    )

    return result
  }
}
