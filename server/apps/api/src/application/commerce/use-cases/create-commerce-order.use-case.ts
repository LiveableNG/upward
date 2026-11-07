import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomBytes, randomUUID } from 'crypto'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
  CreateOrderData,
} from '../../../domains/commerce/commerce-order.repository'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '../../../domains/commerce/commerce-delivery-zone.repository'
import {
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  CommercePricingEngine,
  PriceableItemInput,
  PriceableOffering,
} from '../../../domains/commerce/commerce-pricing.engine'
import { DeliveryZoneResolver } from '../../../domains/commerce/delivery-zone.resolver'
import { CreateCommerceOrderDto } from '../dto/create-commerce-order.dto'
import { TenantOrderDetailDto } from '../dto/tenant-commerce-order.dto'

export interface CreateCommerceOrderResponse {
  message: string
  order: TenantOrderDetailDto
  paymentRequired: boolean
}

@Injectable()
export class CreateCommerceOrderUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(COMMERCE_DELIVERY_ZONE_REPOSITORY)
    private readonly zoneRepo: CommerceDeliveryZoneRepository,
  ) {}

  async execute(userIdentifier: number | string, dto: CreateCommerceOrderDto): Promise<CreateCommerceOrderResponse> {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) {
        throw new NotFoundException('User not found')
      }
      resolvedUserId = user.id
    }

    // 1. Idempotency Check - distinct from payment reference
    const idempotencyKey = dto.idempotencyKey ? dto.idempotencyKey.trim() : null

    if (idempotencyKey) {
      const existingOrder = await this.orderRepo.findOrderByIdempotencyKey(idempotencyKey)
      if (existingOrder) {
        if (existingOrder.userId !== resolvedUserId) {
          throw new ConflictException('Idempotency key is already in use by another account')
        }
        return {
          message: 'Order already created (idempotent response). Awaiting payment.',
          order: this.mapToTenantOrderDetail(existingOrder),
          paymentRequired: existingOrder.paymentStatus === 'UNPAID',
        }
      }
    }

    // 2. Authoritative database fetch of offerings
    const priceableItems: PriceableItemInput[] = []

    // Look up delivery zone if provided to resolve verified delivery fee and status
    let zoneDeliveryFeeKobo = 0n
    if (dto.deliveryZoneTag) {
      const zone = await this.zoneRepo.findByTag(dto.deliveryZoneTag.trim().toUpperCase())
      if (zone) {
        if (!zone.isDelivering) {
          throw new BadRequestException(
            zone.pauseReason || `Delivery is temporarily suspended in ${zone.name}`,
          )
        }
        zoneDeliveryFeeKobo = zone.deliveryFeeKobo
      }
    }

    for (const [i, item] of dto.items.entries()) {
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

      // Validate delivery coverage for physical offerings against recipient address
      const deliveryValidation = DeliveryZoneResolver.validateOfferingDelivery(
        priceableOffering,
        dto.deliveryAddress,
      )
      if (!deliveryValidation.isDeliverable) {
        throw new BadRequestException(deliveryValidation.reason)
      }

      // Apply delivery fee to the first physical item
      const itemDeliveryFee =
        priceableOffering.type === 'SERVICE' || i > 0 ? 0n : zoneDeliveryFeeKobo

      priceableItems.push({
        offering: priceableOffering,
        quantity: item.quantity,
        deliveryFeeKobo: itemDeliveryFee,
      })
    }

    // 3. Recalculate order pricing server-side using shared engine
    const discountKobo = dto.discountKobo ? BigInt(dto.discountKobo) : 0n
    const pricing = CommercePricingEngine.calculateOrderPricing({
      items: priceableItems,
      totalDiscountKobo: discountKobo,
    })

    // 4. Generate orderNumber & subOrderNumbers
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const randomHex = randomBytes(3).toString('hex').toUpperCase()
    const orderNumber = `UPW-ORD-${yearMonth}-${randomHex}`

    // 5. Prepare transactional create order data
    const createOrderData: CreateOrderData = {
      userId: resolvedUserId,
      orderNumber,
      currency: pricing.currency,
      itemsSubtotalKobo: pricing.itemsSubtotalKobo,
      deliveryFeeKobo: pricing.deliveryFeeKobo,
      taxKobo: pricing.taxKobo,
      discountKobo: pricing.discountKobo,
      totalAmountKobo: pricing.totalAmountKobo,
      idempotencyKey: idempotencyKey || undefined,
      paymentReference: undefined,
      recipientName: dto.recipientName.trim(),
      recipientPhone: dto.recipientPhone.trim(),
      deliveryAddress: dto.deliveryAddress.trim(),
      deliveryNotes: dto.deliveryNotes?.trim(),
      deliveryZoneTag: dto.deliveryZoneTag?.trim(),
      subOrders: pricing.subOrders.map((sub, idx) => ({
        vendorId: sub.vendorId,
        subOrderNumber: `${orderNumber}-V${idx + 1}`,
        subtotalKobo: sub.subtotalKobo,
        deliveryFeeKobo: sub.deliveryFeeKobo,
        allocatedDiscountKobo: sub.allocatedDiscountKobo,
        platformFeeKobo: sub.platformFeeKobo,
        vendorPayoutKobo: sub.vendorPayoutKobo,
        items: sub.items.map((it) => ({
          offeringId: it.offeringId,
          offeringType: it.offeringType,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo,
          totalPriceKobo: it.totalPriceKobo,
          snapshotData: it.snapshotData,
        })),
      })),
    }

    // 6. Persist order with atomic inventory decrement & audit log
    let order: CommerceOrder
    try {
      order = await this.orderRepo.createOrder(createOrderData)
    } catch (err: any) {
      // In case of race conditions with the exact same idempotency key
      if (err.code === 'P2002' || err.message?.includes('Unique constraint')) {
        if (idempotencyKey) {
          const doubleCheck = await this.orderRepo.findOrderByIdempotencyKey(idempotencyKey)
          if (doubleCheck) {
            return {
              message: 'Order already created (idempotent response). Awaiting payment.',
              order: this.mapToTenantOrderDetail(doubleCheck),
              paymentRequired: doubleCheck.paymentStatus === 'UNPAID',
            }
          }
        }
      }
      throw err
    }

    return {
      message: 'Order successfully created. Inventory reserved. Proceed to payment verification.',
      order: this.mapToTenantOrderDetail(order),
      paymentRequired: true,
    }
  }

  private mapToTenantOrderDetail(order: CommerceOrder): TenantOrderDetailDto {
    if (!order) {
      throw new NotFoundException('Order record could not be loaded')
    }
    return {
      id: order.id!,
      uuid: order.uuid,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      itemsSubtotalKobo: order.itemsSubtotalKobo.toString(),
      deliveryFeeKobo: order.deliveryFeeKobo.toString(),
      taxKobo: order.taxKobo.toString(),
      discountKobo: order.discountKobo.toString(),
      totalAmountKobo: order.totalAmountKobo.toString(),
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      createdAt: order.createdAt || new Date(),
      subOrders: (order.subOrders || []).map((sub) => ({
        uuid: sub.uuid,
        subOrderNumber: sub.subOrderNumber,
        customerStatus: sub.customerStatus,
        subtotalKobo: sub.subtotalKobo.toString(),
        deliveryFeeKobo: sub.deliveryFeeKobo.toString(),
        allocatedDiscountKobo: sub.allocatedDiscountKobo.toString(),
        carrierName: sub.carrierName,
        trackingNumber: sub.trackingNumber,
        trackingUrl: sub.trackingUrl,
        serviceScheduledAt: sub.serviceScheduledAt,
        serviceWindowNotes: sub.serviceWindowNotes,
        technicianName: sub.technicianName,
        technicianPhone: sub.technicianPhone,
        deliveredAt: sub.deliveredAt,
        tenantConfirmedAt: sub.tenantConfirmedAt,
        coolingPeriodEndsAt: sub.coolingPeriodEndsAt,
        vendor: {
          id: sub.vendor?.id || sub.vendorId,
          uuid: sub.vendor?.uuid || '',
          name: sub.vendor?.name || 'Vendor',
          slug: sub.vendor?.slug || '',
          logoUrl: sub.vendor?.logoUrl,
          phone: sub.vendor?.phone,
          email: sub.vendor?.email,
          rating: sub.vendor?.rating ?? 5.0,
        },
        items: (sub.items || []).map((it) => ({
          uuid: it.uuid,
          offeringId: it.offeringId,
          offeringType: it.offeringType,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo.toString(),
          totalPriceKobo: it.totalPriceKobo.toString(),
          snapshotData: it.snapshotData,
        })),
        fulfilmentEvents: (sub.fulfilmentEvents || [])
          .filter((ev) => ev.isCustomerVisible)
          .map((ev) => ({
            uuid: ev.uuid,
            status: ev.status,
            title: ev.title,
            description: ev.description,
            carrierName: ev.carrierName,
            trackingNumber: ev.trackingNumber,
            serviceDateTime: ev.serviceDateTime,
            createdAt: ev.createdAt || new Date(),
          })),
      })),
    }
  }
}
