import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPropertySettlementSplitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, propertyUuid: string) {
    const property = await this.prisma.upward_pm_property.findUnique({
      where: { uuid: propertyUuid },
      include: {
        manualAccount: true,
        settlementSplitRules: {
          include: {
            manualAccount: true,
          },
          orderBy: { percentage: 'desc' },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.settlementSplitRules.length > 0) {
      return property.settlementSplitRules.map((rule) => ({
        uuid: rule.uuid,
        lineItemName: rule.lineItemName,
        percentage: rule.percentage,
        manualAccount: {
          id: rule.manualAccount.id,
          uuid: rule.manualAccount.uuid,
          title: rule.manualAccount.title,
          accountNumber: rule.manualAccount.accountNumber,
          accountName: rule.manualAccount.accountName,
          bankName: rule.manualAccount.bankName,
          bankCode: rule.manualAccount.bankCode,
          isPrimary: rule.manualAccount.isPrimary,
        },
      }));
    }

    // Fallback: If no split rules are defined yet, but property has a single manualAccount, return it as 100% Rent
    if (property.manualAccount) {
      return [
        {
          uuid: 'default-fallback',
          lineItemName: 'Rent',
          percentage: 100,
          manualAccount: {
            id: property.manualAccount.id,
            uuid: property.manualAccount.uuid,
            title: property.manualAccount.title,
            accountNumber: property.manualAccount.accountNumber,
            accountName: property.manualAccount.accountName,
            bankName: property.manualAccount.bankName,
            bankCode: property.manualAccount.bankCode,
            isPrimary: property.manualAccount.isPrimary,
          },
        },
      ];
    }

    return [];
  }
}
