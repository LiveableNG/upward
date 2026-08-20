import { Inject, Injectable } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'

export interface SubmitStudentEarlyAccessCommand {
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  experienceLevel: string
  interest?: string
}

@Injectable()
export class SubmitStudentEarlyAccessUseCase {
  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
  ) {}

  async execute(command: SubmitStudentEarlyAccessCommand): Promise<EarlyAccessEntry> {
    const entry = EarlyAccessEntry.create({
      type: 'STUDENT',
      name: command.name,
      whatsapp: command.whatsapp,
      email: command.email,
      city: command.city,
      ageBracket: command.ageBracket,
      experienceLevel: command.experienceLevel,
      interest: command.interest,
    })

    return await this.earlyAccessRepo.save(entry)
  }
}
