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
      bankSlug: item.bankSlug ?? null,
      isDefault: item.isDefault ?? false,
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

    const isDefault = data.isDefault ?? true

    if (isDefault) {
      await (prisma as any).upward_dedicated_virtual_account.updateMany({
        where: { userPropertyId: data.userPropertyId },
        data: { isDefault: false },
      })
    }

    const created = await (prisma as any).upward_dedicated_virtual_account.upsert({
      where: { accountNumber: data.accountNumber },
      update: {
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        bankSlug: data.bankSlug,
        isDefault,
        metadata: data.metadata as any,
        userPropertyId: data.userPropertyId,
      },
      create: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        bankSlug: data.bankSlug,
        isDefault,
        accountCode: data.accountCode,
        paystackCustomerId: data.paystackCustomerId,
        userPropertyId: data.userPropertyId,
        metadata: data.metadata as any,
      },
    })
    return this.mapToDomain(created)
  }

  async findByUserPropertyId(userPropertyId: number): Promise<DVAAccount | null> {
    const item = await (this.prisma as any).upward_dedicated_virtual_account.findFirst({
      where: { userPropertyId, isDefault: true },
      orderBy: { updatedAt: 'desc' },
    }) || await (this.prisma as any).upward_dedicated_virtual_account.findFirst({
      where: { userPropertyId },
      orderBy: { updatedAt: 'desc' },
    })
    return item ? this.mapToDomain(item) : null
  }

  async findAllByUserPropertyId(userPropertyId: number): Promise<DVAAccount[]> {
    const items = await (this.prisma as any).upward_dedicated_virtual_account.findMany({
      where: { userPropertyId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })
    return items.map((i: any) => this.mapToDomain(i))
  }

  async setDefault(id: number, userPropertyId: number, tx?: Prisma.TransactionClient): Promise<void> {
    const prisma = tx || this.prisma
    await (prisma as any).upward_dedicated_virtual_account.updateMany({
      where: { userPropertyId },
      data: { isDefault: false },
    })
    await (prisma as any).upward_dedicated_virtual_account.update({
      where: { id },
      data: { isDefault: true },
    })
  }

  async findByAccountNumber(accountNumber: string): Promise<DVAAccount | null> {
    const item = await (this.prisma as any).upward_dedicated_virtual_account.findUnique({
      where: { accountNumber },
    })
    return item ? this.mapToDomain(item) : null
  }
}

