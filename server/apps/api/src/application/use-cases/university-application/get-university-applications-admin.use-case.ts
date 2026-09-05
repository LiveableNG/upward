import { Inject, Injectable } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
  ApplicationStats,
} from '../../../domains/university-application/university-application.repository'
import { UniversityApplication } from '../../../domains/university-application/university-application.entity'

@Injectable()
export class GetUniversityApplicationStatsUseCase {
  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
  ) {}

  async execute(): Promise<ApplicationStats> {
    return this.applicationRepo.getStats()
  }
}

export interface GetUniversityApplicationsQuery {
  page?: number
  limit?: number
  status?: string
  feeStatus?: string
  search?: string
}

@Injectable()
export class GetUniversityApplicationsUseCase {
  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
  ) {}

  async execute(query: GetUniversityApplicationsQuery): Promise<{
    data: UniversityApplication[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const page = query.page || 1
    const limit = query.limit || 50
    const offset = (page - 1) * limit

    const { applications, total } = await this.applicationRepo.findAll({
      status: query.status,
      feeStatus: query.feeStatus,
      search: query.search,
      limit,
      offset,
    })

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

export interface UpdateUniversityApplicationStatusCommand {
  id: string
  status?: any
  feeStatus?: any
  paymentRef?: string
  notes?: string
}

@Injectable()
export class UpdateUniversityApplicationStatusUseCase {
  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
  ) {}

  async execute(command: UpdateUniversityApplicationStatusCommand): Promise<UniversityApplication> {
    const existing = await this.applicationRepo.findById(command.id)
    if (!existing) {
      throw new Error(`University application with ID ${command.id} not found`)
    }

    const currentProps = existing.toObject()

    const updated = UniversityApplication.restore({
      ...currentProps,
      status: command.status !== undefined ? command.status : currentProps.status,
      feeStatus: command.feeStatus !== undefined ? command.feeStatus : currentProps.feeStatus,
      paymentRef: command.paymentRef !== undefined ? command.paymentRef : currentProps.paymentRef,
      notes: command.notes !== undefined ? command.notes : currentProps.notes,
      updatedAt: new Date(),
    })

    return this.applicationRepo.save(updated)
  }
}

@Injectable()
export class DeleteUniversityApplicationUseCase {
  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
  ) {}

  async execute(id: string): Promise<boolean> {
    const existing = await this.applicationRepo.findById(id)
    if (!existing) {
      throw new Error(`University application with ID ${id} not found`)
    }
    return this.applicationRepo.delete(id)
  }
}
