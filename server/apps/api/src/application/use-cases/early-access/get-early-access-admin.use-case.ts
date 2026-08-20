import { Inject, Injectable } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
  EarlyAccessStats,
} from '../../../domains/early-access/early-access.repository'

export interface GetEarlyAccessEntriesQuery {
  type?: string
  search?: string
  page?: number
  limit?: number
}

@Injectable()
export class GetEarlyAccessStatsUseCase {
  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
  ) {}

  async execute(): Promise<EarlyAccessStats> {
    return await this.earlyAccessRepo.getStats()
  }
}

@Injectable()
export class GetEarlyAccessEntriesUseCase {
  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
  ) {}

  async execute(query: GetEarlyAccessEntriesQuery) {
    const page = Math.max(1, query.page || 1)
    const limit = Math.max(1, query.limit || 50)
    const offset = (page - 1) * limit

    const { entries, total } = await this.earlyAccessRepo.findAll({
      type: query.type,
      search: query.search,
      limit,
      offset,
    })

    return {
      data: entries.map((entry) => entry.toObject()),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
