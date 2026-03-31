import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { AdminLogService } from '../admin-log/admin-log.service'
import { formatName } from '@upward/common-utils'
import { wrapInBaseTemplate, processCampaignHtml } from '../email/templates'

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  // ─── CRUD for campaign weeks ────────────────────────────────────────────────

  async getCampaigns() {
    return this.prisma.upward_email_campaign.findMany({
      orderBy: { weekNumber: 'asc' },
    })
  }

  async getCampaignByWeek(weekNumber: number) {
    return this.prisma.upward_email_campaign.findUnique({
      where: { weekNumber },
    })
  }

  async upsertCampaign(data: {
    weekNumber: number
    subject: string
    htmlContent: string
    textContent?: string
    label?: string
    isActive?: boolean
  }) {
    const { weekNumber, subject, htmlContent, textContent, label, isActive } = data
    return this.prisma.upward_email_campaign.upsert({
      where: { weekNumber },
      update: { subject, htmlContent, textContent, label, isActive: isActive ?? true },
      create: { weekNumber, subject, htmlContent, textContent, label, isActive: isActive ?? true },
    })
  }

  async deleteCampaign(weekNumber: number) {
    const existing = await this.prisma.upward_email_campaign.findUnique({ where: { weekNumber } })
    if (!existing) throw new NotFoundException(`Campaign for week ${weekNumber} not found`)
    return this.prisma.upward_email_campaign.delete({ where: { weekNumber } })
  }

  async toggleCampaign(weekNumber: number, isActive: boolean) {
    return this.prisma.upward_email_campaign.update({
      where: { weekNumber },
      data: { isActive },
    })
  }

  // ─── Tuesday Cron Logic ─────────────────────────────────────────────────────

  /**
   * Called every Tuesday morning by the cron job (or manually via admin endpoint).
   *
   * How cohorts work:
   *  - Each user has `campaignWeekSent` (Int, default 0) on their record.
   *  - 0 = never received a drip email. Their NEXT email is Week 1.
   *  - 1 = received Week 1. Their NEXT email is Week 2. And so on.
   *
   * This means:
   *  - ALL existing users start at 0 → they all receive Week 1 on the first run.
   *  - A new user who joins the day BEFORE Tuesday is also at 0 → gets Week 1 too.
   *  - The following Tuesday every user advances by 1, regardless of join date.
   *  - No email is ever repeated. The counter only goes forward.
   *
   * If no campaign exists for a user's next week:
   *  - We still advance their counter so they don't get stuck.
   *  - (Exception: if the admin has only created up to Week 3 and a user is on Week 4,
   *    they are simply skipped and advanced — a gap warning appears in the preview.)
   */
  async runTuesdayCampaign(triggeredBy?: string): Promise<{
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

    const users = await this.prisma.upward_waitlist.findMany({
      where: { acceptTerms: true, unsubscribed: false, role: 'TENANT' },
      select: {
        id: true,
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
        await this.prisma.upward_waitlist.updateMany({
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
                userId: user.id,
                email: user.email,
                subject: campaign.subject,
                html: finalHtml,
                text: personalizedText,
                type: `CAMPAIGN_WEEK_${weekNumber}`,
              })

              if (res.success) {
                weekSent++
                totalSent++
                await this.prisma.upward_waitlist.update({
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
        // We do these one by one to avoid overwhelming again
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
              userId: user.id,
              email: user.email,
              subject: campaign.subject,
              html: finalHtml,
              text: personalizedText,
              type: `CAMPAIGN_WEEK_${weekNumber}_RETRY`,
            })

            if (res.success) {
              weekSent++
              totalSent++
              await this.prisma.upward_waitlist.update({
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

  async previewCampaignAudience() {
    const users = await this.prisma.upward_waitlist.findMany({
      where: { acceptTerms: true, unsubscribed: false, role: 'TENANT' },
      select: { id: true, campaignWeekSent: true },
    })

    const campaigns = await this.prisma.upward_email_campaign.findMany({
      orderBy: { weekNumber: 'asc' },
    })
    const campaignMap = new Map(campaigns.map((c) => [c.weekNumber, c]))

    const weekBuckets = new Map<number, number>()
    for (const user of users) {
      const nextWeek = user.campaignWeekSent + 1
      weekBuckets.set(nextWeek, (weekBuckets.get(nextWeek) ?? 0) + 1)
    }

    return Array.from(weekBuckets.entries())
      .map(([weekNumber, userCount]) => {
        const campaign = campaignMap.get(weekNumber)
        return {
          weekNumber,
          userCount,
          hasCampaign: !!campaign,
          campaignLabel: campaign?.label ?? null,
          campaignSubject: campaign?.subject ?? null,
          isActive: campaign?.isActive ?? false,
        }
      })
      .sort((a, b) => a.weekNumber - b.weekNumber)
  }
}
