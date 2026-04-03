import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetCampaignsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.upward_email_campaign.findMany({
      orderBy: { weekNumber: 'asc' },
    })
  }
}
