import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'

@Injectable()
export class SetDefaultPmLetterheadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
  ) {}

  async execute(pmId: number, letterheadId: number) {
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pmId) {
      throw new NotFoundException('Letterhead not found')
    }

    await this.prisma.upward_pm_letterhead.updateMany({
      where: { pmId },
      data: { isDefault: false },
    })

    return this.letterheadRepo.update(letterheadId, { isDefault: true })
  }
}
