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
    return {
      id: record.id,
      uuid: record.uuid,
      accountNumber: record.accountNumber,
      accountName: record.accountName,
      bankName: record.bankName,
      bankCode: record.bankCode,
      pmId: record.pmId,
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
    const records = await (this.prisma as any).upward_manual_account.findMany({
      where: { pmId },
      include: {
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
    const record = await (this.prisma as any).upward_manual_account.findUnique({
      where: { uuid },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async findById(id: number): Promise<SettlementAccountEntity | null> {
    const record = await (this.prisma as any).upward_manual_account.findUnique({
      where: { id },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async findPrimaryByPmId(pmId: number): Promise<SettlementAccountEntity | null> {
    const record = await (this.prisma as any).upward_manual_account.findFirst({
      where: { pmId, isPrimary: true },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return record ? this.mapAccount(record) : null;
  }

  async create(data: CreateSettlementAccountData): Promise<SettlementAccountEntity> {
    const created = await (this.prisma as any).upward_manual_account.create({
      data: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        pmId: data.pmId,
        isPrimary: data.isPrimary || false,
      },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return this.mapAccount(created);
  }

  async update(id: number, data: UpdateSettlementAccountData): Promise<SettlementAccountEntity> {
    const updated = await (this.prisma as any).upward_manual_account.update({
      where: { id },
      data: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        isPrimary: data.isPrimary,
      },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true },
        },
      },
    });
    return this.mapAccount(updated);
  }

  async delete(id: number): Promise<boolean> {
    await (this.prisma as any).upward_pm_property.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null },
    });
    await (this.prisma as any).upward_user_property.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null },
    });
    await (this.prisma as any).upward_pm_payment_request.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null },
    });
    await (this.prisma as any).upward_payment_request.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null },
    });
    await (this.prisma as any).upward_manual_account.delete({
      where: { id },
    });
    return true;
  }

  async setPrimary(id: number, pmId: number): Promise<SettlementAccountEntity> {
    return this.prisma.$transaction(async (tx: any) => {
      // Unset all other accounts for this pmId
      await tx.upward_manual_account.updateMany({
        where: { pmId, id: { not: id } },
        data: { isPrimary: false },
      });

      // Set target account as primary
      const primary = await tx.upward_manual_account.update({
        where: { id },
        data: { isPrimary: true },
        include: {
          pmProperties: {
            select: { id: true, uuid: true, name: true },
          },
        },
      });

      // Sync PM profile
      await tx.upward_property_manager.update({
        where: { id: pmId },
        data: {
          bankName: primary.bankName,
          bankCode: primary.bankCode,
          accountNumber: primary.accountNumber,
          accountName: primary.accountName,
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
      where: { manualAccountId: accountId, id: { notIn: propertyIds } },
      data: { manualAccountId: null },
    });

    // Link new ones
    if (propertyIds.length > 0) {
      await (this.prisma as any).upward_pm_property.updateMany({
        where: { id: { in: propertyIds } },
        data: { manualAccountId: accountId },
      });

      // Also propagate to linked user properties if any
      const pmUnits = await (this.prisma as any).upward_pm_unit.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { id: true },
      });
      const pmUnitIds = pmUnits.map((u: any) => u.id);
      if (pmUnitIds.length > 0) {
        await (this.prisma as any).upward_user_property.updateMany({
          where: { pmUnitId: { in: pmUnitIds } },
          data: { manualAccountId: accountId },
        });
      }
    }

    return true;
  }
}
