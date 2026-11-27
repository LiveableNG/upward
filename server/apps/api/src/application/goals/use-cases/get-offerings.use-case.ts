import { Inject, Injectable, Optional } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  Offering,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { applyVoucherPricingToOffering } from '../../../domains/vouchers/voucher-pricing.helper'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { OfferingQueryDto } from '../dto/offering.dto'

@Injectable()
export class GetOfferingsUseCase {
  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
    @Optional()
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo?: VoucherRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(
    query?: OfferingQueryDto,
    userUuid?: string,
  ): Promise<{ items: Offering[]; total: number }> {
    const status = query?.status ?? 'PUBLISHED'
    const result = await this.offeringRepo.findOfferings({
      goalId: query?.goalId,
      type: query?.type,
      status,
      vendorId: query?.vendorId,
      isFeatured: query?.isFeatured,
      isPromoted: query?.isPromoted,
      minPrice: query?.minPrice,
      maxPrice: query?.maxPrice,
      search: query?.search,
      excludePackageComponents: true,
      skip: query?.skip ?? 0,
      take: query?.take ?? 20,
    })

    // Sanitize vendor details while keeping honest base catalog pricing.
    // Vouchers are opt-in and applied explicitly at checkout / service quote payment.
    result.items = result.items.map((item) => {
      if (item.vendor) {
        item.vendor = {
          id: item.vendor.id,
          uuid: item.vendor.uuid,
          name: item.vendor.name,
          slug: item.vendor.slug,
          logoUrl: item.vendor.logoUrl,
          rating: item.vendor.rating,
          isActive: item.vendor.isActive,
          defaultDeliveryCoverage: item.vendor.defaultDeliveryCoverage,
          defaultDeliveryZones: item.vendor.defaultDeliveryZones,
        }
      }
      return item
    })

    return result
  }
}

