import { Prisma } from '@prisma/client'

export interface RentCycle {
  id?: number
  uuid: string
  userId: number
  userPropertyId?: number
  paymentRequestId?: number
  source: 'MANUAL' | 'PAYMENT_REQUEST' | 'PAST_RECORD'
  amountOwed: number
  amountPaid: number
  currency: string
  dueDate: Date
  paidAt?: Date | null
  status: 'PENDING' | 'PAID_ON_TIME' | 'PAID_LATE' | 'PARTIAL_ON_TIME' | 'PARTIAL_LATE' | 'MISSED'
  description?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IRentCycleRepository {
  create(data: Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<RentCycle>
  update(id: number, data: Partial<RentCycle>, tx?: Prisma.TransactionClient): Promise<RentCycle>
  findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<RentCycle[]>
  findByUserPropertyId(propertyId: number, tx?: Prisma.TransactionClient): Promise<RentCycle[]>
  findByPaymentRequestId(paymentRequestId: number, tx?: Prisma.TransactionClient): Promise<RentCycle | null>
  upsertByPaymentRequestId(paymentRequestId: number, data: Partial<Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>>, tx?: Prisma.TransactionClient): Promise<RentCycle>
}

export const RENT_CYCLE_REPOSITORY = Symbol('RENT_CYCLE_REPOSITORY')
