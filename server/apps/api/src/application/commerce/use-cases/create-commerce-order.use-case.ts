import {
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
  OFFERING_REPOSITORY,
  OfferingRepository,
} from '../../../domains/goals/offering.repository'
import {
  CommercePricingEngine,
  PriceableItemInput,
  PriceableOffering,
} from '../../../domains/commerce/commerce-pricing.engine'
import { CreateCommerceOrderDto } from '../dto/create-commerce-order.dto'
import { TenantOrderDetailDto } from '../dto/tenant-commerce-order.dto'

export interface CreateCommerceOrderResponse {
  message: string
  order: TenantOrderDetailDto
  paymentRequired: boolean
  paymentReference: string
}

@Injectable()
export class CreateCommerceOrderUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
  ) {}

  async execute(userId: number, dto: CreateCommerceOrderDto): Promise<CreateCommerceOrderResponse> {
    // 1. Idempotency Check
    const paymentReference = dto.idempotencyKey
      ? `UPW_ORD_${dto.idempotencyKey.trim()}`
      : `UPW_ORD_${randomUUID()}`

    const existingOrder = await this.orderRepo.findOrderByPaymentReference(paymentReference)
    if (existingOrder) {
      if (existingOrder.userId !== userId) {
        throw new ConflictException('Idempotency key is already in use by another account')
      }
      return {
        message: 'Order already created (idempotent response). Awaiting payment.',
        order: this.mapToTenantOrderDetail(existingOrder),
        paymentRequired: existingOrder.paymentStatus === 'UNPAID',
        paymentReference: existingOrder.paymentReference || paymentReference,
      }
    }

    // 2. Authoritative database fetch of offerings
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
      userId,
      orderNumber,
      currency: pricing.currency,
      itemsSubtotalKobo: pricing.itemsSubtotalKobo,
      deliveryFeeKobo: pricing.deliveryFeeKobo,
      taxKobo: pricing.taxKobo,
      discountKobo: pricing.discountKobo,
      totalAmountKobo: pricing.totalAmountKobo,
      paymentReference,
      recipientName: dto.recipientName.trim(),
      recipientPhone: dto.recipientPhone.trim(),
      deliveryAddress: dto.deliveryAddress.trim(),
      deliveryNotes: dto.deliveryNotes?.trim(),
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
        const doubleCheck = await this.orderRepo.findOrderByPaymentReference(paymentReference)
        if (doubleCheck) {
          return {
            message: 'Order already created (idempotent response). Awaiting payment.',
            order: this.mapToTenantOrderDetail(doubleCheck),
            paymentRequired: doubleCheck.paymentStatus === 'UNPAID',
            paymentReference: doubleCheck.paymentReference || paymentReference,
          }
        }
      }
      throw err
    }

    return {
      message: 'Order successfully created. Inventory reserved. Proceed to payment verification.',
      order: this.mapToTenantOrderDetail(order),
      paymentRequired: true,
      paymentReference,
    }
  }

  private mapToTenantOrderDetail(order: CommerceOrder): TenantOrderDetailDto {
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
