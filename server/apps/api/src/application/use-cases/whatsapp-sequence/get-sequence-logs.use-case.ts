import { Injectable, Inject } from '@nestjs/common';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';

export interface GetSequenceLogsQuery {
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class GetSequenceLogsUseCase {
  constructor(
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
  ) {}

  async execute(query: GetSequenceLogsQuery) {
    const skip = (query.page - 1) * query.limit;
    
    const result = await this.sequenceRepository.findAll({
      skip,
      take: query.limit,
      status: query.status,
    });

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(result.total / query.limit),
      }
    };
  }
}
