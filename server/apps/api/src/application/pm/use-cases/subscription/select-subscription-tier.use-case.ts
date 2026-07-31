import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier, UpwardUnitBillingMode } from '@prisma/client';

@Injectable()
export class SelectSubscriptionTierUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, tier: UpwardSubscriptionTier, billingMode: UpwardUnitBillingMode = UpwardUnitBillingMode.ACTIVE) {
    const normalizedTier = (tier as string).toUpperCase() as UpwardSubscriptionTier;
    const normalizedBillingMode = (billingMode as string).toUpperCase() as UpwardUnitBillingMode;

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { subscription: true, wallet: true },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    const rate = normalizedTier === UpwardSubscriptionTier.TIER_2 ? 1500 : normalizedTier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0;
    
    const unitCount = await this.prisma.upward_pm_unit.count({
      where: {
        property: { pmId: pm.id },
        status: normalizedBillingMode === UpwardUnitBillingMode.ALL ? undefined : 'OCCUPIED',
      },
    });

    const minDeposit = Math.max(50000, unitCount * rate);

    let sub = pm.subscription;
    if (!sub) {
      sub = await this.prisma.upward_subscription.create({
        data: {
          pmId: pm.id,
          tier: UpwardSubscriptionTier.FREE,
        },
      });
    }

    let wallet = pm.wallet;
    if (!wallet) {
      wallet = await this.prisma.upward_pm_wallet.create({
        data: { pmId: pm.id, balance: 0 },
      });
    }

    const TIER_ORDER = {
      [UpwardSubscriptionTier.FREE]: 1,
      [UpwardSubscriptionTier.TIER_2]: 2,
      [UpwardSubscriptionTier.TIER_3]: 3,
    };

    const currentTierOrder = TIER_ORDER[sub.tier];
    const newTierOrder = TIER_ORDER[normalizedTier];

    let updateData: any = {};
    const day = sub.anniversaryDate ?? Math.min(new Date().getDate(), 28);

    if (newTierOrder > currentTierOrder) {
      // UPGRADE (Immediate)
      if (normalizedTier !== UpwardSubscriptionTier.FREE && !sub.isInitialDepositPaid) {
        if (wallet.balance < minDeposit) {
          throw new BadRequestException({
            message: 'Insufficient wallet balance for initial deposit.',
            requiredDeposit: minDeposit,
            currentBalance: wallet.balance,
          });
        }
        updateData.isInitialDepositPaid = true;
      }

      updateData = {
        ...updateData,
        tier: normalizedTier,
        unitBillingMode: normalizedBillingMode,
        priceYearly: rate,
        priceMonthly: rate / 12,
        anniversaryDate: day,
        status: 'ACTIVE',
        graceStartedAt: null,
        pendingTier: null,
        pendingUnitBillingMode: null,
      };
    } else if (newTierOrder === currentTierOrder) {
      // SAME TIER (Cancel downgrade or update billing mode)
      updateData = {
        unitBillingMode: normalizedBillingMode,
        anniversaryDate: day,
        pendingTier: null,
        pendingUnitBillingMode: null,
      };
    } else {
      // DOWNGRADE (Delayed till billing cycle ends)
      updateData = {
        pendingTier: normalizedTier,
        pendingUnitBillingMode: normalizedBillingMode,
      };
    }

    sub = await this.prisma.upward_subscription.update({
      where: { pmId: pm.id },
      data: updateData,
    });

    return sub;
  }
}
