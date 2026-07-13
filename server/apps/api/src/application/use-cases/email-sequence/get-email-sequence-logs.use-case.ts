import { Injectable, Inject } from '@nestjs/common'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
  EmailSequenceLog,
} from '../../../domains/email-sequence/email-sequence.repository.interface'

export interface GetEmailSequenceLogsQuery {
  status?: string
  stage?: string
  email?: string
}

@Injectable()
export class GetEmailSequenceLogsUseCase {
  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
  ) {}

  async execute(query: GetEmailSequenceLogsQuery): Promise<EmailSequenceLog[]> {
    return this.sequenceRepository.findAll({
      status: query.status,
      stage: query.stage,
      email: query.email,
    })
  }
}
