import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class PreviewCampaignAudienceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const users = await this.prisma.upward_user.findMany({
      where: { unsubscribed: false },
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
