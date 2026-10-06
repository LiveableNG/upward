import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { ConfigurePropertySettlementSplitDto } from './dtos/settlement-split.dto';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class ConfigurePropertySettlementSplitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pmId: number,
    propertyUuid: string,
    dto: ConfigurePropertySettlementSplitDto,
    actor?: PmActorContext,
  ) {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can configure settlement routing');
    }

    const property = await this.prisma.upward_pm_property.findUnique({
      where: { uuid: propertyUuid },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.pmId !== pmId) {
      throw new ForbiddenException('You do not have access to manage settlement settings for this property');
    }

    const rules = dto.rules || [];

    if (rules.length > 0) {
      // 1. Validate Rent rules total 100%
      const rentRules = rules.filter((r) => !r.lineItemName || r.lineItemName.toLowerCase().trim() === 'rent');

      if (rentRules.length > 0) {
        const totalRentPercentage = rentRules.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
        if (Math.abs(totalRentPercentage - 100) > 0.05) {
          throw new BadRequestException(
            `Total split percentage for Rent must equal exactly 100%. Current sum: ${totalRentPercentage.toFixed(1)}%`,
          );
        }
      }

      // 2. Validate all manual account UUIDs
      const accountUuids = Array.from(new Set(rules.map((r) => r.manualAccountUuid)));
      const accounts = await this.prisma.upward_manual_account.findMany({
        where: {
          uuid: { in: accountUuids },
          pmId: property.pmId,
        },
      });

      if (accounts.length !== accountUuids.length) {
        throw new BadRequestException('One or more selected settlement accounts are invalid or do not exist');
      }

      const accountMap = new Map<string, number>();
      for (const acc of accounts) {
        accountMap.set(acc.uuid, acc.id);
      }

      // 3. Atomically replace rules in transaction
      return this.prisma.$transaction(async (tx) => {
        await tx.upward_settlement_split_rule.deleteMany({
          where: { propertyId: property.id },
        });

        const createdRules = [];
        for (const r of rules) {
          const accountId = accountMap.get(r.manualAccountUuid)!;
          const created = await tx.upward_settlement_split_rule.create({
            data: {
              propertyId: property.id,
              lineItemName: (r.lineItemName || 'Rent').trim(),
              manualAccountId: accountId,
              percentage: Number(r.percentage),
            },
            include: {
              manualAccount: true,
            },
          });
          createdRules.push(created);
        }

        // Backward compatibility: link property.manualAccountId to top rent destination
        const primaryRentRule = rentRules.sort((a, b) => b.percentage - a.percentage)[0];
        if (primaryRentRule) {
          const topAccountId = accountMap.get(primaryRentRule.manualAccountUuid);
          if (topAccountId) {
            await tx.upward_pm_property.update({
              where: { id: property.id },
              data: { manualAccountId: topAccountId },
            });
          }
        }

        return createdRules.map((rule) => ({
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
      });
    } else {
      await this.prisma.upward_settlement_split_rule.deleteMany({
        where: { propertyId: property.id },
      });
      return [];
    }
  }
}
