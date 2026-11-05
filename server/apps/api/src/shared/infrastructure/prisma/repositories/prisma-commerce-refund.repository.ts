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
