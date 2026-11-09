import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  CommerceVendorPayable,
  VendorPayableRepository,
  VendorPayableStatus,
  PayoutTransferStatus,
  PayoutTransferAttempt,
  VendorPayableSummary,
} from '../../../../domains/commerce/vendor-payable.repository'

@Injectable()
export class PrismaVendorPayableRepository implements VendorPayableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPayable(data: {
    subOrderId: number
    vendorId: number
    grossAmountKobo: bigint
    commissionKobo: bigint
    netPayableKobo: bigint
    bankCode: string
    accountNumber: string
    accountName: string
  }): Promise<CommerceVendorPayable> {
    const res = await this.prisma.upward_commerce_vendor_payable.create({
      data: {
        subOrderId: data.subOrderId,
        vendorId: data.vendorId,
        grossAmountKobo: data.grossAmountKobo,
        commissionKobo: data.commissionKobo,
        netPayableKobo: data.netPayableKobo,
        bankCode: data.bankCode,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        status: 'PENDING_FULFILMENT',
      },
      include: {
        vendor: true,
        subOrder: { include: { order: true } },
      },
    })
    return res as unknown as CommerceVendorPayable
  }

  async findPayableBySubOrderId(subOrderId: number): Promise<CommerceVendorPayable | null> {
    const res = await this.prisma.upward_commerce_vendor_payable.findUnique({
      where: { subOrderId },
      include: {
        vendor: true,
        subOrder: { include: { order: true } },
        transferAttempts: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceVendorPayable | null
  }

  async findPayableByUuid(uuid: string): Promise<CommerceVendorPayable | null> {
    const res = await this.prisma.upward_commerce_vendor_payable.findUnique({
      where: { uuid },
      include: {
        vendor: true,
        subOrder: { include: { order: true } },
        transferAttempts: { orderBy: { createdAt: 'desc' } },
      },
    })
    return res as unknown as CommerceVendorPayable | null
  }

  async findPayablesByVendorId(
    vendorId: number,
    options: { status?: VendorPayableStatus; skip?: number; take?: number } = {},
  ): Promise<{ items: CommerceVendorPayable[]; total: number }> {
    const { status, skip = 0, take = 50 } = options
    const where: any = { vendorId }
    if (status) where.status = status

    const [items, total] = await Promise.all([
      this.prisma.upward_commerce_vendor_payable.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          subOrder: {
            include: {
              order: true,
              items: true,
            },
          },
          transferAttempts: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.upward_commerce_vendor_payable.count({ where }),
    ])

    return { items: items as unknown as CommerceVendorPayable[], total }
  }

  async getVendorPayablesSummary(): Promise<VendorPayableSummary[]> {
    const vendors = await this.prisma.upward_commerce_vendor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    const summaries: VendorPayableSummary[] = []

    for (const v of vendors) {
      const payables = await this.prisma.upward_commerce_vendor_payable.findMany({
        where: { vendorId: v.id },
      })

      let totalGrossKobo = BigInt(0)
      let totalCommissionKobo = BigInt(0)
      let totalNetPayableKobo = BigInt(0)
      let eligiblePayoutKobo = BigInt(0)
      let heldDisputeKobo = BigInt(0)
      let paidOutKobo = BigInt(0)

      for (const p of payables) {
        totalGrossKobo += p.grossAmountKobo
        totalCommissionKobo += p.commissionKobo
        totalNetPayableKobo += p.netPayableKobo

        if (p.status === 'ELIGIBLE_FOR_PAYOUT') {
          eligiblePayoutKobo += p.netPayableKobo
        } else if (p.status === 'HELD_FOR_DISPUTE') {
          heldDisputeKobo += p.netPayableKobo
        } else if (p.status === 'PAID_OUT') {
          paidOutKobo += p.netPayableKobo
        }
      }

      summaries.push({
        vendorId: v.id,
        vendorName: v.name,
        vendorSlug: v.slug,
        totalPayablesCount: payables.length,
        totalGrossKobo,
        totalCommissionKobo,
        totalNetPayableKobo,
        eligiblePayoutKobo,
        heldDisputeKobo,
        paidOutKobo,
      })
    }

    return summaries
  }

  async getVendorDetailSummary(vendorId: number): Promise<VendorPayableSummary | null> {
    const v = await this.prisma.upward_commerce_vendor.findUnique({
      where: { id: vendorId },
    })
    if (!v) return null

    const payables = await this.prisma.upward_commerce_vendor_payable.findMany({
      where: { vendorId: v.id },
    })

    let totalGrossKobo = BigInt(0)
    let totalCommissionKobo = BigInt(0)
    let totalNetPayableKobo = BigInt(0)
    let eligiblePayoutKobo = BigInt(0)
    let heldDisputeKobo = BigInt(0)
    let paidOutKobo = BigInt(0)

    for (const p of payables) {
      totalGrossKobo += p.grossAmountKobo
      totalCommissionKobo += p.commissionKobo
      totalNetPayableKobo += p.netPayableKobo

      if (p.status === 'ELIGIBLE_FOR_PAYOUT') {
        eligiblePayoutKobo += p.netPayableKobo
      } else if (p.status === 'HELD_FOR_DISPUTE') {
        heldDisputeKobo += p.netPayableKobo
      } else if (p.status === 'PAID_OUT') {
        paidOutKobo += p.netPayableKobo
      }
    }

    return {
      vendorId: v.id,
      vendorName: v.name,
      vendorSlug: v.slug,
      totalPayablesCount: payables.length,
      totalGrossKobo,
      totalCommissionKobo,
      totalNetPayableKobo,
      eligiblePayoutKobo,
      heldDisputeKobo,
      paidOutKobo,
    }
  }

  async updatePayableStatus(
    payableId: number,
    status: VendorPayableStatus,
    eligibleAt?: Date,
    paidAt?: Date,
  ): Promise<CommerceVendorPayable> {
    const data: any = { status }
    if (eligibleAt) data.eligibleAt = eligibleAt
    if (paidAt) data.paidAt = paidAt

    const updated = await this.prisma.upward_commerce_vendor_payable.update({
      where: { id: payableId },
      data,
      include: {
        vendor: true,
        subOrder: { include: { order: true } },
      },
    })
    return updated as unknown as CommerceVendorPayable
  }

  async recordTransferAttempt(
    payableId: number,
    attempt: {
      transferReference: string
      paystackTransferCode?: string
      status: PayoutTransferStatus
      makerAdminId: string
      checkerAdminId?: string
      gatewayResponse?: string
    },
  ): Promise<PayoutTransferAttempt> {
    const res = await this.prisma.upward_commerce_payout_transfer_attempt.create({
      data: {
        payableId,
        transferReference: attempt.transferReference,
        paystackTransferCode: attempt.paystackTransferCode,
        status: attempt.status,
        makerAdminId: attempt.makerAdminId,
        checkerAdminId: attempt.checkerAdminId,
        gatewayResponse: attempt.gatewayResponse,
      },
    })
    return res as unknown as PayoutTransferAttempt
  }

  async findTransferAttemptByReference(reference: string): Promise<PayoutTransferAttempt | null> {
    const res = await this.prisma.upward_commerce_payout_transfer_attempt.findUnique({
      where: { transferReference: reference },
      include: { payable: true },
    })
    return res as unknown as PayoutTransferAttempt | null
  }

  async updateTransferAttemptStatus(
    attemptId: number,
    status: PayoutTransferStatus,
    gatewayResponse?: string,
  ): Promise<PayoutTransferAttempt> {
    const res = await this.prisma.upward_commerce_payout_transfer_attempt.update({
      where: { id: attemptId },
      data: {
        status,
        gatewayResponse,
      },
    })
    return res as unknown as PayoutTransferAttempt
  }
}
