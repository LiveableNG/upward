import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  UNIVERSITY_HIRE_REQUEST_REPOSITORY,
  IUniversityHireRequestRepository,
} from '../../../domains/university-hire-request/university-hire-request.repository'
import { UniversityHireRequestProps } from '../../../domains/university-hire-request/university-hire-request.entity'

export interface UpdateUniversityHireRequestAdminDto {
  id: string
  status?: string
  notes?: string
}

@Injectable()
export class UpdateUniversityHireRequestAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_HIRE_REQUEST_REPOSITORY)
    private readonly hireRequestRepo: IUniversityHireRequestRepository,
  ) {}

  async execute(dto: UpdateUniversityHireRequestAdminDto): Promise<UniversityHireRequestProps> {
    const existing = await this.hireRequestRepo.findById(dto.id)
    if (!existing) {
      throw new NotFoundException(`Hire request with ID ${dto.id} not found`)
    }

    if (dto.status !== undefined || dto.notes !== undefined) {
      existing.updateStatus(dto.status ?? existing.status, dto.notes)
    }

    const updated = await this.hireRequestRepo.update(existing)
    return updated.toObject()
  }
}
