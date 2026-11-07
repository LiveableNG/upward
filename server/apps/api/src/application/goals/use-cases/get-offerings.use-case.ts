import { Inject, Injectable } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  Offering,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import { OfferingQueryDto } from '../dto/offering.dto'

@Injectable()
export class GetOfferingsUseCase {
  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
  ) {}

  async execute(query?: OfferingQueryDto): Promise<{ items: Offering[]; total: number }> {
    const status = query?.status ?? 'PUBLISHED'
    const result = await this.offeringRepo.findOfferings({
      goalId: query?.goalId,
      type: query?.type,
      status,
      vendorId: query?.vendorId,
      isFeatured: query?.isFeatured,
      minPrice: query?.minPrice,
      maxPrice: query?.maxPrice,
      search: query?.search,
      skip: query?.skip ?? 0,
      take: query?.take ?? 20,
    })

    // Sanitize vendor details for customer-facing privacy
    result.items.forEach((item) => {
      if (item.vendor) {
        item.vendor = {
          id: item.vendor.id,
          uuid: item.vendor.uuid,
          name: item.vendor.name,
          slug: item.vendor.slug,
          logoUrl: item.vendor.logoUrl,
          rating: item.vendor.rating,
          isActive: item.vendor.isActive,
        }
      }
    })

    return result
  }
}

