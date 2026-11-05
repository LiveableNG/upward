import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
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
  ) {}

  async execute(
    userId: number,
    filter: GetTenantOrdersFilterDto,
  ): Promise<GetTenantOrdersResponse> {
    const skip = filter.skip ?? 0
    const take = filter.take ?? 20

    const { items, total } = await this.orderRepo.findOrdersByUserId(userId, {
      skip,
      take,
      status: filter.status,
    })

    return {
      items: items.map((order) => this.mapToTenantSummary(order)),
      total,
      skip,
      take,
    }
  }

  private mapToTenantSummary(order: CommerceOrder): TenantOrderSummaryDto {
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
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      deliveryAddress: order.deliveryAddress,
      subOrderCount: subOrders.length,
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
