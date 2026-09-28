import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  UNIVERSITY_HIRE_REQUEST_REPOSITORY,
  IUniversityHireRequestRepository,
} from '../../../domains/university-hire-request/university-hire-request.repository'

export interface DeleteUniversityHireRequestAdminDto {
  id: string
}

@Injectable()
export class DeleteUniversityHireRequestAdminUseCase {
  constructor(
    @Inject(UNIVERSITY_HIRE_REQUEST_REPOSITORY)
    private readonly hireRequestRepo: IUniversityHireRequestRepository,
  ) {}

  async execute(dto: DeleteUniversityHireRequestAdminDto): Promise<void> {
    const existing = await this.hireRequestRepo.findById(dto.id)
    if (!existing) {
      throw new NotFoundException(`Hire request with ID ${dto.id} not found`)
    }

    await this.hireRequestRepo.delete(dto.id)
  }
}
