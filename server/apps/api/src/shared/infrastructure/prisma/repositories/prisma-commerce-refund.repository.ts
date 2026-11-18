import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  CommerceRefund,
  CommerceRefundAttempt,
  CommerceDispute,
  CommerceRefundRepository,
  RefundStatus,
  DisputeStatus,
} from '../../../../domains/commerce/commerce-refund.repository'

@Injectable()
export class PrismaCommerceRefundRepository implements CommerceRefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRefund(data: {
    subOrderId: number
    amountKobo: bigint
    reason: string
    requestedBy: string
    status?: RefundStatus
  }): Promise<CommerceRefund> {
    const res = await this.prisma.upward_commerce_refund.create({
      data: {
        subOrderId: data.subOrderId,
        amountKobo: data.amountKobo,
        reason: data.reason,
        requestedBy: data.requestedBy,
        status: data.status || 'REQUESTED',
      },
      include: {
        subOrder: { include: { order: true } },
      },
    })
    return res as unknown as CommerceRefund
  }

  async findRefundById(id: number): Promise<CommerceRefund | null> {
    const res = await this.prisma.upward_commerce_refund.findUnique({
      where: { id },
      include: {
        subOrder: { include: { order: true } },
        attempts: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceRefund | null
  }

  async findRefundByUuid(uuid: string): Promise<CommerceRefund | null> {
    const res = await this.prisma.upward_commerce_refund.findUnique({
      where: { uuid },
      include: {
        subOrder: { include: { order: true } },
        attempts: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceRefund | null
  }

  async findRefunds(
    filter: { status?: RefundStatus; skip?: number; take?: number } = {},
  ): Promise<{ items: CommerceRefund[]; total: number }> {
    const { status, skip = 0, take = 50 } = filter
    const where: any = {}
    if (status) where.status = status

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_refund.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subOrder: {
            include: {
              order: true,
              vendor: true,
            },
          },
          attempts: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.upward_commerce_refund.count({ where }),
    ])

    return { items: items as unknown as CommerceRefund[], total }
  }

  async updateRefundStatus(
    refundId: number,
    status: RefundStatus,
    approvedBy?: string,
    approvedAt?: Date,
    completedAt?: Date,
  ): Promise<CommerceRefund> {
    const data: any = { status }
    if (approvedBy) data.approvedBy = approvedBy
    if (approvedAt) data.approvedAt = approvedAt
    if (completedAt) data.completedAt = completedAt

    const updated = await this.prisma.upward_commerce_refund.update({
      where: { id: refundId },
      data,
      include: {
        subOrder: { include: { order: true } },
      },
    })
    return updated as unknown as CommerceRefund
  }

  async recordRefundAttempt(
    refundId: number,
    attempt: {
      gatewayReference: string
      paystackRefundId?: string
      status: string
      gatewayResponse?: string
    },
  ): Promise<CommerceRefundAttempt> {
    const res = await this.prisma.upward_commerce_refund_attempt.create({
      data: {
        refundId,
        gatewayReference: attempt.gatewayReference,
        paystackRefundId: attempt.paystackRefundId,
        status: attempt.status,
        gatewayResponse: attempt.gatewayResponse,
      },
    })
    return res as unknown as CommerceRefundAttempt
  }

  async findRefundAttemptByReference(reference: string): Promise<CommerceRefundAttempt | null> {
    const res = await this.prisma.upward_commerce_refund_attempt.findUnique({
      where: { gatewayReference: reference },
      include: { refund: true },
    })
    return res as unknown as CommerceRefundAttempt | null
  }

  // Disputes
  async createDispute(data: {
    subOrderId: number
    userId: number
    reason: string
    explanation: string
    evidenceUrls?: string[]
  }): Promise<CommerceDispute> {
    const res = await this.prisma.upward_commerce_dispute.create({
      data: {
        subOrderId: data.subOrderId,
        userId: data.userId,
        reason: data.reason,
        explanation: data.explanation,
        evidenceUrls: data.evidenceUrls || [],
        status: 'OPEN',
      },
      include: {
        subOrder: { include: { order: true } },
      },
    })
    return res as unknown as CommerceDispute
  }

  async findDisputeById(id: number): Promise<CommerceDispute | null> {
    const res = await this.prisma.upward_commerce_dispute.findUnique({
      where: { id },
      include: {
        subOrder: { include: { order: true, vendor: true } },
      },
    })
    return res as unknown as CommerceDispute | null
  }

  async findDisputeByUuid(uuid: string): Promise<CommerceDispute | null> {
    const res = await this.prisma.upward_commerce_dispute.findUnique({
      where: { uuid },
      include: {
        subOrder: { include: { order: true, vendor: true } },
      },
    })
    return res as unknown as CommerceDispute | null
  }

  async findDisputes(
    filter: { status?: DisputeStatus; skip?: number; take?: number } = {},
  ): Promise<{ items: CommerceDispute[]; total: number }> {
    const { status, skip = 0, take = 50 } = filter
    const where: any = {}
    if (status) where.status = status

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_dispute.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subOrder: {
            include: {
              order: true,
              vendor: true,
            },
          },
        },
      }),
      this.prisma.upward_commerce_dispute.count({ where }),
    ])

    return { items: items as unknown as CommerceDispute[], total }
  }

  async openDispute(params: {
    subOrderId: number
    orderId: number
    userId: number
    reason: string
    explanation: string
    evidenceUrls?: string[]
  }): Promise<CommerceDispute> {
    return this.prisma.$transaction(async (tx) => {
      const dispute = await tx.upward_commerce_dispute.create({
        data: {
          subOrderId: params.subOrderId,
          userId: params.userId,
          reason: params.reason,
          explanation: params.explanation,
          evidenceUrls: params.evidenceUrls || [],
          status: 'OPEN',
        },
        include: {
          subOrder: {
            include: {
              order: true,
              vendor: true,
            },
          },
        },
      })

      await tx.upward_commerce_vendor_suborder.update({
        where: { id: params.subOrderId },
        data: {
          customerStatus: 'DISPUTED',
          operationalStatus: 'DISPUTE_LOGGED',
        },
      })

      await tx.upward_commerce_vendor_payable.updateMany({
        where: {
          subOrderId: params.subOrderId,
          status: { notIn: ['PAID_OUT', 'VOIDED_REFUNDED'] },
        },
        data: {
          status: 'HELD_FOR_DISPUTE',
        },
      })

      await tx.upward_commerce_fulfilment_event.create({
        data: {
          subOrderId: params.subOrderId,
          status: 'DISPUTED',
          title: 'Dispute Logged with Upward Support',
          description: `Customer submitted an inquiry/dispute: ${params.reason}. Our support team is reviewing it directly.`,
          isCustomerVisible: true,
          actorType: 'TENANT',
          actorId: String(params.userId),
        },
      })

      await tx.upward_commerce_order_audit.create({
        data: {
          orderId: params.orderId,
          event: 'DISPUTE_OPENED',
          toState: 'DISPUTED',
          actorType: 'TENANT',
          actorId: String(params.userId),
          details: {
            subOrderId: params.subOrderId,
            reason: params.reason,
            explanation: params.explanation,
            disputeId: dispute.id,
          },
        },
      })

      return dispute as unknown as CommerceDispute
    })
  }

  async resolveDisputeAndSettle(params: {
    disputeId: number
    resolutionStatus: DisputeStatus
    resolutionNotes: string
    resolvedBy: string
    refundAmountKobo?: bigint
  }): Promise<{
    dispute: CommerceDispute
    refund?: CommerceRefund
    recipientUserId: number
    orderNumber: string
    subOrderNumber: string
  }> {
    const existing = await this.prisma.upward_commerce_dispute.findUnique({
      where: { id: params.disputeId },
      include: {
        subOrder: {
          include: {
            order: true,
            payableRecord: true,
          },
        },
      },
    })

    if (!existing) {
      throw new Error(`Dispute #${params.disputeId} not found`)
    }

    const subOrder = existing.subOrder
    const order = subOrder.order
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      let createdRefund: any = undefined

      const updatedDispute = await tx.upward_commerce_dispute.update({
        where: { id: params.disputeId },
        data: {
          status: params.resolutionStatus,
          resolutionNotes: params.resolutionNotes,
          resolvedBy: params.resolvedBy,
          resolvedAt: now,
        },
        include: {
          subOrder: {
            include: {
              order: true,
              vendor: true,
            },
          },
        },
      })

      if (params.resolutionStatus === 'RESOLVED_REFUND') {
        const refundAmountKobo = params.refundAmountKobo
          ? params.refundAmountKobo
          : subOrder.subtotalKobo + subOrder.deliveryFeeKobo

        createdRefund = await tx.upward_commerce_refund.create({
          data: {
            subOrderId: subOrder.id,
            amountKobo: refundAmountKobo,
            reason: `Dispute resolved in customer favor: ${params.resolutionNotes}`,
            status: 'APPROVED',
            requestedBy: params.resolvedBy,
            approvedBy: params.resolvedBy,
            approvedAt: now,
          },
        })

        await tx.upward_commerce_vendor_suborder.update({
          where: { id: subOrder.id },
          data: {
            customerStatus: 'CANCELLED',
            operationalStatus: 'CANCELLED_REFUNDED',
          },
        })

        await tx.upward_commerce_vendor_payable.updateMany({
          where: { subOrderId: subOrder.id },
          data: {
            status: 'VOIDED_REFUNDED',
          },
        })

        await tx.upward_commerce_fulfilment_event.create({
          data: {
            subOrderId: subOrder.id,
            status: 'CANCELLED',
            title: 'Dispute Resolved — Refund Approved',
            description: `Upward Support resolved this issue in your favor. Refund approved. Note: ${params.resolutionNotes}`,
            isCustomerVisible: true,
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
          },
        })

        await tx.upward_commerce_order_audit.create({
          data: {
            orderId: order.id,
            event: 'DISPUTE_RESOLVED_REFUND',
            fromState: 'DISPUTED',
            toState: 'CANCELLED_REFUNDED',
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
            details: {
              subOrderId: subOrder.id,
              disputeId: existing.id,
              refundId: createdRefund.id,
              refundAmountKobo: refundAmountKobo.toString(),
              resolutionNotes: params.resolutionNotes,
            },
          },
        })
      } else if (params.resolutionStatus === 'RESOLVED_PAYOUT') {
        await tx.upward_commerce_vendor_suborder.update({
          where: { id: subOrder.id },
          data: {
            customerStatus: 'ORDER_CONFIRMED',
            operationalStatus: 'VENDOR_CONFIRMED',
          },
        })

        await tx.upward_commerce_vendor_payable.updateMany({
          where: { subOrderId: subOrder.id, status: 'HELD_FOR_DISPUTE' },
          data: {
            status: 'IN_COOLING_PERIOD',
            eligibleAt: now,
          },
        })

        await tx.upward_commerce_fulfilment_event.create({
          data: {
            subOrderId: subOrder.id,
            status: 'ORDER_CONFIRMED',
            title: 'Dispute Closed — Fulfilment Re-affirmed',
            description: `Upward Support resolved the dispute. Fulfilment confirmed. Note: ${params.resolutionNotes}`,
            isCustomerVisible: true,
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
          },
        })

        await tx.upward_commerce_order_audit.create({
          data: {
            orderId: order.id,
            event: 'DISPUTE_RESOLVED_PAYOUT',
            fromState: 'DISPUTED',
            toState: 'ORDER_CONFIRMED',
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
            details: {
              subOrderId: subOrder.id,
              disputeId: existing.id,
              resolutionNotes: params.resolutionNotes,
            },
          },
        })
      } else {
        await tx.upward_commerce_fulfilment_event.create({
          data: {
            subOrderId: subOrder.id,
            status: 'ORDER_CONFIRMED',
            title: `Dispute Closed (${params.resolutionStatus})`,
            description: `Resolution note: ${params.resolutionNotes}`,
            isCustomerVisible: true,
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
          },
        })

        await tx.upward_commerce_order_audit.create({
          data: {
            orderId: order.id,
            event: `DISPUTE_${params.resolutionStatus}`,
            actorType: 'ADMIN',
            actorId: params.resolvedBy,
            toState: params.resolutionStatus,
            details: {
              subOrderId: subOrder.id,
              disputeId: existing.id,
              resolutionNotes: params.resolutionNotes,
            },
          },
        })
      }

      return {
        dispute: updatedDispute as unknown as CommerceDispute,
        refund: createdRefund as unknown as CommerceRefund | undefined,
        recipientUserId: order.userId,
        orderNumber: order.orderNumber,
        subOrderNumber: subOrder.subOrderNumber,
      }
    })
  }

  async resolveDispute(
    disputeId: number,
    data: {
      status: DisputeStatus
      resolutionNotes: string
      resolvedBy: string
    },
  ): Promise<CommerceDispute> {
    const updated = await this.prisma.upward_commerce_dispute.update({
      where: { id: disputeId },
      data: {
        status: data.status,
        resolutionNotes: data.resolutionNotes,
        resolvedBy: data.resolvedBy,
        resolvedAt: new Date(),
      },
      include: {
        subOrder: { include: { order: true } },
      },
    })
    return updated as unknown as CommerceDispute
  }
}
