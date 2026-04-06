import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  ISavedLandlordRepository,
  ITransactionRepository,
  SavedLandlord,
  Transaction,
} from '@domains/payments/payment.repository'

@Injectable()
export class PrismaSavedLandlordRepository implements ISavedLandlordRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Omit<SavedLandlord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedLandlord> {
    const res = await this.prisma.upward_saved_landlord.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        lastAmount: data.lastAmount ?? null,
        lastPaid: data.lastPaid ?? null,
      },
    })
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
    } as SavedLandlord
  }

  async findByTenantId(tenantId: string): Promise<SavedLandlord[]> {
    const res = await this.prisma.upward_saved_landlord.findMany({
      where: { tenantId },
      orderBy: { lastPaid: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      lastAmount: r.lastAmount ?? undefined,
      lastPaid: r.lastPaid ?? undefined,
    })) as SavedLandlord[]
  }

  async findById(id: string): Promise<SavedLandlord | null> {
    const res = await this.prisma.upward_saved_landlord.findUnique({
      where: { id },
    })
    if (!res) return null
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
    } as SavedLandlord
  }

  async update(id: string, data: Partial<SavedLandlord>): Promise<SavedLandlord> {
    const res = await this.prisma.upward_saved_landlord.update({
      where: { id },
      data: {
        name: data.name,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        lastAmount: data.lastAmount,
        lastPaid: data.lastPaid,
      },
    })
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
    } as SavedLandlord
  }
}

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const res = await this.prisma.upward_transaction.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        status: data.status,
        amount: data.amount,
        reference: data.reference,
        narration: data.narration,
        landlordId: data.landlordId,
        lineItems: data.lineItems || undefined,
        walletId: data.walletId,
        goalId: data.goalId,
      },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as Transaction
  }

  async findByTenantId(tenantId: string): Promise<Transaction[]> {
    const res = await this.prisma.upward_transaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      narration: r.narration ?? undefined,
      landlordId: r.landlordId ?? undefined,
      lineItems: r.lineItems || undefined,
      walletId: r.walletId ?? undefined,
      goalId: r.goalId ?? undefined,
    })) as Transaction[]
  }

  async findById(id: string): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { id },
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as Transaction
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { reference },
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as Transaction
  }

  async updateStatus(id: string, status: string): Promise<Transaction> {
    const res = await this.prisma.upward_transaction.update({
      where: { id },
      data: { status },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as Transaction
  }

  async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const res = await this.prisma.upward_transaction.update({
      where: { id },
      data: {
        status: data.status,
        narration: data.narration,
      },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as Transaction
  }
}
