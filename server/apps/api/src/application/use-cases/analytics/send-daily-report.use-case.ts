import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminRole } from '@upward/shared-types'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class SendDailyReportUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const [completedToday, incompleteToday] = await Promise.all([
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: true,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: false,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
    ])

    const totalToday = completedToday + incompleteToday
    const superadmins = await this.prisma.upward_admin.findMany({
      where: { role: AdminRole.SUPERADMIN },
      select: { email: true },
    })

    const emails = Array.from(new Set(superadmins.map((s) => s.email.toLowerCase())))
    const stats = {
      completed: completedToday,
      incomplete: incompleteToday,
      total: totalToday,
    }

    for (const email of emails) {
      await this.unifiedCommService.processCommunication({
        recipientEmail: email,
        recipientRole: 'PM',
        type: 'SYSTEM_ALERT',
        context: {
          title: 'Daily Report Analytics',
          message: `Daily Report: ${stats.total} total signups today (${stats.completed} completed, ${stats.incomplete} incomplete).`,
        },
      });
    }

    return { success: true, stats, notified: emails }
  }
}
