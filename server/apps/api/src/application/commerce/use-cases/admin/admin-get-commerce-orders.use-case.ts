import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
  CommerceVendorSuborder,
} from '../../../../domains/commerce/commerce-order.repository'
import {
  AdminCommerceOrderSummaryDto,
  AdminGetCommerceOrdersFilterDto,
} from '../../dto/admin-commerce.dto'

@Injectable()
export class AdminGetCommerceOrdersUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  async execute(filter: AdminGetCommerceOrdersFilterDto): Promise<{
    items: AdminCommerceOrderSummaryDto[]
    total: number
    skip: number
    take: number
  }> {
    const skip = filter.skip ?? 0
    const take = filter.take ?? 50
    const startDate = filter.startDate ? new Date(filter.startDate) : undefined
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined

    const { items, total } = await this.orderRepo.findAdminOrders({
      status: filter.status,
      paymentStatus: filter.paymentStatus,
      vendorId: filter.vendorId,
      search: filter.search,
      startDate,
      endDate,
      skip,
      take,
    })

    return {
      items: items.map((o: CommerceOrder) => this.mapToAdminSummary(o)),
      total,
      skip,
      take,
    }
  }

  private mapToAdminSummary(order: CommerceOrder): AdminCommerceOrderSummaryDto {
    const subOrders = order.subOrders || []
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
      recipientName: order.recipientName || '',
      recipientPhone: order.recipientPhone || '',
      deliveryAddress: order.deliveryAddress || '',
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      customer: {
        id: order.user?.id || order.userId,
        uuid: order.user?.uuid || '',
        email: order.user?.email || '',
        firstName: order.user?.firstName,
        lastName: order.user?.lastName,
        phone: order.user?.phone,
      },
      subOrdersCount: subOrders.length,
      subOrders: subOrders.map((sub: CommerceVendorSuborder) => ({
        id: sub.id,
        uuid: sub.uuid,
        subOrderNumber: sub.subOrderNumber,
        vendorName: sub.vendor?.name || 'Vendor',
        vendor: sub.vendor
          ? {
              id: sub.vendor.id,
              name: sub.vendor.name,
              slug: sub.vendor.slug,
              email: sub.vendor.email,
              phone: sub.vendor.phone,
            }
          : undefined,
        customerStatus: sub.customerStatus,
        operationalStatus: sub.operationalStatus,
        carrierName: sub.carrierName,
        trackingNumber: sub.trackingNumber,
        trackingUrl: sub.trackingUrl,
        serviceScheduledAt: sub.serviceScheduledAt,
        serviceWindowNotes: sub.serviceWindowNotes,
        technicianName: sub.technicianName,
        technicianPhone: sub.technicianPhone,
        adminOperationalNotes: sub.adminOperationalNotes,
        subtotalKobo: sub.subtotalKobo.toString(),
        deliveryFeeKobo: sub.deliveryFeeKobo?.toString() || '0',
        platformFeeKobo: sub.platformFeeKobo?.toString() || '0',
        vendorPayoutKobo: sub.vendorPayoutKobo.toString(),
        items: (sub.items || []).map((it) => ({
          id: it.id,
          uuid: it.uuid,
          offeringId: it.offeringId,
          offeringType: it.offeringType,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo.toString(),
          totalPriceKobo: it.totalPriceKobo.toString(),
          snapshotData: (it.snapshotData as Record<string, any>) || {},
        })),
      })),
      createdAt: order.createdAt || new Date(),
      updatedAt: order.updatedAt || new Date(),
    }
  }
}
