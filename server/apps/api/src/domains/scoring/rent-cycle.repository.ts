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
  create(data: Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: any): Promise<RentCycle>
  update(id: number, data: Partial<RentCycle>, tx?: any): Promise<RentCycle>
  findByUserId(userId: number, tx?: any): Promise<RentCycle[]>
  findByUserPropertyId(propertyId: number, tx?: any): Promise<RentCycle[]>
  findByPaymentRequestId(paymentRequestId: number, tx?: any): Promise<RentCycle | null>
  upsertByPaymentRequestId(paymentRequestId: number, data: Partial<Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>>, tx?: any): Promise<RentCycle>
}

export const RENT_CYCLE_REPOSITORY = Symbol('RENT_CYCLE_REPOSITORY')
