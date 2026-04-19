import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { RentCycle, IRentCycleRepository } from '../../../../domains/scoring/rent-cycle.repository'

@Injectable()
export class PrismaRentCycleRepository implements IRentCycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(model: any): RentCycle {
    return {
      id: model.id,
      uuid: model.uuid,
      userId: model.userId,
      userPropertyId: model.userPropertyId,
      paymentRequestId: model.paymentRequestId,
      source: model.source,
      amountOwed: model.amountOwed,
      amountPaid: model.amountPaid,
      currency: model.currency,
      dueDate: model.dueDate,
      paidAt: model.paidAt,
      status: model.status,
      description: model.description,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async create(data: Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<RentCycle> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_rent_cycle.create({
      data: {
        userId: data.userId,
        userPropertyId: data.userPropertyId,
        paymentRequestId: data.paymentRequestId,
        source: data.source,
        amountOwed: data.amountOwed,
        amountPaid: data.amountPaid,
        currency: data.currency,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        status: data.status,
        description: data.description,
      },
    })
    return this.toDomain(record)
  }

  async update(id: number, data: Partial<RentCycle>, tx?: Prisma.TransactionClient): Promise<RentCycle> {
    const prisma = tx || this.prisma
    const record = await prisma.upward_rent_cycle.update({
      where: { id },
      data: {
        amountOwed: data.amountOwed,
        amountPaid: data.amountPaid,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        status: data.status,
        description: data.description,
      },
    })
    return this.toDomain(record)
  }

  async findByUserId(userId: number): Promise<RentCycle[]> {
    const records = await this.prisma.upward_rent_cycle.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    })
    return records.map((r) => this.toDomain(r))
  }

  async findByUserPropertyId(propertyId: number): Promise<RentCycle[]> {
    const records = await this.prisma.upward_rent_cycle.findMany({
      where: { userPropertyId: propertyId },
      orderBy: { dueDate: 'asc' },
    })
    return records.map((r) => this.toDomain(r))
  }

  async findByPaymentRequestId(paymentRequestId: number): Promise<RentCycle | null> {
    const record = await this.prisma.upward_rent_cycle.findFirst({
      where: { paymentRequestId },
    })
    return record ? this.toDomain(record) : null
  }

  async upsertByPaymentRequestId(
    paymentRequestId: number, 
    data: Partial<Omit<RentCycle, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>>,
    tx?: Prisma.TransactionClient
  ): Promise<RentCycle> {
    const prisma = tx || this.prisma
    const existing = await prisma.upward_rent_cycle.findFirst({
      where: { paymentRequestId },
    })

    if (existing) {
      const record = await prisma.upward_rent_cycle.update({
        where: { id: existing.id },
        data: {
          amountOwed: data.amountOwed,
          amountPaid: data.amountPaid,
          dueDate: data.dueDate,
          paidAt: data.paidAt,
          status: data.status,
          description: data.description,
        },
      })
      return this.toDomain(record)
    }

    // Ensure all required fields exist for initial creation
    if (data.userId === undefined || data.amountOwed === undefined || data.dueDate === undefined) {
       throw new Error('Cannot create rent cycle: missing required fields for initial upsert')
    }

    const record = await prisma.upward_rent_cycle.create({
      data: {
        userId: data.userId,
        userPropertyId: data.userPropertyId,
        paymentRequestId: paymentRequestId,
        source: data.source || 'PAYMENT_REQUEST',
        amountOwed: data.amountOwed,
        amountPaid: data.amountPaid || 0,
        currency: data.currency || 'NGN',
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        status: data.status || 'PENDING',
        description: data.description,
      },
    })
    return this.toDomain(record)
  }
}
