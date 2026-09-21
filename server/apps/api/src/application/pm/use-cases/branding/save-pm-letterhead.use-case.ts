import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'
import { randomUUID } from 'crypto'

export interface SavePmLetterheadDto {
  pmId: number
  isDefault?: boolean
  pageCount?: number | string
  templateFileKey?: string
  previewFirstPageKey?: string
  previewContinuationPageKey?: string
  templateConfig?: any
}

@Injectable()
export class SavePmLetterheadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
  ) {}

  async execute(dto: SavePmLetterheadDto) {
    const isDefault = dto.isDefault === true

    if (isDefault) {
      await this.prisma.upward_pm_letterhead.updateMany({
        where: { pmId: dto.pmId },
        data: { isDefault: false },
      })
    }

    return this.letterheadRepo.save({
      uuid: randomUUID(),
      pmId: dto.pmId,
      isDefault,
      pageCount: Number(dto.pageCount) || 1,
      templateFileKey: dto.templateFileKey || null,
      previewFirstPageKey: dto.previewFirstPageKey || null,
      previewContinuationPageKey: dto.previewContinuationPageKey || null,
      templateConfig: dto.templateConfig || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}
