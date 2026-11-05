import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  AdminOperationalStatus,
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
  CommerceVendorSuborder,
  CommerceOrderItem,
  CommerceFulfilmentEvent,
  CustomerFulfilmentStatus,
} from '../../../../domains/commerce/commerce-order.repository'
import {
  AdminCommerceSubOrderDto,
  AdminFulfilmentTransitionAction,
  AdminUpdateFulfilmentDto,
} from '../../dto/admin-commerce.dto'

@Injectable()
export class AdminUpdateSubOrderFulfilmentUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
  ) {}

  async execute(
    subOrderUuid: string,
    adminActorId: string,
    dto: AdminUpdateFulfilmentDto,
  ): Promise<AdminCommerceSubOrderDto> {
    const subOrder = await this.orderRepo.findSubOrderByUuid(subOrderUuid)
    if (!subOrder) {
      throw new NotFoundException(`Vendor sub-order '${subOrderUuid}' not found`)
    }

    const order = subOrder.order || (await this.orderRepo.findOrderById(subOrder.orderId))
    if (!order) {
      throw new NotFoundException(`Parent order for sub-order '${subOrderUuid}' not found`)
    }

    // Validation 1: Master order must be paid
    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('Cannot perform fulfilment operations on an unpaid order')
    }

    // Validation 2: Master order must not be cancelled or refunded
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException(`Cannot perform fulfilment operations on order with status '${order.status}'`)
    }

    const items = subOrder.items || []
    const isServiceSubOrder = items.some((it) => it.offeringType === 'SERVICE')

    let targetCustomerStatus: CustomerFulfilmentStatus | undefined
    let targetOperationalStatus: AdminOperationalStatus | undefined
    const dispatchData: any = {}
    let eventTitle = dto.customTitle
    let eventDescription = dto.customDescription
    let isCustomerVisible = dto.isCustomerVisible ?? true
    let payableStatusUpdate: { status: string; eligibleAt?: Date } | undefined
    let checkAllSubOrdersCompleted = false

    const now = new Date()

    switch (dto.action) {
      case AdminFulfilmentTransitionAction.CONFIRM_BY_VENDOR: {
        if (subOrder.operationalStatus === 'VENDOR_CONFIRMED') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        targetOperationalStatus = 'VENDOR_CONFIRMED'
        eventTitle = eventTitle || 'Vendor Confirmed'
        eventDescription = eventDescription || 'Vendor has confirmed and begun preparing the order items'
        break
      }

      // PRODUCT LIFECYCLE
      case AdminFulfilmentTransitionAction.DISPATCH: {
        if (isServiceSubOrder) {
          throw new BadRequestException('Cannot dispatch carrier for a service sub-order; use service scheduling')
        }
        if (!dto.carrierName || !dto.trackingNumber) {
          throw new BadRequestException('carrierName and trackingNumber are required for carrier dispatch')
        }

        // Idempotency check
        if (
          subOrder.customerStatus === 'DISPATCHED' &&
          subOrder.carrierName === dto.carrierName &&
          subOrder.trackingNumber === dto.trackingNumber
        ) {
          return this.mapToAdminSubOrderDto(subOrder)
        }

        targetCustomerStatus = 'DISPATCHED'
        targetOperationalStatus = 'CARRIER_DISPATCHED'
        dispatchData.carrierName = dto.carrierName
        dispatchData.trackingNumber = dto.trackingNumber
        if (dto.trackingUrl) dispatchData.trackingUrl = dto.trackingUrl

        eventTitle = eventTitle || 'Package Dispatched'
        eventDescription =
          eventDescription ||
          `Package dispatched via ${dto.carrierName}. Tracking number: ${dto.trackingNumber}`
        break
      }

      case AdminFulfilmentTransitionAction.OUT_FOR_DELIVERY: {
        if (isServiceSubOrder) {
          throw new BadRequestException('Cannot set out for delivery on a service sub-order')
        }
        if (subOrder.customerStatus === 'OUT_FOR_DELIVERY') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        if (subOrder.customerStatus !== 'DISPATCHED' && subOrder.customerStatus !== 'PROCESSING') {
          throw new BadRequestException(
            `Cannot transition to OUT_FOR_DELIVERY from current status '${subOrder.customerStatus}'`,
          )
        }

        targetCustomerStatus = 'OUT_FOR_DELIVERY'
        eventTitle = eventTitle || 'Out for Delivery'
        eventDescription =
          eventDescription || 'Package is out for delivery with the local courier'
        break
      }

      case AdminFulfilmentTransitionAction.DELIVER: {
        if (isServiceSubOrder) {
          throw new BadRequestException('Cannot deliver a service sub-order; use complete service')
        }
        if (subOrder.customerStatus === 'DELIVERED') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        if (
          subOrder.customerStatus !== 'OUT_FOR_DELIVERY' &&
          subOrder.customerStatus !== 'DISPATCHED' &&
          subOrder.customerStatus !== 'PROCESSING'
        ) {
          throw new BadRequestException(
            `Cannot transition to DELIVERED from current status '${subOrder.customerStatus}'`,
          )
        }

        targetCustomerStatus = 'DELIVERED'
        targetOperationalStatus = 'DELIVERED_PENDING_INSPECTION'
        dispatchData.deliveredAt = now
        // 48 hours cooling period
        const coolingPeriodEndsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
        dispatchData.coolingPeriodEndsAt = coolingPeriodEndsAt

        // Vendor payable moves to IN_COOLING_PERIOD
        payableStatusUpdate = { status: 'IN_COOLING_PERIOD' }

        eventTitle = eventTitle || 'Package Delivered'
        eventDescription =
          eventDescription || 'Package has been delivered to the recipient address'
        break
      }

      // SERVICE LIFECYCLE
      case AdminFulfilmentTransitionAction.SCHEDULE_SERVICE: {
        if (!isServiceSubOrder) {
          throw new BadRequestException('Cannot schedule service appointment on a product sub-order')
        }
        if (!dto.serviceScheduledAt) {
          throw new BadRequestException('serviceScheduledAt is required to schedule service appointment')
        }

        const scheduledDate = new Date(dto.serviceScheduledAt)
        if (isNaN(scheduledDate.getTime())) {
          throw new BadRequestException('Invalid serviceScheduledAt date format')
        }

        targetCustomerStatus = 'SERVICE_SCHEDULED'
        dispatchData.serviceScheduledAt = scheduledDate
        if (dto.serviceWindowNotes) {
          dispatchData.serviceWindowNotes = dto.serviceWindowNotes
        }

        eventTitle = eventTitle || 'Service Scheduled'
        eventDescription =
          eventDescription ||
          `Service appointment confirmed for ${scheduledDate.toLocaleDateString('en-NG', {
            dateStyle: 'medium',
          })}`
        break
      }

      case AdminFulfilmentTransitionAction.ASSIGN_TECHNICIAN: {
        if (!isServiceSubOrder) {
          throw new BadRequestException('Cannot assign technician to a product sub-order')
        }
        if (!dto.technicianName) {
          throw new BadRequestException('technicianName is required to assign technician')
        }

        targetOperationalStatus = 'TECHNICIAN_ASSIGNED'
        dispatchData.technicianName = dto.technicianName
        if (dto.technicianPhone) dispatchData.technicianPhone = dto.technicianPhone

        isCustomerVisible = dto.isCustomerVisible ?? false
        eventTitle = eventTitle || 'Technician Assigned'
        eventDescription =
          eventDescription ||
          `Technician ${dto.technicianName} assigned to service sub-order`
        break
      }

      case AdminFulfilmentTransitionAction.TECHNICIAN_EN_ROUTE: {
        if (!isServiceSubOrder) {
          throw new BadRequestException('Cannot set technician en route on a product sub-order')
        }
        if (subOrder.customerStatus === 'TECHNICIAN_EN_ROUTE') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        if (
          subOrder.customerStatus !== 'SERVICE_SCHEDULED' &&
          subOrder.customerStatus !== 'PROCESSING'
        ) {
          throw new BadRequestException(
            `Cannot transition to TECHNICIAN_EN_ROUTE from current status '${subOrder.customerStatus}'`,
          )
        }

        targetCustomerStatus = 'TECHNICIAN_EN_ROUTE'
        targetOperationalStatus = 'TECHNICIAN_ASSIGNED'
        if (dto.technicianName) dispatchData.technicianName = dto.technicianName
        if (dto.technicianPhone) dispatchData.technicianPhone = dto.technicianPhone

        eventTitle = eventTitle || 'Technician En Route'
        eventDescription =
          eventDescription ||
          (dto.technicianName
            ? `Technician ${dto.technicianName} is on the way to the delivery address`
            : 'Technician is en route to the service location')
        break
      }

      case AdminFulfilmentTransitionAction.COMPLETE_SERVICE: {
        if (!isServiceSubOrder) {
          throw new BadRequestException('Cannot complete service on a product sub-order; use deliver')
        }
        if (subOrder.customerStatus === 'SERVICE_COMPLETED') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        if (
          subOrder.customerStatus !== 'TECHNICIAN_EN_ROUTE' &&
          subOrder.customerStatus !== 'SERVICE_SCHEDULED' &&
          subOrder.customerStatus !== 'PROCESSING'
        ) {
          throw new BadRequestException(
            `Cannot transition to SERVICE_COMPLETED from current status '${subOrder.customerStatus}'`,
          )
        }

        targetCustomerStatus = 'SERVICE_COMPLETED'
        targetOperationalStatus = 'DELIVERED_PENDING_INSPECTION'
        dispatchData.deliveredAt = now
        const coolingPeriodEndsAt = new Date(now.getTime() + 48 * 60 * 60 * 1000)
        dispatchData.coolingPeriodEndsAt = coolingPeriodEndsAt

        // Vendor payable moves to IN_COOLING_PERIOD
        payableStatusUpdate = { status: 'IN_COOLING_PERIOD' }

        eventTitle = eventTitle || 'Service Completed'
        eventDescription =
          eventDescription || 'Service work has been completed by the technician'
        break
      }

      // ADMIN CONFIRM RECEIPT (Overriding on behalf of tenant)
      case AdminFulfilmentTransitionAction.ADMIN_CONFIRM_RECEIPT: {
        if (subOrder.customerStatus === 'RECEIVED_CONFIRMED') {
          return this.mapToAdminSubOrderDto(subOrder)
        }
        if (
          subOrder.customerStatus !== 'DELIVERED' &&
          subOrder.customerStatus !== 'SERVICE_COMPLETED'
        ) {
          throw new BadRequestException(
            `Cannot confirm receipt for sub-order in status '${subOrder.customerStatus}'. Must be DELIVERED or SERVICE_COMPLETED`,
          )
        }

        targetCustomerStatus = 'RECEIVED_CONFIRMED'
        targetOperationalStatus = 'FULFILMENT_CLOSED'
        dispatchData.tenantConfirmedAt = now

        // Vendor payable moves to ELIGIBLE_FOR_PAYOUT
        payableStatusUpdate = {
          status: 'ELIGIBLE_FOR_PAYOUT',
          eligibleAt: now,
        }
        checkAllSubOrdersCompleted = true

        eventTitle = eventTitle || 'Receipt Confirmed'
        eventDescription =
          eventDescription || 'Fulfilment verified and receipt confirmed by Upward Administrator'
        break
      }

      default:
        throw new BadRequestException(`Unsupported transition action: ${dto.action}`)
    }

    if (dto.adminOperationalNotes) {
      dispatchData.adminOperationalNotes = dto.adminOperationalNotes
    }

    const updatedSubOrder = await this.orderRepo.executeSubOrderFulfilmentTransition({
      subOrderId: subOrder.id!,
      orderId: order.id!,
      customerStatus: targetCustomerStatus,
      operationalStatus: targetOperationalStatus,
      dispatchData,
      event: {
        status: targetCustomerStatus || subOrder.customerStatus,
        title: eventTitle!,
        description: eventDescription!,
        isCustomerVisible,
        carrierName: dispatchData.carrierName || subOrder.carrierName,
        trackingNumber: dispatchData.trackingNumber || subOrder.trackingNumber,
        serviceDateTime: dispatchData.serviceScheduledAt || subOrder.serviceScheduledAt,
        actorType: 'ADMIN',
        actorId: adminActorId,
      },
      payableStatusUpdate,
      checkAllSubOrdersCompleted,
      auditLog: {
        event: `FULFILMENT_${dto.action}`,
        fromState: subOrder.customerStatus,
        toState: targetCustomerStatus || subOrder.customerStatus,
        actorType: 'ADMIN',
        actorId: adminActorId,
        details: {
          subOrderUuid,
          subOrderNumber: subOrder.subOrderNumber,
          action: dto.action,
          operationalStatus: targetOperationalStatus || subOrder.operationalStatus,
          notes: dto.adminOperationalNotes,
        },
      },
    })

    return this.mapToAdminSubOrderDto(updatedSubOrder)
  }

  private mapToAdminSubOrderDto(sub: CommerceVendorSuborder): AdminCommerceSubOrderDto {
    return {
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
    }
  }
}
