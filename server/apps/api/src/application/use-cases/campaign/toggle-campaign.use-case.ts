import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ToggleCampaignUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(weekNumber: number, isActive: boolean) {
    return this.prisma.upward_email_campaign.update({
      where: { weekNumber },
      data: { isActive },
    })
  }
}
