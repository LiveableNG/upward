import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'

@Injectable()
export class DeletePmLetterheadUseCase {
  constructor(
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
  ) {}

  async execute(pmId: number, letterheadId: number) {
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pmId) {
      throw new NotFoundException('Letterhead not found')
    }

    await this.letterheadRepo.delete(letterheadId)
  }
}
