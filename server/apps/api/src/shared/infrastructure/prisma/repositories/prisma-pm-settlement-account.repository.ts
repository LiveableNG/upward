import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  ISettlementAccountRepository,
  SettlementAccountEntity,
  CreateSettlementAccountData,
  UpdateSettlementAccountData,
} from '../../../../domains/pm/ISettlementAccountRepository';

@Injectable()
export class PrismaPmSettlementAccountRepository implements ISettlementAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapAccount(record: any): SettlementAccountEntity {
    const bankDetails = record.manualAccount || record;
    return {
      id: record.id,
      uuid: record.uuid,
      accountNumber: bankDetails.accountNumber || '',
      accountName: bankDetails.accountName || '',
      bankName: bankDetails.bankName || '',
      bankCode: bankDetails.bankCode || null,
      title: record.title || null,
      pmId: record.pmId ?? null,
      isPrimary: Boolean(record.isPrimary),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      pmProperties: record.pmProperties?.map((p: any) => ({
        id: p.id,
        uuid: p.uuid,
        name: p.name,
      })) || [],
    };
  }

  async findByPmId(pmId: number): Promise<SettlementAccountEntity[]> {
    const records = await (this.prisma as any).upward_settlement_account.findMany({
      where: { pmId },
      include: {
        manualAccount: true,
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    return records.map((r: any) => this.mapAccount(r));
  }

  async findByUuid(uuid: string): Promise<SettlementAccountEntity | null> {
    const record = await (this.prisma as any).upward_settlement_account.findUnique({
      where: { uuid },
      include: {
        manualAccount: true,
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async findById(id: number): Promise<SettlementAccountEntity | null> {
    const record = await (this.prisma as any).upward_settlement_account.findUnique({
      where: { id },
      include: {
        manualAccount: true,
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async findPrimaryByPmId(pmId: number): Promise<SettlementAccountEntity | null> {
    const record = await (this.prisma as any).upward_settlement_account.findFirst({
      where: { pmId, isPrimary: true },
      include: {
        manualAccount: true,
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async create(data: CreateSettlementAccountData): Promise<SettlementAccountEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Find or create pure bank details in upward_manual_account
      let manualAccount = await tx.upward_manual_account.findFirst({
        where: {
          accountNumber: data.accountNumber,
          bankCode: data.bankCode || undefined,
        },
      });

      if (!manualAccount) {
        manualAccount = await tx.upward_manual_account.create({
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
            title: data.title,
            pmId: data.pmId,
            isPrimary: data.isPrimary || false,
          },
        });
      }

      // Check if this is the first account for this PM
      const count = await tx.upward_settlement_account.count({
        where: { pmId: data.pmId },
      });
      const shouldBePrimary = data.isPrimary || count === 0;

      if (shouldBePrimary) {
        await tx.upward_settlement_account.updateMany({
          where: { pmId: data.pmId },
          data: { isPrimary: false },
        });
      }

      // 2. Create organization settlement account
      const settlementAccount = await tx.upward_settlement_account.create({
        data: {
          manualAccountId: manualAccount.id,
          pmId: data.pmId,
          isPrimary: shouldBePrimary,
          title: data.title || (shouldBePrimary ? 'Primary Settlement Account' : 'Settlement Account'),
        },
        include: {
          manualAccount: true,
          pmProperties: {
            select: { id: true, uuid: true, name: true },
          },
        },
      });

      // 3. Sync PM profile if primary
      if (shouldBePrimary) {
        await tx.upward_property_manager.update({
          where: { id: data.pmId },
          data: {
            bankName: manualAccount.bankName,
            bankCode: manualAccount.bankCode,
            accountNumber: manualAccount.accountNumber,
            accountName: manualAccount.accountName,
          },
        });
      }

      return this.mapAccount(settlementAccount);
    });
  }

  async update(id: number, data: UpdateSettlementAccountData): Promise<SettlementAccountEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.upward_settlement_account.findUnique({
        where: { id },
        include: { manualAccount: true },
      });
      if (!existing) {
        throw new NotFoundException('Settlement account not found');
      }

      // Update bank details in manualAccount if provided
      if (data.accountNumber || data.accountName || data.bankName || data.bankCode) {
        await tx.upward_manual_account.update({
          where: { id: existing.manualAccountId },
          data: {
            accountNumber: data.accountNumber ?? existing.manualAccount.accountNumber,
            accountName: data.accountName ?? existing.manualAccount.accountName,
            bankName: data.bankName ?? existing.manualAccount.bankName,
            bankCode: data.bankCode ?? existing.manualAccount.bankCode,
            title: data.title ?? existing.title,
          },
        });
      }

      if (data.isPrimary && existing.pmId) {
        await tx.upward_settlement_account.updateMany({
          where: { pmId: existing.pmId, id: { not: id } },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.upward_settlement_account.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : existing.title,
          isPrimary: data.isPrimary !== undefined ? data.isPrimary : existing.isPrimary,
        },
        include: {
          manualAccount: true,
          pmProperties: {
            select: { id: true, uuid: true, name: true },
          },
        },
      });

      if (updated.isPrimary && updated.pmId) {
        const ma = updated.manualAccount;
        await tx.upward_property_manager.update({
          where: { id: updated.pmId },
          data: {
            bankName: ma.bankName,
            bankCode: ma.bankCode,
            accountNumber: ma.accountNumber,
            accountName: ma.accountName,
          },
        });
      }

      return this.mapAccount(updated);
    });
  }

  async delete(id: number): Promise<boolean> {
    const existing = await (this.prisma as any).upward_settlement_account.findUnique({
      where: { id },
    });
    if (!existing) return true;

    // Unlink any properties assigned to this settlement account
    await (this.prisma as any).upward_pm_property.updateMany({
      where: { settlementAccountId: id },
      data: { settlementAccountId: null },
    });

    await (this.prisma as any).upward_settlement_account.delete({
      where: { id },
    });
    return true;
  }

  async setPrimary(id: number, pmId: number): Promise<SettlementAccountEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      // Unset all other accounts for this pmId
      await tx.upward_settlement_account.updateMany({
        where: { pmId, id: { not: id } },
        data: { isPrimary: false },
      });

      // Set target account as primary
      const primary = await tx.upward_settlement_account.update({
        where: { id },
        data: { isPrimary: true },
        include: {
          manualAccount: true,
          pmProperties: {
            select: { id: true, uuid: true, name: true },
          },
        },
      });

      // Sync PM profile
      const ma = primary.manualAccount;
      await tx.upward_property_manager.update({
        where: { id: pmId },
        data: {
          bankName: ma.bankName,
          bankCode: ma.bankCode,
          accountNumber: ma.accountNumber,
          accountName: ma.accountName,
        },
      });

      return this.mapAccount(primary);
    });
  }

  async linkProperties(accountId: number, pmId: number, propertyUuids: string[]): Promise<boolean> {
    const properties = await (this.prisma as any).upward_pm_property.findMany({
      where: { uuid: { in: propertyUuids }, pmId },
      select: { id: true },
    });
    const propertyIds = properties.map((p: any) => p.id);

    // Unlink old properties for this account that are not in the new set
    await (this.prisma as any).upward_pm_property.updateMany({
      where: { settlementAccountId: accountId, id: { notIn: propertyIds } },
      data: { settlementAccountId: null },
    });

    // Link new ones
    if (propertyIds.length > 0) {
      await (this.prisma as any).upward_pm_property.updateMany({
        where: { id: { in: propertyIds } },
        data: { settlementAccountId: accountId },
      });
    }

    return true;
  }
}
