import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IRentAdvanceRepository,
  CreateAdvanceDto,
} from '../../domains/rent-savings/rent-advance.repository'
import { RentAdvance } from '../../domains/rent-savings/rent-vault.types'

@Injectable()
export class PrismaRentAdvanceRepository implements IRentAdvanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown) {
    return (tx as PrismaService) || this.prisma
  }

  async create(data: CreateAdvanceDto, tx?: unknown): Promise<RentAdvance> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_advance.create({
      data: {
        vaultId: data.vaultId,
        userId: data.userId,
        borrowedAmountKobo: data.borrowedAmountKobo,
        facilityFeeKobo: data.facilityFeeKobo,
        totalRepayableKobo: data.totalRepayableKobo,
        repaymentDueDate: data.repaymentDueDate,
        destinationBankCode: data.destinationBankCode,
        destinationAccountNumber: data.destinationAccountNumber,
        destinationAccountName: data.destinationAccountName ?? null,
        payoutTransferReference: data.payoutTransferReference ?? null,
      },
    })
    return this.mapAdvance(record)
  }

  async findById(id: number, tx?: unknown): Promise<RentAdvance | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_advance.findUnique({
      where: { id },
    })
    return record ? this.mapAdvance(record) : null
  }

  async findByUuid(uuid: string, tx?: unknown): Promise<RentAdvance | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_advance.findUnique({
      where: { uuid },
    })
    return record ? this.mapAdvance(record) : null
  }

  async findActiveByVaultId(vaultId: number, tx?: unknown): Promise<RentAdvance | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_advance.findFirst({
      where: {
        vaultId,
        status: { in: ['ACTIVE', 'DEFAULTED'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.mapAdvance(record) : null
  }

  async findActiveByUserId(userId: number, tx?: unknown): Promise<RentAdvance[]> {
    const client = this.getClient(tx)
    const records = await client.upward_rent_advance.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'DEFAULTED'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    return records.map((r) => this.mapAdvance(r))
  }

  async findOverdueAdvances(asOfDate: Date, tx?: unknown): Promise<RentAdvance[]> {
    const client = this.getClient(tx)
    const records = await client.upward_rent_advance.findMany({
      where: {
        status: 'ACTIVE',
        repaymentDueDate: { lt: asOfDate },
      },
    })
    return records.map((r) => this.mapAdvance(r))
  }

  async update(id: number, data: Partial<RentAdvance>, tx?: unknown): Promise<RentAdvance> {
    const client = this.getClient(tx)
    const updatePayload: Record<string, unknown> = {}

    if (data.latePenaltiesKobo !== undefined)
      updatePayload.latePenaltiesKobo = data.latePenaltiesKobo
    if (data.amountRepaidKobo !== undefined) updatePayload.amountRepaidKobo = data.amountRepaidKobo
    if (data.status !== undefined) updatePayload.status = data.status
    if (data.payoutTransferReference !== undefined)
      updatePayload.payoutTransferReference = data.payoutTransferReference
    if (data.repaidAt !== undefined) updatePayload.repaidAt = data.repaidAt

    const record = await client.upward_rent_advance.update({
      where: { id },
      data: updatePayload,
    })
    return this.mapAdvance(record)
  }

  private mapAdvance(record: any): RentAdvance {
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      borrowedAmountKobo: record.borrowedAmountKobo,
      facilityFeeKobo: record.facilityFeeKobo,
      totalRepayableKobo: record.totalRepayableKobo,
      repaymentDueDate: record.repaymentDueDate,
      latePenaltiesKobo: record.latePenaltiesKobo,
      amountRepaidKobo: record.amountRepaidKobo,
      status: record.status as RentAdvance['status'],
      destinationBankCode: record.destinationBankCode,
      destinationAccountNumber: record.destinationAccountNumber,
      destinationAccountName: record.destinationAccountName,
      payoutTransferReference: record.payoutTransferReference,
      repaidAt: record.repaidAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
