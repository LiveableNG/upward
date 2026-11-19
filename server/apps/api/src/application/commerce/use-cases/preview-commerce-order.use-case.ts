import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  REWARDS_REPOSITORY,
  RewardsRepository,
} from '../../../domains/rewards/rewards.repository'
import {
  CommercePricingEngine,
  PriceableItemInput,
  PriceableOffering,
} from '../../../domains/commerce/commerce-pricing.engine'
import { DeliveryZoneResolver } from '../../../domains/commerce/delivery-zone.resolver'
import { PreviewCommerceOrderDto } from '../dto/preview-commerce-order.dto'

export interface PreviewCommerceOrderResponse {
  currency: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  taxKobo: string
  discountKobo: string
  availableVoucherBalanceKobo?: string
  appliedVoucherDiscountKobo?: string
  totalAmountKobo: string
  deliveryEligible?: boolean
  deliveryMessage?: string
  subOrders: Array<{
    vendorId: number
    vendorName: string
    vendorSlug: string
    subtotalKobo: string
    deliveryFeeKobo: string
    allocatedDiscountKobo: string
    itemCount: number
    items: Array<{
      offeringId: number
      title: string
      type: string
      quantity: number
      unitPriceKobo: string
      totalPriceKobo: string
      leadTimeDays: number | null
      deliveryAvailable: boolean
    }>
  }>
}

@Injectable()
export class PreviewCommerceOrderUseCase {
  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
    @Optional()
    @Inject(REWARDS_REPOSITORY)
    private readonly rewardsRepo?: RewardsRepository,
  ) {}

  async execute(
    dto: PreviewCommerceOrderDto,
    userIdentifier?: number | string,
  ): Promise<PreviewCommerceOrderResponse> {
    const priceableItems: PriceableItemInput[] = []

    for (const item of dto.items) {
      const offering = item.offeringUuid
        ? await this.offeringRepo.findOfferingByUuid(item.offeringUuid)
        : item.offeringId
        ? await this.offeringRepo.findOfferingById(item.offeringId)
        : null

      if (!offering) {
        throw new NotFoundException(
          `Offering '${item.offeringUuid || item.offeringId}' not found`,
        )
      }

      const priceableOffering: PriceableOffering = {
        id: offering.id!,
        uuid: offering.uuid,
        vendorId: offering.vendorId,
        type: offering.type,
        pricingModel: offering.pricingModel,
        title: offering.title,
        subtitle: offering.subtitle,
        description: offering.description,
        currency: offering.currency,
        price: offering.price,
        inStock: offering.inStock,
        stockCount: offering.stockCount,
        deliveryAvailable: offering.deliveryAvailable,
        deliveryCoverageType: offering.deliveryCoverageType,
        deliveryZones: offering.deliveryZones,
        leadTimeDays: offering.leadTimeDays,
        status: offering.status,
        vendor: offering.vendor,
        packageItems: offering.packageItems?.map((pi) => ({
          componentId: pi.componentId,
          componentUuid: pi.component?.uuid,
          componentTitle: pi.component?.title || `Component ${pi.componentId}`,
          quantity: pi.quantity,
          overridePrice: pi.overridePrice,
          vendorId: pi.component?.vendorId,
        })),
      }

      priceableItems.push({
        offering: priceableOffering,
        quantity: item.quantity,
      })
    }

    // Evaluate deliverability if deliveryAddress is supplied
    let deliveryEligible = true
    let deliveryMessage: string | undefined = undefined

    if (dto.deliveryAddress || dto.deliveryZoneTag) {
      for (const item of priceableItems) {
        const check = DeliveryZoneResolver.validateOfferingDelivery(
          item.offering,
          dto.deliveryAddress || '',
          dto.deliveryZoneTag,
        )
        if (!check.isDeliverable) {
          deliveryEligible = false
          deliveryMessage = check.reason
          break
        }
      }
    }

    const manualDiscountKobo = dto.discountKobo ? BigInt(dto.discountKobo) : 0n
    let availableVoucherBalanceKobo = 0n
    let appliedVoucherDiscountKobo = 0n

    const baselinePricing = CommercePricingEngine.calculateOrderPricing({
      items: priceableItems,
      totalDiscountKobo: 0n,
    })

    if (userIdentifier && this.rewardsRepo) {
      let resolvedUserId: number | undefined
      if (typeof userIdentifier === 'number') {
        resolvedUserId = userIdentifier
      } else if (this.userRepo) {
        const user = await this.userRepo.findByUuid(String(userIdentifier))
        resolvedUserId = user?.id
      }
      if (resolvedUserId) {
        availableVoucherBalanceKobo =
          await this.rewardsRepo.getAvailableVoucherBalanceKobo(resolvedUserId)
        if (dto.applyVoucher !== false && availableVoucherBalanceKobo > 0n) {
          const maxApplicable =
            baselinePricing.itemsSubtotalKobo > manualDiscountKobo
              ? baselinePricing.itemsSubtotalKobo - manualDiscountKobo
              : 0n
          appliedVoucherDiscountKobo =
            availableVoucherBalanceKobo <= maxApplicable
              ? availableVoucherBalanceKobo
              : maxApplicable
        }
      }
    }

    const discountKobo = manualDiscountKobo + appliedVoucherDiscountKobo

    // Calculate using the shared deterministic pricing engine
    const pricing = CommercePricingEngine.calculateOrderPricing({
      items: priceableItems,
      totalDiscountKobo: discountKobo,
    })

    return {
      currency: pricing.currency,
      itemsSubtotalKobo: pricing.itemsSubtotalKobo.toString(),
      deliveryFeeKobo: pricing.deliveryFeeKobo.toString(),
      taxKobo: pricing.taxKobo.toString(),
      discountKobo: pricing.discountKobo.toString(),
      availableVoucherBalanceKobo: availableVoucherBalanceKobo.toString(),
      appliedVoucherDiscountKobo: appliedVoucherDiscountKobo.toString(),
      totalAmountKobo: pricing.totalAmountKobo.toString(),
      deliveryEligible,
      deliveryMessage,
      subOrders: pricing.subOrders.map((sub) => ({
        vendorId: sub.vendorId,
        vendorName: sub.vendor.name,
        vendorSlug: sub.vendor.slug,
        subtotalKobo: sub.subtotalKobo.toString(),
        deliveryFeeKobo: sub.deliveryFeeKobo.toString(),
        allocatedDiscountKobo: sub.allocatedDiscountKobo.toString(),
        itemCount: sub.items.length,
        items: sub.items.map((it) => ({
          offeringId: it.offeringId,
          title: it.snapshotData.title,
          type: it.offeringType,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo.toString(),
          totalPriceKobo: it.totalPriceKobo.toString(),
          leadTimeDays: it.snapshotData.leadTimeDays,
          deliveryAvailable: it.snapshotData.deliveryAvailable,
        })),
      })),
    }
  }
}
