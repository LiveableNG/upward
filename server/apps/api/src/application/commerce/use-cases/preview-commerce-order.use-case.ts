import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import {
  CommercePricingEngine,
  PriceableItemInput,
  PriceableOffering,
} from '../../../domains/commerce/commerce-pricing.engine'
import { PreviewCommerceOrderDto } from '../dto/preview-commerce-order.dto'

export interface PreviewCommerceOrderResponse {
  currency: string
  itemsSubtotalKobo: string
  deliveryFeeKobo: string
  taxKobo: string
  discountKobo: string
  totalAmountKobo: string
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
  ) {}

  async execute(dto: PreviewCommerceOrderDto): Promise<PreviewCommerceOrderResponse> {
    const priceableItems: PriceableItemInput[] = []

    for (const item of dto.items) {
      const offering = await this.offeringRepo.findOfferingById(item.offeringId)
      if (!offering) {
        throw new NotFoundException(`Offering with ID ${item.offeringId} not found`)
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

    const discountKobo = dto.discountKobo ? BigInt(dto.discountKobo) : 0n

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
