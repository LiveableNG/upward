import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetCampaignByWeekUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(weekNumber: number) {
    return this.prisma.upward_email_campaign.findUnique({
      where: { weekNumber },
    })
  }
}
