import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class DeleteCampaignUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(weekNumber: number) {
    const existing = await this.prisma.upward_email_campaign.findUnique({
      where: { weekNumber },
    })
    if (!existing) {
      throw new NotFoundException(`Campaign for week ${weekNumber} not found`)
    }
    return this.prisma.upward_email_campaign.delete({
      where: { weekNumber },
    })
  }
}
