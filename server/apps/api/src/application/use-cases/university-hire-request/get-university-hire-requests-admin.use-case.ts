import { Inject, Injectable } from '@nestjs/common'
import {
  UNIVERSITY_HIRE_REQUEST_REPOSITORY,
  IUniversityHireRequestRepository,
  UniversityHireRequestFilterParams,
  UniversityHireRequestStats,
} from '../../../domains/university-hire-request/university-hire-request.repository'
import { UniversityHireRequestProps } from '../../../domains/university-hire-request/university-hire-request.entity'

export interface GetUniversityHireRequestsAdminResult {
  data: UniversityHireRequestProps[]
  total: number
  stats: UniversityHireRequestStats
}

@Injectable()
export class GetUniversityHireRequestsAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_HIRE_REQUEST_REPOSITORY)
    private readonly hireRequestRepo: IUniversityHireRequestRepository,
  ) {}

  async execute(params: UniversityHireRequestFilterParams): Promise<GetUniversityHireRequestsAdminResult> {
    const [{ data, total }, stats] = await Promise.all([
      this.hireRequestRepo.findAll(params),
      this.hireRequestRepo.getStats(),
    ])

    return {
      data: data.map((r) => r.toObject()),
      total,
      stats,
    }
  }
}
