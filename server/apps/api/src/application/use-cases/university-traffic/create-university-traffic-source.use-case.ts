import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import {
  IUniversityTrafficRepository,
  UNIVERSITY_TRAFFIC_REPOSITORY,
  CreateUniversityTrafficSourceData,
} from '../../../domains/university-traffic/university-traffic.repository'
import { UniversityTrafficSource } from '../../../domains/university-traffic/university-traffic.entity'

@Injectable()
export class CreateUniversityTrafficSourceUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(input: CreateUniversityTrafficSourceData): Promise<UniversityTrafficSource> {
    const slugRegex = /^[a-z0-9-_]+$/i
    const normalized = input.identifier.trim().toLowerCase()

    if (!slugRegex.test(normalized)) {
      throw new BadRequestException('Identifier must contain only letters, numbers, hyphens, and underscores.')
    }

    const existing = await this.trafficRepo.findSourceByIdentifier(normalized)
    if (existing) {
      throw new BadRequestException(`A tracking source with identifier '${normalized}' already exists.`)
    }

    return this.trafficRepo.createSource({
      ...input,
      identifier: normalized,
    })
  }
}
