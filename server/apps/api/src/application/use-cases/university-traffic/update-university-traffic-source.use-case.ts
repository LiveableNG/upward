import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  IUniversityTrafficRepository,
  UNIVERSITY_TRAFFIC_REPOSITORY,
  UpdateUniversityTrafficSourceData,
} from '../../../domains/university-traffic/university-traffic.repository'
import { UniversityTrafficSource } from '../../../domains/university-traffic/university-traffic.entity'

@Injectable()
export class UpdateUniversityTrafficSourceUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(id: string, input: UpdateUniversityTrafficSourceData): Promise<UniversityTrafficSource> {
    const existing = await this.trafficRepo.findSourceById(id)
    if (!existing) {
      throw new NotFoundException('Tracking source not found.')
    }

    return this.trafficRepo.updateSource(id, input)
  }
}

@Injectable()
export class DeleteUniversityTrafficSourceUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.trafficRepo.findSourceById(id)
    if (!existing) {
      throw new NotFoundException('Tracking source not found.')
    }

    await this.trafficRepo.deleteSource(id)
  }
}
