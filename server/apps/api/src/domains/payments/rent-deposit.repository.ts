import { Prisma } from '@prisma/client'

export interface RentDepositBalance {
  id: number
  uuid: string
  userId: number
  userPropertyId: number
  balance: number
  currency: string
  createdAt: Date
  updatedAt: Date
  user?: any
  userProperty?: any
  transactions?: RentDepositTransaction[]
}

export interface RentDepositTransaction {
  id: number
  uuid: string
  depositBalanceId: number
  userId: number
  userPropertyId: number
  paymentRequestId?: number | null
  type: 'CREDIT' | 'DEBIT' | string
  amount: number
  balanceBefore: number
  balanceAfter: number
  source: string
  status: string
  reference: string
  narration?: string | null
  receiptUrl?: string | null
  metadata?: any
  createdAt: Date
  updatedAt: Date
  user?: any
  userProperty?: any
  paymentRequest?: any
}

export interface IRentDepositBalanceRepository {
  findOrCreateBalance(
    userId: number,
    userPropertyId: number,
    currency?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance>

  findByUserAndProperty(
    userId: number,
    userPropertyId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance | null>

  findByUserId(
    userId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance[]>

  createTransaction(
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
  ): Promise<RentDepositTransaction>

  updateBalance(
    id: number,
    newBalance: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositBalance>

  getTransactionsByBalanceId(
    depositBalanceId: number,
    limit?: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction[]>

  getTransactionsByUserId(
    userId: number,
    limit?: number,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction[]>

  findTransactionByReference(
    reference: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction | null>

  findTransactionByUuid(
    uuid: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RentDepositTransaction | null>
}

export const RENT_DEPOSIT_BALANCE_REPOSITORY = Symbol('RENT_DEPOSIT_BALANCE_REPOSITORY')
