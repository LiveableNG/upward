import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
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
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo?: VoucherRepository,
    @Optional()
    @Inject(USER_REPOSITORY)
    private readonly userRepo?: UserRepository,
  ) {}

  async execute(dto: PreviewCommerceOrderDto, userUuid?: string): Promise<PreviewCommerceOrderResponse> {
    const priceableItems: PriceableItemInput[] = []
    let voucherEligibleSubtotalKobo = 0n

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

      if (offering.voucherEligible && offering.price && offering.price > 0) {
        voucherEligibleSubtotalKobo +=
          BigInt(Math.round(offering.price * 100)) * BigInt(item.quantity || 1)
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

    // Compute authoritative server-side voucher discount (never trust client-supplied discountKobo)
    let discountKobo = 0n
    if (voucherEligibleSubtotalKobo > 0n && userUuid && this.voucherRepo && this.userRepo) {
      const user = await this.userRepo.findByUuid(userUuid)
      if (user?.id) {
        const availableVoucherKobo = await this.voucherRepo.getAvailableBalanceKobo(user.id)
        if (availableVoucherKobo > 0n) {
          discountKobo =
            availableVoucherKobo >= voucherEligibleSubtotalKobo
              ? voucherEligibleSubtotalKobo
              : availableVoucherKobo
        }
      }
    }

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
