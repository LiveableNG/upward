import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'

@Injectable()
export class SendUniversityApplicationDailyDigestUseCase {
  private readonly logger = new Logger(SendUniversityApplicationDailyDigestUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Starting Upward University Applications daily digest job...')

    // Calculate start and end of yesterday
    const now = new Date()
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0)
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)

    // Fetch applications created or updated yesterday
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yesterdayApps = await (this.prisma as any).upward_university_application.findMany({
      where: {
        createdAt: {
          gte: startOfYesterday,
          lte: endOfYesterday,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const totalApplications = yesterdayApps.length
    if (totalApplications === 0) {
      this.logger.log('No new Upward University applications received yesterday. Digest email skipped.')
      return
    }

    const paidCount = yesterdayApps.filter((a: any) => a.feeStatus === 'PAID').length
    const pendingCount = yesterdayApps.filter((a: any) => a.feeStatus !== 'PAID').length
    const scholarshipCount = yesterdayApps.filter((a: any) => a.isScholarship === true).length

    const dateFormatted = startOfYesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

    const subject = `🎓 Daily Digest: ${totalApplications} Upward University Application(s) [${dateFormatted}]`

    let appsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f4f4f5; text-align: left; color: #555;">
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Name</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Email / Phone</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7;">City</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Scholarship</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Fee Status</th>
            <th style="padding: 8px; border: 1px solid #e4e4e7;">Submitted</th>
          </tr>
        </thead>
        <tbody>
    `

    for (const app of yesterdayApps) {
      const isPaid = app.feeStatus === 'PAID'
      const statusColor = isPaid ? '#16a34a' : '#d97706'
      const scholarshipBadge = app.isScholarship ? '<span style="color:#8A4A2A;font-weight:bold;">Yes</span>' : 'No'
      const submittedTime = new Date(app.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

      appsTableHtml += `
        <tr>
          <td style="padding: 8px; border: 1px solid #e4e4e7; font-weight: 600;">${app.name}</td>
          <td style="padding: 8px; border: 1px solid #e4e4e7;">${app.email}<br/><span style="color:#71717a;font-size:12px;">${app.whatsapp}</span></td>
          <td style="padding: 8px; border: 1px solid #e4e4e7;">${app.city}</td>
          <td style="padding: 8px; border: 1px solid #e4e4e7;">${scholarshipBadge}</td>
          <td style="padding: 8px; border: 1px solid #e4e4e7; color: ${statusColor}; font-weight: bold;">${app.feeStatus || 'PENDING'}</td>
          <td style="padding: 8px; border: 1px solid #e4e4e7; color: #71717a;">${submittedTime}</td>
        </tr>
      `
    }

    appsTableHtml += `
        </tbody>
      </table>
    `

    const messageHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; color: #18181b;">
        <h2 style="color: #8A4A2A; margin-bottom: 4px;">Upward University Daily Applications Digest</h2>
        <p style="color: #71717a; font-size: 14px; margin-top: 0;">Summary of applications received on <strong>${dateFormatted}</strong></p>

        <div style="display: flex; gap: 12px; margin: 20px 0;">
          <div style="background: #f4f4f5; padding: 12px 16px; border-radius: 8px; flex: 1;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #71717a;">Total Applications</div>
            <div style="font-size: 24px; font-weight: 800; color: #18181b;">${totalApplications}</div>
          </div>
          <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 8px; flex: 1;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #166534;">Paid Applications</div>
            <div style="font-size: 24px; font-weight: 800; color: #166534;">${paidCount}</div>
          </div>
          <div style="background: #fffbeb; padding: 12px 16px; border-radius: 8px; flex: 1;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #92400e;">Pending Payment</div>
            <div style="font-size: 24px; font-weight: 800; color: #92400e;">${pendingCount}</div>
          </div>
          <div style="background: #fdf2f8; padding: 12px 16px; border-radius: 8px; flex: 1;">
            <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #9d174d;">Scholarship Requests</div>
            <div style="font-size: 24px; font-weight: 800; color: #9d174d;">${scholarshipCount}</div>
          </div>
        </div>

        ${appsTableHtml}

        <p style="margin-top: 24px; font-size: 13px; color: #71717a;">
          This is an automated daily digest sent to all system administrators. You can log into the Admin Portal to review full applicant details, video submissions, and application notes.
        </p>
      </div>
    `

    await this.emailService.sendSystemAlertToAdmins(subject, messageHtml)
    this.logger.log(`Daily digest for ${totalApplications} application(s) successfully sent to admins.`)
  }
}
