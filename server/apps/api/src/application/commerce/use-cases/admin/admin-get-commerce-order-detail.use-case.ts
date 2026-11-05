import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
  CommerceVendorSuborder,
  CommerceOrderItem,
  CommerceFulfilmentEvent,
  CommercePaymentAttempt,
  CommerceOrderAudit,
} from '../../../../domains/commerce/commerce-order.repository'
import { AdminCommerceOrderDetailDto } from '../../dto/admin-commerce.dto'

@Injectable()
export class AdminGetCommerceOrderDetailUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  async execute(orderUuid: string): Promise<AdminCommerceOrderDetailDto> {
    const order = await this.orderRepo.findOrderByUuid(orderUuid)
    if (!order) {
      throw new NotFoundException(`Commerce order '${orderUuid}' not found`)
    }

    return this.mapToAdminOrderDetail(order)
  }

  private mapToAdminOrderDetail(order: CommerceOrder): AdminCommerceOrderDetailDto {
    const subOrders = order.subOrders || []
    const paymentAttempts = order.paymentAttempts || []
    const auditLogs = order.auditLogs || []

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
      idempotencyKey: order.idempotencyKey,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      customer: {
        id: order.user?.id || order.userId,
        uuid: order.user?.uuid || '',
        email: order.user?.email || '',
        firstName: order.user?.firstName,
        lastName: order.user?.lastName,
        phone: order.user?.phone,
      },
      subOrders: subOrders.map((sub: CommerceVendorSuborder) => ({
        id: sub.id,
        uuid: sub.uuid,
        subOrderNumber: sub.subOrderNumber,
        customerStatus: sub.customerStatus,
        operationalStatus: sub.operationalStatus,
        subtotalKobo: sub.subtotalKobo.toString(),
        deliveryFeeKobo: sub.deliveryFeeKobo.toString(),
        allocatedDiscountKobo: sub.allocatedDiscountKobo.toString(),
        platformFeeKobo: sub.platformFeeKobo.toString(),
        vendorPayoutKobo: sub.vendorPayoutKobo.toString(),
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
        vendor: {
          id: sub.vendor?.id || sub.vendorId,
          uuid: sub.vendor?.uuid,
          name: sub.vendor?.name || 'Vendor',
          slug: sub.vendor?.slug,
          email: sub.vendor?.email,
          phone: sub.vendor?.phone,
        },
        items: (sub.items || []).map((it: CommerceOrderItem) => ({
          id: it.id,
          uuid: it.uuid,
          offeringId: it.offeringId,
          offeringType: it.offeringType,
          quantity: it.quantity,
          unitPriceKobo: it.unitPriceKobo.toString(),
          totalPriceKobo: it.totalPriceKobo.toString(),
          snapshotData: it.snapshotData,
          createdAt: it.createdAt,
        })),
        fulfilmentEvents: (sub.fulfilmentEvents || []).map((ev: CommerceFulfilmentEvent) => ({
          id: ev.id,
          uuid: ev.uuid,
          status: ev.status,
          title: ev.title,
          description: ev.description,
          isCustomerVisible: ev.isCustomerVisible,
          carrierName: ev.carrierName,
          trackingNumber: ev.trackingNumber,
          serviceDateTime: ev.serviceDateTime,
          actorType: ev.actorType,
          actorId: ev.actorId,
          createdAt: ev.createdAt || new Date(),
        })),
        payableRecord: sub.payableRecord
          ? {
              id: sub.payableRecord.id,
              uuid: sub.payableRecord.uuid,
              status: sub.payableRecord.status,
              grossAmountKobo: sub.payableRecord.grossAmountKobo.toString(),
              commissionKobo: sub.payableRecord.commissionKobo.toString(),
              netPayableKobo: sub.payableRecord.netPayableKobo.toString(),
              bankCode: sub.payableRecord.bankCode,
              accountNumber: sub.payableRecord.accountNumber,
              accountName: sub.payableRecord.accountName,
              eligibleAt: sub.payableRecord.eligibleAt,
              paidAt: sub.payableRecord.paidAt,
            }
          : null,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      paymentAttempts: paymentAttempts.map((pa: CommercePaymentAttempt) => ({
        uuid: pa.uuid,
        reference: pa.reference,
        amountKobo: pa.amountKobo.toString(),
        currency: pa.currency || 'NGN',
        channel: pa.channel,
        status: pa.status,
        gatewayResponse: pa.gatewayResponse,
        ipAddress: pa.ipAddress,
        createdAt: pa.createdAt || new Date(),
      })),
      auditLogs: auditLogs.map((al: CommerceOrderAudit) => ({
        uuid: al.uuid,
        event: al.event,
        fromState: al.fromState,
        toState: al.toState,
        actorType: al.actorType,
        actorId: al.actorId,
        details: al.details,
        createdAt: al.createdAt || new Date(),
      })),
      createdAt: order.createdAt || new Date(),
      updatedAt: order.updatedAt || new Date(),
    }
  }
}
