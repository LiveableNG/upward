import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  GetTenantOrdersFilterDto,
  TenantOrderSummaryDto,
} from '../dto/tenant-commerce-order.dto'

export interface GetTenantOrdersResponse {
  items: TenantOrderSummaryDto[]
  total: number
  skip: number
  take: number
}

@Injectable()
export class GetTenantOrdersUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(
    userIdentifier: number | string,
    filter: GetTenantOrdersFilterDto,
  ): Promise<GetTenantOrdersResponse> {
    let resolvedUserId: number
    if (typeof userIdentifier === 'number') {
      resolvedUserId = userIdentifier
    } else {
      const user = await this.userRepo.findByUuid(userIdentifier)
      if (!user?.id) {
        throw new UnauthorizedException('User not found')
      }
      resolvedUserId = user.id
    }

    const skip = filter.skip ?? 0
    const take = filter.take ?? 20

    const { items, total } = await this.orderRepo.findOrdersByUserId(resolvedUserId, {
      skip,
      take,
      status: filter.status,
    })

    const mapped = items.map((order) => this.mapToTenantSummary(order))
    return {
      items: mapped,
      orders: mapped,
      total,
      skip,
      take,
    } as any
  }

  private mapToTenantSummary(order: CommerceOrder): TenantOrderSummaryDto {
    const subOrders = order.subOrders || []

    const allItems: Array<{
      title: string
      thumbnailUrl?: string | null
      offeringType: string
      quantity: number
    }> = []

    for (const sub of subOrders) {
      if (Array.isArray(sub.items)) {
        for (const it of sub.items) {
          allItems.push({
            title: it.snapshotData?.title || 'Lifestyle Item',
            thumbnailUrl:
              it.snapshotData?.media?.[0]?.url ||
              it.snapshotData?.thumbnailUrl ||
              null,
            offeringType: it.offeringType || 'PRODUCT',
            quantity: it.quantity || 1,
          })
        }
      }
    }

    let primaryStatus: any = 'ORDER_CONFIRMED'
    if (subOrders.length > 0) {
      const statuses = subOrders.map((s) => s.customerStatus)
      if (statuses.some((s) => s === 'DISPUTED')) {
        primaryStatus = 'DISPUTED'
      } else if (
        statuses.every((s) =>
          ['DELIVERED', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(s),
        )
      ) {
        primaryStatus = statuses[0]
      } else {
        const activePriority = [
          'OUT_FOR_DELIVERY',
          'TECHNICIAN_EN_ROUTE',
          'DISPATCHED',
          'SERVICE_SCHEDULED',
          'PROCESSING',
          'ORDER_CONFIRMED',
        ]
        const found = activePriority.find((p) => statuses.includes(p as any))
        if (found) primaryStatus = found
      }
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
      subOrderCount: subOrders.length,
      subOrdersCount: subOrders.length,
      itemsCount: allItems.reduce((acc, it) => acc + (it.quantity || 1), 0),
      itemsPreview: allItems,
      primaryStatus,
      createdAt: order.createdAt || new Date(),
      subOrders: subOrders.map((sub) => ({
        uuid: sub.uuid,
        subOrderNumber: sub.subOrderNumber,
        customerStatus: sub.customerStatus,
        vendorName: sub.vendor?.name || 'Vendor',
        vendorSlug: sub.vendor?.slug || '',
        itemCount: sub.items?.length || 0,
      })),
    }
  }
}
