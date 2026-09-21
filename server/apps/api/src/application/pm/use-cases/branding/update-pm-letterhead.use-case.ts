import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'

@Injectable()
export class UpdatePmLetterheadUseCase {
  constructor(
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
  ) {}

  async execute(pmId: number, letterheadId: number, templateConfig: any) {
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pmId) {
      throw new NotFoundException('Letterhead not found')
    }

    return this.letterheadRepo.update(letterheadId, {
      templateConfig,
    })
  }
}
