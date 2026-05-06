import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import {
  PaymentLineItem,
  IPaymentLineItemRepository,
} from '../../../../domains/payments/payment.repository'

@Injectable()
export class PrismaPaymentLineItemRepository implements IPaymentLineItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: any): PaymentLineItem {
    return {
      id: row.id,
      uuid: row.uuid,
      paymentRequestId: row.paymentRequestId,
      name: row.name,
      totalAmount: row.totalAmount,
      amountPaid: row.amountPaid,
      status: row.status,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async create(
    data: Omit<PaymentLineItem, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentLineItem> {
    const prisma = tx || this.prisma
    const row = await prisma.upward_payment_line_item.create({
      data: {
        paymentRequestId: data.paymentRequestId,
        name: data.name,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid ?? 0,
        status: data.status ?? 'PENDING',
        sortOrder: data.sortOrder ?? 0,
      },
    })
    return this.map(row)
  }

  async bulkCreate(
    items: Omit<PaymentLineItem, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>[],
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentLineItem[]> {
    return Promise.all(items.map((item) => this.create(item, tx)))
  }

  async findByPaymentRequestId(
    paymentRequestId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentLineItem[]> {
    const prisma = tx || this.prisma
    const rows = await prisma.upward_payment_line_item.findMany({
      where: { paymentRequestId },
      orderBy: { sortOrder: 'asc' },
    })
    return rows.map(this.map)
  }

  async update(
    id: number,
    data: Partial<PaymentLineItem>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentLineItem> {
    const prisma = tx || this.prisma
    const row = await prisma.upward_payment_line_item.update({
      where: { id },
      data: {
        name: data.name,
        totalAmount: data.totalAmount,
        amountPaid: data.amountPaid,
        status: data.status,
        sortOrder: data.sortOrder,
      },
    })
    return this.map(row)
  }

  async deleteByPaymentRequestId(
    paymentRequestId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const prisma = tx || this.prisma
    await prisma.upward_payment_line_item.deleteMany({
      where: { paymentRequestId },
    })
  }
}
