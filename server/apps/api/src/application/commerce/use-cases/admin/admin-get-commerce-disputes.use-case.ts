import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_REFUND_REPOSITORY,
  CommerceRefundRepository,
  DisputeStatus,
} from '../../../../domains/commerce/commerce-refund.repository'

export interface AdminGetCommerceDisputesFilter {
  status?: DisputeStatus
  skip?: number
  take?: number
}

@Injectable()
export class AdminGetCommerceDisputesUseCase {
  constructor(
    @Inject(COMMERCE_REFUND_REPOSITORY)
    private readonly refundRepo: CommerceRefundRepository,
  ) {}

  async execute(filter?: AdminGetCommerceDisputesFilter) {
    const skip = filter?.skip ? Number(filter.skip) : 0
    const take = filter?.take ? Number(filter.take) : 50
    return this.refundRepo.findDisputes({
      status: filter?.status,
      skip,
      take,
    })
  }
}
