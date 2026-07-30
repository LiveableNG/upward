import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier, UpwardUnitBillingMode } from '@prisma/client';

@Injectable()
export class SelectSubscriptionTierUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, tier: UpwardSubscriptionTier, billingMode: UpwardUnitBillingMode = UpwardUnitBillingMode.ACTIVE) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { subscription: true, wallet: true },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    const rate = tier === UpwardSubscriptionTier.TIER_2 ? 1500 : tier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0;
    
    const unitCount = await this.prisma.upward_pm_unit.count({
      where: {
        property: { pmId: pm.id },
        status: billingMode === UpwardUnitBillingMode.ALL ? undefined : 'OCCUPIED',
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

    if (tier !== UpwardSubscriptionTier.FREE && !sub.isInitialDepositPaid) {
      if (wallet.balance < minDeposit) {
        throw new BadRequestException({
          message: 'Insufficient wallet balance for initial deposit.',
          requiredDeposit: minDeposit,
          currentBalance: wallet.balance,
        });
      }

      const day = sub.anniversaryDate ?? Math.min(new Date().getDate(), 28);

      sub = await this.prisma.upward_subscription.update({
        where: { pmId: pm.id },
        data: {
          tier,
          unitBillingMode: billingMode,
          priceYearly: rate,
          priceMonthly: rate / 12,
          isInitialDepositPaid: true,
          anniversaryDate: day,
          status: 'ACTIVE',
          graceStartedAt: null,
        },
      });
    } else {
      const day = sub.anniversaryDate ?? Math.min(new Date().getDate(), 28);
      sub = await this.prisma.upward_subscription.update({
        where: { pmId: pm.id },
        data: {
          tier,
          unitBillingMode: billingMode,
          priceYearly: rate,
          priceMonthly: rate / 12,
          anniversaryDate: day,
          status: tier === UpwardSubscriptionTier.FREE ? 'ACTIVE' : sub.status,
        },
      });
    }

    return sub;
  }
}
