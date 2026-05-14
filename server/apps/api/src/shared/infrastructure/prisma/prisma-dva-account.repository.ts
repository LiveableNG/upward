import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { IDVAAccountRepository, DVAAccount } from '../../../domains/payments/payment.repository'
import { Prisma } from '@prisma/client'

@Injectable()
export class PrismaDVAAccountRepository implements IDVAAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(item: any): DVAAccount {
    return {
      id: item.id,
      uuid: item.uuid,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      bankName: item.bankName,
      bankCode: item.bankCode,
      accountCode: item.accountCode,
      paystackCustomerId: item.paystackCustomerId,
      userPropertyId: item.userPropertyId,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }

  async create(data: Omit<DVAAccount, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<DVAAccount> {
    const prisma = tx || this.prisma

    const created = await prisma.upward_dedicated_virtual_account.upsert({
      where: { userPropertyId: data.userPropertyId },
      update: {
        metadata: data.metadata as any,
      },
      create: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        accountCode: data.accountCode,
        paystackCustomerId: data.paystackCustomerId,
        userPropertyId: data.userPropertyId,
        metadata: data.metadata as any,
      },
    })
    return this.mapToDomain(created)
  }

  async findByUserPropertyId(userPropertyId: number): Promise<DVAAccount | null> {
    const item = await this.prisma.upward_dedicated_virtual_account.findUnique({
      where: { userPropertyId },
    })
    return item ? this.mapToDomain(item) : null
  }

  async findByAccountNumber(accountNumber: string): Promise<DVAAccount | null> {
    const item = await this.prisma.upward_dedicated_virtual_account.findUnique({
      where: { accountNumber },
    })
    return item ? this.mapToDomain(item) : null
  }
}
