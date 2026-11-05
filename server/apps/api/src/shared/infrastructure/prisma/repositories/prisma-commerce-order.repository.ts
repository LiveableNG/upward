import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  CommerceOrder,
  CommerceOrderRepository,
  CommerceOrderStatus,
  CommercePaymentStatus,
  CustomerFulfilmentStatus,
  AdminOperationalStatus,
  CommerceVendorSuborder,
  CommerceFulfilmentEvent,
  CommercePaymentAttempt,
  CommerceOrderAudit,
  CreateOrderData,
} from '../../../../domains/commerce/commerce-order.repository'

@Injectable()
export class PrismaCommerceOrderRepository implements CommerceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(data: CreateOrderData): Promise<CommerceOrder> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create master order
      const order = await tx.upward_commerce_order.create({
        data: {
          userId: data.userId,
          orderNumber: data.orderNumber,
          currency: data.currency,
          itemsSubtotalKobo: data.itemsSubtotalKobo,
          deliveryFeeKobo: data.deliveryFeeKobo,
          taxKobo: data.taxKobo,
          discountKobo: data.discountKobo,
          totalAmountKobo: data.totalAmountKobo,
          paymentReference: data.paymentReference,
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          deliveryAddress: data.deliveryAddress,
          deliveryNotes: data.deliveryNotes,
          status: 'PENDING',
          paymentStatus: 'UNPAID',
        },
      })

      // 2. Create decomposed vendor sub-orders and their items
      for (const sub of data.subOrders) {
        const subOrder = await tx.upward_commerce_vendor_suborder.create({
          data: {
            orderId: order.id,
            vendorId: sub.vendorId,
            subOrderNumber: sub.subOrderNumber,
            customerStatus: 'ORDER_CONFIRMED',
            operationalStatus: 'AWAITING_VENDOR_CONFIRMATION',
            subtotalKobo: sub.subtotalKobo,
            deliveryFeeKobo: sub.deliveryFeeKobo,
            allocatedDiscountKobo: sub.allocatedDiscountKobo,
            platformFeeKobo: sub.platformFeeKobo,
            vendorPayoutKobo: sub.vendorPayoutKobo,
          },
        })

        // Initial fulfilment event
        await tx.upward_commerce_fulfilment_event.create({
          data: {
            subOrderId: subOrder.id,
            status: 'ORDER_CONFIRMED',
            title: 'Order Placed',
            description: 'Order placed by customer and awaiting payment verification.',
            isCustomerVisible: true,
            actorType: 'TENANT',
            actorId: String(data.userId),
          },
        })

        // Items snapshot and atomic stock decrement
        for (const item of sub.items) {
          if (item.offeringId) {
            const offering = await tx.upward_offering.findUnique({
              where: { id: item.offeringId },
              select: { id: true, stockCount: true, inStock: true, status: true },
            })
            if (!offering || offering.status !== 'PUBLISHED' || !offering.inStock) {
              throw new Error(`OFFERING_UNAVAILABLE: Offering ID ${item.offeringId} is not available for purchase`)
            }
            if (offering.stockCount !== null) {
              if (offering.stockCount < item.quantity) {
                throw new Error(`INSUFFICIENT_STOCK: Offering ID ${item.offeringId} has only ${offering.stockCount} in stock, requested ${item.quantity}`)
              }
              const updateRes = await tx.upward_offering.updateMany({
                where: {
                  id: item.offeringId,
                  inStock: true,
                  stockCount: { gte: item.quantity },
                },
                data: {
                  stockCount: { decrement: item.quantity },
                },
              })
              if (updateRes.count === 0) {
                throw new Error(`INSUFFICIENT_STOCK: Offering ID ${item.offeringId} was claimed by another customer`)
              }
              await tx.upward_offering.updateMany({
                where: {
                  id: item.offeringId,
                  stockCount: { lte: 0 },
                },
                data: {
                  inStock: false,
                },
              })
            }

            // Also check package components if applicable
            const snap = item.snapshotData as any
            if (snap?.packageItemsSnapshot && Array.isArray(snap.packageItemsSnapshot)) {
              for (const comp of snap.packageItemsSnapshot) {
                if (comp.componentId) {
                  const compOffering = await tx.upward_offering.findUnique({
                    where: { id: comp.componentId },
                    select: { id: true, stockCount: true, inStock: true, status: true },
                  })
                  if (compOffering && compOffering.stockCount !== null) {
                    const requiredQty = (comp.quantity || 1) * item.quantity
                    if (compOffering.stockCount < requiredQty) {
                      throw new Error(`INSUFFICIENT_STOCK: Package component ID ${comp.componentId} has only ${compOffering.stockCount} in stock, required ${requiredQty}`)
                    }
                    const compRes = await tx.upward_offering.updateMany({
                      where: {
                        id: comp.componentId,
                        inStock: true,
                        stockCount: { gte: requiredQty },
                      },
                      data: {
                        stockCount: { decrement: requiredQty },
                      },
                    })
                    if (compRes.count === 0) {
                      throw new Error(`INSUFFICIENT_STOCK: Package component ID ${comp.componentId} was claimed by another customer`)
                    }
                    await tx.upward_offering.updateMany({
                      where: {
                        id: comp.componentId,
                        stockCount: { lte: 0 },
                      },
                      data: {
                        inStock: false,
                      },
                    })
                  }
                }
              }
            }
          }

          await tx.upward_commerce_order_item.create({
            data: {
              subOrderId: subOrder.id,
              offeringId: item.offeringId,
              offeringType: item.offeringType as any,
              quantity: item.quantity,
              unitPriceKobo: item.unitPriceKobo,
              totalPriceKobo: item.totalPriceKobo,
              snapshotData: item.snapshotData,
            },
          })
        }
      }

      // Initial audit log
      await tx.upward_commerce_order_audit.create({
        data: {
          orderId: order.id,
          event: 'ORDER_CREATED',
          toState: 'PENDING',
          actorType: 'TENANT',
          actorId: String(data.userId),
          details: { orderNumber: data.orderNumber, totalAmountKobo: data.totalAmountKobo.toString() },
        },
      })

      return this.findOrderById(order.id) as unknown as CommerceOrder
    })
  }

  async findOrderById(id: number): Promise<CommerceOrder | null> {
    const res = await this.prisma.upward_commerce_order.findUnique({
      where: { id },
      include: {
        subOrders: {
          include: {
            items: true,
            fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
            vendor: true,
          },
        },
        paymentAttempts: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceOrder | null
  }

  async findOrderByUuid(uuid: string): Promise<CommerceOrder | null> {
    const res = await this.prisma.upward_commerce_order.findUnique({
      where: { uuid },
      include: {
        subOrders: {
          include: {
            items: true,
            fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
            vendor: true,
          },
        },
        paymentAttempts: { orderBy: { createdAt: 'desc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceOrder | null
  }

  async findOrderByNumber(orderNumber: string): Promise<CommerceOrder | null> {
    const res = await this.prisma.upward_commerce_order.findUnique({
      where: { orderNumber },
      include: {
        subOrders: {
          include: {
            items: true,
            fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
            vendor: true,
          },
        },
      },
    })
    return res as unknown as CommerceOrder | null
  }

  async findOrderByPaymentReference(paymentReference: string): Promise<CommerceOrder | null> {
    const res = await this.prisma.upward_commerce_order.findUnique({
      where: { paymentReference },
      include: {
        subOrders: {
          include: {
            items: true,
            fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
            vendor: true,
          },
        },
      },
    })
    return res as unknown as CommerceOrder | null
  }

  async findOrdersByUserId(
    userId: number,
    options: { skip?: number; take?: number; status?: CommerceOrderStatus } = {},
  ): Promise<{ items: CommerceOrder[]; total: number }> {
    const { skip = 0, take = 20, status } = options
    const where: any = { userId }
    if (status) where.status = status

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subOrders: {
            include: {
              items: true,
              fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
              vendor: true,
            },
          },
        },
      }),
      this.prisma.upward_commerce_order.count({ where }),
    ])

    return { items: items as unknown as CommerceOrder[], total }
  }

  async findAdminOrders(
    filter: {
      status?: CommerceOrderStatus
      paymentStatus?: CommercePaymentStatus
      search?: string
      skip?: number
      take?: number
    } = {},
  ): Promise<{ items: CommerceOrder[]; total: number }> {
    const { skip = 0, take = 50, status, paymentStatus, search } = filter
    const where: any = {}
    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus
    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { recipientPhone: { contains: q, mode: 'insensitive' } },
        { paymentReference: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, uuid: true, email: true, firstName: true, lastName: true } },
          subOrders: {
            include: {
              vendor: true,
              items: true,
            },
          },
        },
      }),
      this.prisma.upward_commerce_order.count({ where }),
    ])

    return { items: items as unknown as CommerceOrder[], total }
  }

  async updateOrderStatus(
    orderId: number,
    status: CommerceOrderStatus,
    paymentStatus?: CommercePaymentStatus,
    paidAt?: Date,
  ): Promise<CommerceOrder> {
    const data: any = { status }
    if (paymentStatus) data.paymentStatus = paymentStatus
    if (paidAt) data.paidAt = paidAt

    const updated = await this.prisma.upward_commerce_order.update({
      where: { id: orderId },
      data,
      include: {
        subOrders: {
          include: {
            items: true,
            fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
            vendor: true,
          },
        },
      },
    })
    return updated as unknown as CommerceOrder
  }

  async findSubOrderByUuid(uuid: string): Promise<CommerceVendorSuborder | null> {
    const res = await this.prisma.upward_commerce_vendor_suborder.findUnique({
      where: { uuid },
      include: {
        order: true,
        vendor: true,
        items: true,
        fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
        payableRecord: true,
      },
    })
    return res as unknown as CommerceVendorSuborder | null
  }

  async findSubOrderById(id: number): Promise<CommerceVendorSuborder | null> {
    const res = await this.prisma.upward_commerce_vendor_suborder.findUnique({
      where: { id },
      include: {
        order: true,
        vendor: true,
        items: true,
        fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
        payableRecord: true,
      },
    })
    return res as unknown as CommerceVendorSuborder | null
  }

  async findSubOrdersByVendorId(
    vendorId: number,
    options: {
      customerStatus?: CustomerFulfilmentStatus
      operationalStatus?: AdminOperationalStatus
      skip?: number
      take?: number
    } = {},
  ): Promise<{ items: CommerceVendorSuborder[]; total: number }> {
    const { skip = 0, take = 50, customerStatus, operationalStatus } = options
    const where: any = { vendorId }
    if (customerStatus) where.customerStatus = customerStatus
    if (operationalStatus) where.operationalStatus = operationalStatus

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_vendor_suborder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: true,
          items: true,
          fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
        },
      }),
      this.prisma.upward_commerce_vendor_suborder.count({ where }),
    ])

    return { items: items as unknown as CommerceVendorSuborder[], total }
  }

  async updateSubOrderStatus(
    subOrderId: number,
    customerStatus?: CustomerFulfilmentStatus,
    operationalStatus?: AdminOperationalStatus,
    dispatchData?: {
      carrierName?: string
      trackingNumber?: string
      trackingUrl?: string
      serviceScheduledAt?: Date
      serviceWindowNotes?: string
      technicianName?: string
      technicianPhone?: string
      adminOperationalNotes?: string
      deliveredAt?: Date
      tenantConfirmedAt?: Date
      coolingPeriodEndsAt?: Date
    },
  ): Promise<CommerceVendorSuborder> {
    const data: any = {}
    if (customerStatus) data.customerStatus = customerStatus
    if (operationalStatus) data.operationalStatus = operationalStatus
    if (dispatchData) {
      Object.assign(data, dispatchData)
    }

    const updated = await this.prisma.upward_commerce_vendor_suborder.update({
      where: { id: subOrderId },
      data,
      include: {
        order: true,
        vendor: true,
        items: true,
        fulfilmentEvents: { orderBy: { createdAt: 'asc' } },
      },
    })
    return updated as unknown as CommerceVendorSuborder
  }

  async addFulfilmentEvent(
    subOrderId: number,
    event: Omit<CommerceFulfilmentEvent, 'id' | 'uuid' | 'createdAt' | 'subOrderId'>,
  ): Promise<CommerceFulfilmentEvent> {
    const res = await this.prisma.upward_commerce_fulfilment_event.create({
      data: {
        subOrderId,
        status: event.status as any,
        title: event.title,
        description: event.description,
        isCustomerVisible: event.isCustomerVisible ?? true,
        carrierName: event.carrierName,
        trackingNumber: event.trackingNumber,
        serviceDateTime: event.serviceDateTime,
        actorType: event.actorType,
        actorId: event.actorId,
      },
    })
    return res as unknown as CommerceFulfilmentEvent
  }

  async recordPaymentAttempt(
    orderId: number,
    attempt: {
      reference: string
      amountKobo: bigint
      channel?: string
      status?: string
      ipAddress?: string
      gatewayResponse?: string
    },
  ): Promise<CommercePaymentAttempt> {
    const res = await this.prisma.upward_commerce_payment_attempt.create({
      data: {
        orderId,
        reference: attempt.reference,
        amountKobo: attempt.amountKobo,
        channel: attempt.channel,
        status: attempt.status || 'INITIATED',
        ipAddress: attempt.ipAddress,
        gatewayResponse: attempt.gatewayResponse,
      },
    })
    return res as unknown as CommercePaymentAttempt
  }

  async recordAuditLog(
    orderId: number,
    audit: {
      event: string
      fromState?: string
      toState: string
      actorType: string
      actorId?: string
      details?: Record<string, any>
    },
  ): Promise<CommerceOrderAudit> {
    const res = await this.prisma.upward_commerce_order_audit.create({
      data: {
        orderId,
        event: audit.event,
        fromState: audit.fromState,
        toState: audit.toState,
        actorType: audit.actorType,
        actorId: audit.actorId,
        details: audit.details,
      },
    })
    return res as unknown as CommerceOrderAudit
  }

  async releaseInventory(orderId: number, reason?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.upward_commerce_order.findUnique({
        where: { id: orderId },
        include: {
          subOrders: {
            include: { items: true },
          },
        },
      })
      if (!order) return

      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          if (item.offeringId) {
            const off = await tx.upward_offering.findUnique({
              where: { id: item.offeringId },
              select: { id: true, stockCount: true },
            })
            if (off && off.stockCount !== null) {
              await tx.upward_offering.update({
                where: { id: item.offeringId },
                data: {
                  stockCount: { increment: item.quantity },
                  inStock: true,
                },
              })
            }
          }

          const snap = item.snapshotData as any
          if (snap?.packageItemsSnapshot && Array.isArray(snap.packageItemsSnapshot)) {
            for (const comp of snap.packageItemsSnapshot) {
              if (comp.componentId) {
                const compOff = await tx.upward_offering.findUnique({
                  where: { id: comp.componentId },
                  select: { id: true, stockCount: true },
                })
                if (compOff && compOff.stockCount !== null) {
                  const qtyToRestore = (comp.quantity || 1) * item.quantity
                  await tx.upward_offering.update({
                    where: { id: comp.componentId },
                    data: {
                      stockCount: { increment: qtyToRestore },
                      inStock: true,
                    },
                  })
                }
              }
            }
          }
        }
      }

      await tx.upward_commerce_order_audit.create({
        data: {
          orderId,
          event: 'INVENTORY_RELEASED',
          toState: order.status,
          actorType: 'SYSTEM',
          details: { reason: reason || 'Order cancelled or expired' },
        },
      })
    })
  }
}
