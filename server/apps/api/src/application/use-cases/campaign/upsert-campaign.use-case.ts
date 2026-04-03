import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

export interface UpsertCampaignDto {
  weekNumber: number
  subject: string
  htmlContent: string
  textContent?: string
  label?: string
  isActive?: boolean
}

@Injectable()
export class UpsertCampaignUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: UpsertCampaignDto) {
    const { weekNumber, subject, htmlContent, textContent, label, isActive } = dto
    return this.prisma.upward_email_campaign.upsert({
      where: { weekNumber },
      update: { subject, htmlContent, textContent, label, isActive: isActive ?? true },
      create: { weekNumber, subject, htmlContent, textContent, label, isActive: isActive ?? true },
    })
  }
}
