import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { TenantOrderDetailDto } from '../dto/tenant-commerce-order.dto'

@Injectable()
export class GetTenantOrderDetailUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userIdentifier: number | string, orderUuid: string): Promise<TenantOrderDetailDto> {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) {
        throw new NotFoundException(`Order '${orderUuid}' not found`)
      }
      resolvedUserId = user.id
    }

    const order = await this.orderRepo.findOrderByUuid(orderUuid)

    // Strict tenant isolation: one tenant cannot view another tenant's order
    if (!order || order.userId !== resolvedUserId) {
      throw new NotFoundException(`Order '${orderUuid}' not found`)
    }

    return this.mapToTenantOrderDetail(order)
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
        adminOperationalNotes: sub.adminOperationalNotes,
        deliveredAt: sub.deliveredAt,
        tenantConfirmedAt: sub.tenantConfirmedAt,
        coolingPeriodEndsAt: sub.coolingPeriodEndsAt,
        vendorName: sub.vendor?.name || 'Vendor',
        vendor: {
          id: sub.vendor?.id || sub.vendorId,
          uuid: sub.vendor?.uuid || '',
          name: sub.vendor?.name || 'Vendor',
          slug: sub.vendor?.slug || '',
          logoUrl: sub.vendor?.logoUrl,
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
