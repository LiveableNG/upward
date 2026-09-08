import { Inject, Injectable } from '@nestjs/common'
import {
  IUniversityTrafficRepository,
  UNIVERSITY_TRAFFIC_REPOSITORY,
  TrafficStatsOverview,
} from '../../../domains/university-traffic/university-traffic.repository'
import {
  UniversityTrafficSource,
  UniversityTrafficVisit,
} from '../../../domains/university-traffic/university-traffic.entity'

export interface GetSourcesQuery {
  page?: number
  limit?: number
  search?: string
  channel?: string
  isActive?: boolean
}

@Injectable()
export class GetUniversityTrafficSourcesAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(query: GetSourcesQuery): Promise<{
    data: UniversityTrafficSource[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    return this.trafficRepo.listSources(query)
  }
}

@Injectable()
export class GetUniversityTrafficStatsAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(): Promise<TrafficStatsOverview> {
    return this.trafficRepo.getStatsOverview()
  }
}

@Injectable()
export class GetUniversitySourceVisitsAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(sourceId: string, limit = 50): Promise<UniversityTrafficVisit[]> {
    return this.trafficRepo.listVisitsForSource(sourceId, limit)
  }
}
