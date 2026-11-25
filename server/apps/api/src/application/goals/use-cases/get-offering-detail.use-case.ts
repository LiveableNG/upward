import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'
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

@Injectable()
export class GetOfferingDetailUseCase {
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

  async execute(identifier: string, userUuid?: string): Promise<Offering> {
    let offering: Offering | null = null

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
      offering = await this.offeringRepo.findOfferingByUuid(identifier)
    } else if (!isNaN(Number(identifier))) {
      offering = await this.offeringRepo.findOfferingById(Number(identifier))
    }

    if (!offering) {
      throw new NotFoundException(`Offering '${identifier}' not found`)
    }

    let availableVoucherKobo = 0n
    if (userUuid && this.voucherRepo && this.userRepo) {
      try {
        const user = await this.userRepo.findByUuid(userUuid)
        if (user?.id) {
          availableVoucherKobo = await this.voucherRepo.getAvailableBalanceKobo(user.id)
        }
      } catch {
        // Non-blocking: fall back to base catalog pricing
      }
    }

    offering = applyVoucherPricingToOffering(offering, availableVoucherKobo)

    // Sanitize vendor details for customer-facing privacy
    if (offering.vendor) {
      offering.vendor = {
        id: offering.vendor.id,
        uuid: offering.vendor.uuid,
        name: offering.vendor.name,
        slug: offering.vendor.slug,
        logoUrl: offering.vendor.logoUrl,
        rating: offering.vendor.rating,
        isActive: offering.vendor.isActive,
        defaultDeliveryCoverage: (offering.vendor as any).defaultDeliveryCoverage,
        defaultDeliveryZones: (offering.vendor as any).defaultDeliveryZones,
      }
    }

    return offering
  }
}

