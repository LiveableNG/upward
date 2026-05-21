import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { formatName } from '@upward/common-utils'
import { wrapInBaseTemplate, processCampaignHtml } from '../../../shared/infrastructure/email/templates'

@Injectable()
export class RunTuesdayCampaignUseCase {
  private readonly logger = new Logger(RunTuesdayCampaignUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(triggeredBy?: string): Promise<{
    processed: number
    sent: number
    failed: number
    skipped: number
    details: {
      weekNumber: number
      userCount: number
      sent: number
      failed: number
      status: string
    }[]
  }> {
    this.logger.log('[Campaign] Tuesday drip campaign starting…')

    const users = await this.prisma.upward_user.findMany({
      where: { unsubscribed: false },
      select: {
        id: true,
        uuid: true,
        email: true,
        firstName: true,
        lastName: true,
        campaignWeekSent: true,
      },
    })

    if (users.length === 0) {
      this.logger.log('[Campaign] No opted-in users. Nothing to send.')
      return { processed: 0, sent: 0, failed: 0, skipped: 0, details: [] }
    }

    const campaigns = await this.prisma.upward_email_campaign.findMany({
      where: { isActive: true },
      orderBy: { weekNumber: 'asc' },
    })
    const campaignMap = new Map(campaigns.map((c) => [c.weekNumber, c]))

    const weekBuckets = new Map<number, typeof users>()
    for (const user of users) {
      const nextWeek = user.campaignWeekSent + 1
      if (!weekBuckets.has(nextWeek)) weekBuckets.set(nextWeek, [])
      weekBuckets.get(nextWeek)!.push(user)
    }

    let totalSent = 0
    let totalFailed = 0
    let totalSkipped = 0
    const details: {
      weekNumber: number
      userCount: number
      sent: number
      failed: number
      status: string
    }[] = []

    for (const [weekNumber, usersInWeek] of weekBuckets) {
      const campaign = campaignMap.get(weekNumber)
      const userIds = usersInWeek.map((u) => u.id)

      if (!campaign) {
        this.logger.log(
          `[Campaign] No active campaign for Week ${weekNumber}. Advancing counter for ${usersInWeek.length} users and skipping.`,
        )
        await this.prisma.upward_user.updateMany({
          where: { id: { in: userIds } },
          data: { campaignWeekSent: { increment: 1 } },
        })
        totalSkipped += usersInWeek.length
        details.push({
          weekNumber,
          userCount: usersInWeek.length,
          sent: 0,
          failed: 0,
          status: 'SKIPPED — no campaign content',
        })
        continue
      }

      this.logger.log(
        `[Campaign] Sending Week ${weekNumber} to ${usersInWeek.length} users — "${campaign.subject}"`,
      )

      let weekSent = 0
      let weekFailed = 0

      const BATCH_SIZE = 50
      const DELAY_MS = 2000 // 2 seconds between batches
      const failedUsersInWeek: typeof usersInWeek = []

      for (let i = 0; i < usersInWeek.length; i += BATCH_SIZE) {
        const batch = usersInWeek.slice(i, i + BATCH_SIZE)
        this.logger.log(
          `[Campaign] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
            usersInWeek.length / BATCH_SIZE,
          )} for Week ${weekNumber} (${batch.length} users)`,
        )

        await Promise.all(
          batch.map(async (user) => {
            const formattedName = user.firstName ? formatName(user.firstName) : 'there'
            const personalizedHtmlBody = processCampaignHtml(campaign.htmlContent, user)
            const isFullHtml =
              personalizedHtmlBody.toLowerCase().includes('<html') ||
              personalizedHtmlBody.toLowerCase().includes('<!doctype')
            const finalHtml = isFullHtml
              ? personalizedHtmlBody
              : wrapInBaseTemplate(personalizedHtmlBody, campaign.subject, user.email)

            const personalizedText = campaign.textContent
              ? campaign.textContent
                  .replace(/\{\{firstName\}\}/g, formattedName)
                  .replace(/\{\{email\}\}/g, user.email)
              : undefined

            try {
              const res = await this.emailService.sendEmailWithRetry({
                userId: user.uuid,
                email: user.email,
                subject: campaign.subject,
                html: finalHtml,
                text: personalizedText,
                type: `CAMPAIGN_WEEK_${weekNumber}`,
              })

              if (res.success) {
                weekSent++
                totalSent++
                await this.prisma.upward_user.update({
                  where: { id: user.id },
                  data: { campaignWeekSent: { increment: 1 } },
                })
              } else {
                failedUsersInWeek.push(user)
              }
            } catch (err) {
              failedUsersInWeek.push(user)
              this.logger.error(
                `[Campaign] Unexpected error sending Week ${weekNumber} to ${user.email}`,
                err,
              )
            }
          }),
        )

        if (i + BATCH_SIZE < usersInWeek.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
        }
      }

      // SECONDARY RETRY FOR FAILED EMAILS
      if (failedUsersInWeek.length > 0) {
        this.logger.log(
          `[Campaign] Retrying ${failedUsersInWeek.length} failed emails for Week ${weekNumber}...`,
        )
        for (const user of failedUsersInWeek) {
          const formattedName = user.firstName ? formatName(user.firstName) : 'there'
          const personalizedHtmlBody = processCampaignHtml(campaign.htmlContent, user)
          const isFullHtml =
            personalizedHtmlBody.toLowerCase().includes('<html') ||
            personalizedHtmlBody.toLowerCase().includes('<!doctype')
          const finalHtml = isFullHtml
            ? personalizedHtmlBody
            : wrapInBaseTemplate(personalizedHtmlBody, campaign.subject, user.email)

          const personalizedText = campaign.textContent
            ? campaign.textContent
                .replace(/\{\{firstName\}\}/g, formattedName)
                .replace(/\{\{email\}\}/g, user.email)
            : undefined

          try {
            const res = await this.emailService.sendEmailWithRetry({
              userId: user.uuid,
              email: user.email,
              subject: campaign.subject,
              html: finalHtml,
              text: personalizedText,
              type: `CAMPAIGN_WEEK_${weekNumber}_RETRY`,
            })

            if (res.success) {
              weekSent++
              totalSent++
              await this.prisma.upward_user.update({
                where: { id: user.id },
                data: { campaignWeekSent: { increment: 1 } },
              })
            } else {
              weekFailed++
              totalFailed++
              this.logger.error(`[Campaign] Retry failed for Week ${weekNumber} to ${user.email}`)
            }
          } catch (err) {
            weekFailed++
            totalFailed++
            this.logger.error(`[Campaign] Retry error for Week ${weekNumber} to ${user.email}`, err)
          }
        }
      }

      details.push({
        weekNumber,
        userCount: usersInWeek.length,
        sent: weekSent,
        failed: weekFailed,
        status: weekFailed === 0 ? 'OK' : 'PARTIAL',
      })
    }
    if (triggeredBy) {
      await this.adminLogService.logAction(
        triggeredBy,
        'SEND_EMAIL',
        `Tuesday campaign run: ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped (no content)`,
      )
    }

    this.logger.log(
      `[Campaign] ✓ Done — ${totalSent} sent, ${totalFailed} failed, ${totalSkipped} skipped`,
    )

    return {
      processed: users.length,
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      details,
    }
  }
}
