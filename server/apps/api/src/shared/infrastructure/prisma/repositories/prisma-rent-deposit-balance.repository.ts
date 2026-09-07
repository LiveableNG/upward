import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import {
  IRentDepositBalanceRepository,
  RentDepositBalance,
  RentDepositTransaction,
} from '../../../../domains/payments/rent-deposit.repository'

@Injectable()
export class PrismaRentDepositBalanceRepository implements IRentDepositBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateBalance(
    userId: number,
    userPropertyId: number,
    currency = 'NGN',
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_balance.upsert({
      where: {
        userId_userPropertyId: {
          userId,
          userPropertyId,
        },
      },
      update: {},
      create: {
        userId,
        userPropertyId,
        balance: 0,
        currency,
      },
      include: {
        userProperty: {
          include: { location: true, dedicatedAccount: true },
        },
      },
    })
    return record as unknown as RentDepositBalance
  }

  async findByUserAndProperty(
    userId: number,
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance | null> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_balance.findUnique({
      where: {
        userId_userPropertyId: {
          userId,
          userPropertyId,
        },
      },
      include: {
        userProperty: {
          include: { location: true, dedicatedAccount: true },
        },
      },
    })
    return record as unknown as RentDepositBalance | null
  }

  async findByUserId(
    userId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance[]> {
    const client = (tx || this.prisma) as any
    const records = await client.upward_rent_deposit_balance.findMany({
      where: { userId },
      include: {
        userProperty: {
          include: { location: true, dedicatedAccount: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    return records as unknown as RentDepositBalance[]
  }

  async createTransaction(
    data: {
      depositBalanceId: number
      userId: number
      userPropertyId: number
      paymentRequestId?: number | null
      type: 'CREDIT' | 'DEBIT'
      amount: number
      balanceBefore: number
      balanceAfter: number
      source: string
      status?: string
      reference: string
      narration?: string | null
      metadata?: any
      receiptUrl?: string | null
    },
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_transaction.create({
      data: {
        depositBalanceId: data.depositBalanceId,
        userId: data.userId,
        userPropertyId: data.userPropertyId,
        paymentRequestId: data.paymentRequestId ?? null,
        type: data.type,
        amount: data.amount,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        source: data.source,
        status: data.status || 'SUCCESS',
        reference: data.reference,
        narration: data.narration ?? null,
        metadata: data.metadata ?? null,
        receiptUrl: data.receiptUrl ?? null,
      },
      include: {
        userProperty: {
          include: { location: true },
        },
        paymentRequest: true,
      },
    })
    return record as unknown as RentDepositTransaction
  }

  async updateBalance(
    id: number,
    newBalance: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_balance.update({
      where: { id },
      data: {
        balance: newBalance,
      },
    })
    return record as unknown as RentDepositBalance
  }

  async getTransactionsByBalanceId(
    depositBalanceId: number,
    limit = 50,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction[]> {
    const client = (tx || this.prisma) as any
    const records = await client.upward_rent_deposit_transaction.findMany({
      where: { depositBalanceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        userProperty: {
          include: { location: true },
        },
        paymentRequest: true,
      },
    })
    return records as unknown as RentDepositTransaction[]
  }

  async getTransactionsByUserId(
    userId: number,
    limit = 50,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction[]> {
    const client = (tx || this.prisma) as any
    const records = await client.upward_rent_deposit_transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        userProperty: {
          include: { location: true },
        },
        paymentRequest: true,
      },
    })
    return records as unknown as RentDepositTransaction[]
  }

  async findTransactionByReference(
    reference: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction | null> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_transaction.findUnique({
      where: { reference },
      include: {
        user: true,
        userProperty: {
          include: { location: true, dedicatedAccount: true },
        },
        paymentRequest: true,
      },
    })
    return record as unknown as RentDepositTransaction | null
  }

  async findTransactionByUuid(
    uuid: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction | null> {
    const client = (tx || this.prisma) as any
    const record = await client.upward_rent_deposit_transaction.findUnique({
      where: { uuid },
      include: {
        user: true,
        userProperty: {
          include: { location: true, dedicatedAccount: true },
        },
        paymentRequest: true,
      },
    })
    return record as unknown as RentDepositTransaction | null
  }
}
