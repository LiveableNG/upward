import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  Offering,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'

@Injectable()
export class GetOfferingDetailUseCase {
  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
  ) {}

  async execute(identifier: string): Promise<Offering> {
    let offering: Offering | null = null

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      offering = await this.offeringRepo.findOfferingByUuid(identifier)
    } else if (!isNaN(Number(identifier))) {
      offering = await this.offeringRepo.findOfferingById(Number(identifier))
    }

    if (!offering) {
      throw new NotFoundException(`Offering '${identifier}' not found`)
    }

    return offering
  }
}

