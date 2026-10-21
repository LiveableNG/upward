import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IRentSettlementRepository,
  CreateSettlementDto,
} from '../../domains/rent-savings/rent-settlement.repository'
import { RentSettlement } from '../../domains/rent-savings/rent-vault.types'

@Injectable()
export class PrismaRentSettlementRepository implements IRentSettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown) {
    return (tx as PrismaService) || this.prisma
  }

  async create(data: CreateSettlementDto, tx?: unknown): Promise<RentSettlement> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_settlement.create({
      data: {
        vaultId: data.vaultId,
        userId: data.userId,
        landlordBankCode: data.landlordBankCode,
        landlordAccountNumber: data.landlordAccountNumber,
        landlordName: data.landlordName,
        propertyAddress: data.propertyAddress ?? null,
        amountPaidToLandlordKobo: data.amountPaidToLandlordKobo,
        cashbackCreditedKobo: data.cashbackCreditedKobo ?? 0n,
        earlyBirdMultiplierApplied: data.earlyBirdMultiplierApplied ?? false,
        nipSessionId: data.nipSessionId ?? null,
        settlementReference: data.settlementReference,
        receiptPdfUrl: data.receiptPdfUrl ?? null,
        settlementStatus: data.settlementStatus ?? 'PAID',
        smsAlertDispatched: data.smsAlertDispatched ?? false,
        disburseSurplusToWallet: data.disburseSurplusToWallet ?? true,
      },
    })
    return this.mapSettlement(record)
  }

  async findById(id: number, tx?: unknown): Promise<RentSettlement | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_settlement.findUnique({
      where: { id },
    })
    return record ? this.mapSettlement(record) : null
  }

  async findByUuid(uuid: string, tx?: unknown): Promise<RentSettlement | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_settlement.findUnique({
      where: { uuid },
    })
    return record ? this.mapSettlement(record) : null
  }

  async findByVaultId(vaultId: number, tx?: unknown): Promise<RentSettlement | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_settlement.findFirst({
      where: { vaultId },
      orderBy: { createdAt: 'desc' },
    })
    return record ? this.mapSettlement(record) : null
  }

  async findByReference(reference: string, tx?: unknown): Promise<RentSettlement | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_settlement.findUnique({
      where: { settlementReference: reference },
    })
    return record ? this.mapSettlement(record) : null
  }

  async update(id: number, data: Partial<RentSettlement>, tx?: unknown): Promise<RentSettlement> {
    const client = this.getClient(tx)
    const updatePayload: Record<string, unknown> = {}

    if (data.nipSessionId !== undefined) updatePayload.nipSessionId = data.nipSessionId
    if (data.receiptPdfUrl !== undefined) updatePayload.receiptPdfUrl = data.receiptPdfUrl
    if (data.settlementStatus !== undefined) updatePayload.settlementStatus = data.settlementStatus
    if (data.smsAlertDispatched !== undefined)
      updatePayload.smsAlertDispatched = data.smsAlertDispatched

    const record = await client.upward_rent_settlement.update({
      where: { id },
      data: updatePayload,
    })
    return this.mapSettlement(record)
  }

  private mapSettlement(record: any): RentSettlement {
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      landlordBankCode: record.landlordBankCode,
      landlordAccountNumber: record.landlordAccountNumber,
      landlordName: record.landlordName,
      propertyAddress: record.propertyAddress,
      amountPaidToLandlordKobo: record.amountPaidToLandlordKobo,
      cashbackCreditedKobo: record.cashbackCreditedKobo,
      earlyBirdMultiplierApplied: record.earlyBirdMultiplierApplied,
      nipSessionId: record.nipSessionId,
      settlementReference: record.settlementReference,
      receiptPdfUrl: record.receiptPdfUrl,
      settlementStatus: record.settlementStatus as RentSettlement['settlementStatus'],
      smsAlertDispatched: record.smsAlertDispatched,
      disburseSurplusToWallet: record.disburseSurplusToWallet,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}
