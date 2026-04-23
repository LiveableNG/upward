import { Inject, Injectable } from '@nestjs/common'
import { IWebhookRepository, WEBHOOK_REPOSITORY } from '../../../domains/payments/payment.repository'

@Injectable()
export class GetWebhookLogsUseCase {
  constructor(
    @Inject(WEBHOOK_REPOSITORY)
    private readonly webhookRepo: IWebhookRepository,
  ) {}

  async execute(query: {
    page?: number
    limit?: number
    search?: string
    status?: string
  }) {
    const { page = 1, limit = 10, search, status } = query
    
    const { logs, total } = await this.webhookRepo.findAll({
      page,
      limit,
      search,
      status,
    })

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
