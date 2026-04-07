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
    data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedLandlord> {
    const res = await this.prisma.upward_saved_landlord.create({
      data: {
        userId: data.userId,
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
    } as unknown as SavedLandlord
  }

  async findByUserId(userId: number): Promise<SavedLandlord[]> {
    const res = await this.prisma.upward_saved_landlord.findMany({
      where: { userId },
      orderBy: { lastPaid: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      lastAmount: r.lastAmount ?? undefined,
      lastPaid: r.lastPaid ?? undefined,
    })) as unknown as SavedLandlord[]
  }

  async findById(id: number): Promise<SavedLandlord | null> {
    const res = await this.prisma.upward_saved_landlord.findUnique({
      where: { id },
    })
    if (!res) return null
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
    } as unknown as SavedLandlord
  }

  async findByUuid(uuid: string): Promise<SavedLandlord | null> {
    const res = await this.prisma.upward_saved_landlord.findUnique({
      where: { uuid },
    })
    if (!res) return null
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
    } as unknown as SavedLandlord
  }

  async update(id: number, data: Partial<SavedLandlord>): Promise<SavedLandlord> {
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
    } as unknown as SavedLandlord
  }
}

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const res = await this.prisma.upward_transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: data.status,
        amount: data.amount,
        reference: data.reference,
        narration: data.narration,
        landlordId: data.landlordId,
        paymentType: data.paymentType,
        propertyAddress: data.propertyAddress,
        lineItems: data.lineItems || undefined,
        walletId: data.walletId,
        goalId: data.goalId,
      },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
  }

  async findByUserId(userId: number): Promise<Transaction[]> {
    const res = await this.prisma.upward_transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      narration: r.narration ?? undefined,
      landlordId: r.landlordId ?? undefined,
      paymentType: r.paymentType ?? undefined,
      propertyAddress: r.propertyAddress ?? undefined,
      lineItems: r.lineItems || undefined,
      walletId: r.walletId ?? undefined,
      goalId: r.goalId ?? undefined,
    })) as unknown as Transaction[]
  }

  async findById(id: number): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { id },
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
  }

  async findByUuid(uuid: string): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { uuid },
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
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
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
  }

  async updateStatus(id: number, status: string): Promise<Transaction> {
    const res = await this.prisma.upward_transaction.update({
      where: { id },
      data: { status },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
  }

  async update(id: number, data: Partial<Transaction>): Promise<Transaction> {
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
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      lineItems: res.lineItems || undefined,
      walletId: res.walletId ?? undefined,
      goalId: res.goalId ?? undefined,
    } as unknown as Transaction
  }
}
