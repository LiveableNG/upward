import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IRentVaultRepository,
  CreateVaultDto,
} from '../../domains/rent-savings/rent-vault.repository'
import {
  RentVault,
  RentVaultTransaction,
  RentSavingsScore,
} from '../../domains/rent-savings/rent-vault.types'

@Injectable()
export class PrismaRentVaultRepository implements IRentVaultRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: unknown) {
    return (tx as PrismaService) || this.prisma
  }

  async create(data: CreateVaultDto, tx?: unknown): Promise<RentVault> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.create({
      data: {
        userId: data.userId,
        targetAmountKobo: data.targetAmountKobo,
        currentPrincipalKobo: data.currentPrincipalKobo ?? 0n,
        accruedYieldKobo: data.accruedYieldKobo ?? 0n,
        cadence: data.cadence,
        contractualDueDate: data.contractualDueDate,
        unlockDate: data.unlockDate,
        lockStatus: data.lockStatus ?? 'LOCKED',
        preferredFundingMethod: data.preferredFundingMethod,
        paydayDayOfMonth: data.paydayDayOfMonth ?? null,
        cardAuthorizationCode: data.cardAuthorizationCode ?? null,
        dvaBankName: data.dvaBankName ?? null,
        dvaAccountNumber: data.dvaAccountNumber ?? null,
        dvaAccountName: data.dvaAccountName ?? null,
        dvaCustomerCode: data.dvaCustomerCode ?? null,
        dvaAssignmentStatus: data.dvaAssignmentStatus ?? 'PENDING',
        autoBypassPmApproval: data.autoBypassPmApproval ?? true,
        investmentProvider: data.investmentProvider ?? 'ARM',
        providerMembershipId: data.providerMembershipId ?? null,
        providerAccountNumber: data.providerAccountNumber ?? null,
        providerCrmStatus: data.providerCrmStatus ?? null,
        armPurchaseId: data.armPurchaseId ?? null,
        armWithdrawalId: data.armWithdrawalId ?? null,
        lastYieldSyncAt: data.lastYieldSyncAt ?? null,
      },
      include: {
        savingsScore: true,
      },
    })
    return this.mapVault(record)
  }

  async findById(id: number, tx?: unknown): Promise<RentVault | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.findUnique({
      where: { id },
      include: {
        savingsScore: true,
      },
    })
    return record ? this.mapVault(record) : null
  }

  async findByUuid(uuid: string, tx?: unknown): Promise<RentVault | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.findUnique({
      where: { uuid },
      include: {
        savingsScore: true,
      },
    })
    return record ? this.mapVault(record) : null
  }

  async findActiveByUserId(userId: number, tx?: unknown): Promise<RentVault | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.findFirst({
      where: {
        userId,
        lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        savingsScore: true,
      },
    })
    return record ? this.mapVault(record) : null
  }

  async findActiveVaults(tx?: unknown): Promise<RentVault[]> {
    const client = this.getClient(tx)
    const records = await client.upward_rent_vault.findMany({
      where: {
        lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
      },
      include: {
        savingsScore: true,
      },
    })
    return records.map((r) => this.mapVault(r))
  }

  async findByDvaAccountNumber(accountNumber: string, tx?: unknown): Promise<RentVault | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.findFirst({
      where: { dvaAccountNumber: accountNumber },
      include: {
        savingsScore: true,
      },
    })
    return record ? this.mapVault(record) : null
  }

  async findMaturedLockedVaults(asOfDate: Date, tx?: unknown): Promise<RentVault[]> {
    const client = this.getClient(tx)
    const records = await client.upward_rent_vault.findMany({
      where: {
        lockStatus: 'LOCKED',
        unlockDate: { lte: asOfDate },
      },
      include: {
        savingsScore: true,
      },
    })
    return records.map((r) => this.mapVault(r))
  }

  async update(id: number, data: Partial<RentVault>, tx?: unknown): Promise<RentVault> {
    const client = this.getClient(tx)
    const updatePayload: Record<string, unknown> = {}

    if (data.targetAmountKobo !== undefined) updatePayload.targetAmountKobo = data.targetAmountKobo
    if (data.currentPrincipalKobo !== undefined)
      updatePayload.currentPrincipalKobo = data.currentPrincipalKobo
    if (data.accruedYieldKobo !== undefined) updatePayload.accruedYieldKobo = data.accruedYieldKobo
    if (data.lockStatus !== undefined) updatePayload.lockStatus = data.lockStatus
    if (data.preferredFundingMethod !== undefined)
      updatePayload.preferredFundingMethod = data.preferredFundingMethod
    if (data.paydayDayOfMonth !== undefined) updatePayload.paydayDayOfMonth = data.paydayDayOfMonth
    if (data.cardAuthorizationCode !== undefined)
      updatePayload.cardAuthorizationCode = data.cardAuthorizationCode
    if (data.dvaBankName !== undefined) updatePayload.dvaBankName = data.dvaBankName
    if (data.dvaAccountNumber !== undefined) updatePayload.dvaAccountNumber = data.dvaAccountNumber
    if (data.dvaAccountName !== undefined) updatePayload.dvaAccountName = data.dvaAccountName
    if (data.dvaCustomerCode !== undefined) updatePayload.dvaCustomerCode = data.dvaCustomerCode
    if (data.dvaAssignmentStatus !== undefined)
      updatePayload.dvaAssignmentStatus = data.dvaAssignmentStatus
    if (data.providerMembershipId !== undefined)
      updatePayload.providerMembershipId = data.providerMembershipId
    if (data.providerAccountNumber !== undefined)
      updatePayload.providerAccountNumber = data.providerAccountNumber
    if (data.providerCrmStatus !== undefined)
      updatePayload.providerCrmStatus = data.providerCrmStatus
    if (data.armPurchaseId !== undefined) updatePayload.armPurchaseId = data.armPurchaseId
    if (data.armWithdrawalId !== undefined) updatePayload.armWithdrawalId = data.armWithdrawalId
    if (data.lastYieldSyncAt !== undefined) updatePayload.lastYieldSyncAt = data.lastYieldSyncAt

    const record = await client.upward_rent_vault.update({
      where: { id },
      data: updatePayload,
      include: {
        savingsScore: true,
      },
    })
    return this.mapVault(record)
  }

  async incrementBalances(
    id: number,
    principalDeltaKobo: bigint,
    yieldDeltaKobo: bigint,
    tx?: unknown,
  ): Promise<RentVault> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault.update({
      where: { id },
      data: {
        currentPrincipalKobo: { increment: principalDeltaKobo },
        accruedYieldKobo: { increment: yieldDeltaKobo },
      },
      include: {
        savingsScore: true,
      },
    })
    return this.mapVault(record)
  }

  async createTransaction(
    data: Omit<RentVaultTransaction, 'id' | 'uuid' | 'createdAt'>,
    tx?: unknown,
  ): Promise<RentVaultTransaction> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault_transaction.create({
      data: {
        vaultId: data.vaultId,
        userId: data.userId,
        type: data.type,
        amountKobo: data.amountKobo,
        principalDeltaKobo: data.principalDeltaKobo,
        yieldDeltaKobo: data.yieldDeltaKobo,
        balanceAfterKobo: data.balanceAfterKobo,
        reference: data.reference,
        channel: data.channel ?? null,
        narration: data.narration ?? null,
        metadata: data.metadata ? (data.metadata as any) : undefined,
      },
    })
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      type: record.type as RentVaultTransaction['type'],
      amountKobo: record.amountKobo,
      principalDeltaKobo: record.principalDeltaKobo,
      yieldDeltaKobo: record.yieldDeltaKobo,
      balanceAfterKobo: record.balanceAfterKobo,
      reference: record.reference,
      channel: record.channel,
      narration: record.narration,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt,
    }
  }

  async findTransactionsByVaultId(
    vaultId: number,
    limit: number = 50,
    tx?: unknown,
  ): Promise<RentVaultTransaction[]> {
    const client = this.getClient(tx)
    const records = await client.upward_rent_vault_transaction.findMany({
      where: { vaultId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return records.map((record) => ({
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      type: record.type as RentVaultTransaction['type'],
      amountKobo: record.amountKobo,
      principalDeltaKobo: record.principalDeltaKobo,
      yieldDeltaKobo: record.yieldDeltaKobo,
      balanceAfterKobo: record.balanceAfterKobo,
      reference: record.reference,
      channel: record.channel,
      narration: record.narration,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt,
    }))
  }

  async findTransactionByReference(
    reference: string,
    tx?: unknown,
  ): Promise<RentVaultTransaction | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_vault_transaction.findUnique({
      where: { reference },
    })
    if (!record) return null
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      type: record.type as RentVaultTransaction['type'],
      amountKobo: record.amountKobo,
      principalDeltaKobo: record.principalDeltaKobo,
      yieldDeltaKobo: record.yieldDeltaKobo,
      balanceAfterKobo: record.balanceAfterKobo,
      reference: record.reference,
      channel: record.channel,
      narration: record.narration,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt,
    }
  }

  async upsertSavingsScore(
    vaultId: number,
    userId: number,
    data: Partial<
      Omit<RentSavingsScore, 'id' | 'uuid' | 'vaultId' | 'userId' | 'createdAt' | 'updatedAt'>
    >,
    tx?: unknown,
  ): Promise<RentSavingsScore> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_savings_score.upsert({
      where: { vaultId },
      create: {
        vaultId,
        userId,
        cadencePoints: data.cadencePoints ?? 0,
        velocityPoints: data.velocityPoints ?? 0,
        loanDisciplinePoints: data.loanDisciplinePoints ?? 20,
        totalScore: data.totalScore ?? 20,
        historyLog: data.historyLog ? (data.historyLog as any) : undefined,
      },
      update: {
        ...(data.cadencePoints !== undefined ? { cadencePoints: data.cadencePoints } : {}),
        ...(data.velocityPoints !== undefined ? { velocityPoints: data.velocityPoints } : {}),
        ...(data.loanDisciplinePoints !== undefined
          ? { loanDisciplinePoints: data.loanDisciplinePoints }
          : {}),
        ...(data.totalScore !== undefined ? { totalScore: data.totalScore } : {}),
        ...(data.historyLog ? { historyLog: data.historyLog as any } : {}),
      },
    })
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      cadencePoints: record.cadencePoints,
      velocityPoints: record.velocityPoints,
      loanDisciplinePoints: record.loanDisciplinePoints,
      totalScore: record.totalScore,
      historyLog: record.historyLog as RentSavingsScore['historyLog'],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }

  async findSavingsScoreByVaultId(vaultId: number, tx?: unknown): Promise<RentSavingsScore | null> {
    const client = this.getClient(tx)
    const record = await client.upward_rent_savings_score.findUnique({
      where: { vaultId },
    })
    if (!record) return null
    return {
      id: record.id,
      uuid: record.uuid,
      vaultId: record.vaultId,
      userId: record.userId,
      cadencePoints: record.cadencePoints,
      velocityPoints: record.velocityPoints,
      loanDisciplinePoints: record.loanDisciplinePoints,
      totalScore: record.totalScore,
      historyLog: record.historyLog as RentSavingsScore['historyLog'],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }

  private mapVault(record: any): RentVault {
    return {
      id: record.id,
      uuid: record.uuid,
      userId: record.userId,
      targetAmountKobo: record.targetAmountKobo,
      currentPrincipalKobo: record.currentPrincipalKobo,
      accruedYieldKobo: record.accruedYieldKobo,
      cadence: record.cadence as RentVault['cadence'],
      contractualDueDate: record.contractualDueDate,
      unlockDate: record.unlockDate,
      lockStatus: record.lockStatus as RentVault['lockStatus'],
      preferredFundingMethod: record.preferredFundingMethod as RentVault['preferredFundingMethod'],
      paydayDayOfMonth: record.paydayDayOfMonth,
      cardAuthorizationCode: record.cardAuthorizationCode,
      dvaBankName: record.dvaBankName,
      dvaAccountNumber: record.dvaAccountNumber,
      dvaAccountName: record.dvaAccountName,
      dvaCustomerCode: record.dvaCustomerCode,
      dvaAssignmentStatus: record.dvaAssignmentStatus,
      autoBypassPmApproval: record.autoBypassPmApproval,
      investmentProvider: record.investmentProvider,
      providerMembershipId: record.providerMembershipId,
      providerAccountNumber: record.providerAccountNumber,
      providerCrmStatus: record.providerCrmStatus,
      armPurchaseId: record.armPurchaseId,
      armWithdrawalId: record.armWithdrawalId,
      lastYieldSyncAt: record.lastYieldSyncAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      savingsScore: record.savingsScore
        ? {
            id: record.savingsScore.id,
            uuid: record.savingsScore.uuid,
            vaultId: record.savingsScore.vaultId,
            userId: record.savingsScore.userId,
            cadencePoints: record.savingsScore.cadencePoints,
            velocityPoints: record.savingsScore.velocityPoints,
            loanDisciplinePoints: record.savingsScore.loanDisciplinePoints,
            totalScore: record.savingsScore.totalScore,
            historyLog: record.savingsScore.historyLog,
            createdAt: record.savingsScore.createdAt,
            updatedAt: record.savingsScore.updatedAt,
          }
        : null,
    }
  }
}
