import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { IEmailSequenceRepository, EMAIL_SEQUENCE_REPOSITORY } from '../../../domains/email-sequence/email-sequence.repository.interface'

export interface TrackEmailOpenDto {
  token?: string
  userAgent?: string
}

@Injectable()
export class TrackEmailOpenUseCase {
  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(dto: TrackEmailOpenDto) {
    if (!dto.token) return

    const updatedCount = await this.sequenceRepository.markAsOpened(dto.token, dto.userAgent)
    if (updatedCount === 0) {
      await (this.prisma as any).upward_communication_log.updateMany({
        where: { emailTrackingToken: dto.token },
        data: {
          isOpened: true,
          openedAt: new Date(),
          openCount: { increment: 1 },
          userAgent: dto.userAgent ?? null,
        },
      })
    }
  }
}
