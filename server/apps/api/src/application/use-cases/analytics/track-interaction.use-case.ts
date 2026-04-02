import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

export interface TrackInteractionDto {
  visitorId: string
  type: string
  target: string
  abVariant?: string
  metadata?: string
}

@Injectable()
export class TrackInteractionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: TrackInteractionDto, ip?: string, ua?: string): Promise<void> {
    await this.prisma.upward_interaction.create({
      data: {
        visitorId: dto.visitorId,
        type: dto.type,
        target: dto.target,
        abVariant: dto.abVariant,
        ipAddress: ip,
        userAgent: ua,
        metadata: dto.metadata,
      },
    })
  }
}
