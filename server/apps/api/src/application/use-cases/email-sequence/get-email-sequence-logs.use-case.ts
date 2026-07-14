import { Injectable, Inject } from '@nestjs/common'
import {
  IEmailSequenceRepository,
  EMAIL_SEQUENCE_REPOSITORY,
  EmailSequenceLog,
} from '../../../domains/email-sequence/email-sequence.repository.interface'

import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface GetEmailSequenceLogsQuery {
  page: number
  limit: number
  status?: string
  stage: string
  email?: string
}

@Injectable()
export class GetEmailSequenceLogsUseCase {
  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(query: GetEmailSequenceLogsQuery) {
    const skip = (query.page - 1) * query.limit;

    const [result, stats] = await Promise.all([
      this.sequenceRepository.findAll({
        skip,
        take: query.limit,
        status: query.status,
        stage: query.stage,
        email: query.email,
      }),
      this.sequenceRepository.getStats(query.stage),
    ]);

    // Decrypt user details
    const data = result.data.map((log) => {
      if (log.user) {
        log.user.firstName = this.encryptionService.decrypt(log.user.firstName || '');
        log.user.lastName = this.encryptionService.decrypt(log.user.lastName || '');
        log.user.email = this.encryptionService.decrypt(log.user.email || '');
        log.user.phone = this.encryptionService.decrypt(log.user.phone || '');
      }
      return log;
    });

    return {
      data,
      stats,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      }
    };
  }
}
