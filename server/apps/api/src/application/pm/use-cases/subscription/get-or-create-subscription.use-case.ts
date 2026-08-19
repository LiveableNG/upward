import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier } from '@prisma/client';

@Injectable()
export class GetOrCreateSubscriptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { subscription: true },
    });

    if (!pm) {
      throw new BadRequestException('Property manager not found');
    }

    let sub = pm.subscription;
    if (!sub) {
      sub = await this.prisma.upward_subscription.create({
        data: {
          pmId: pm.id,
          tier: UpwardSubscriptionTier.FREE,
          status: 'ACTIVE',
        },
      });
    }

    const totalUnits = await this.prisma.upward_pm_unit.count({
      where: { property: { pmId: pm.id } },
    });

    const occupiedUnits = await this.prisma.upward_pm_unit.count({
      where: {
        property: { pmId: pm.id },
        status: 'OCCUPIED',
      },
    });

    const billingMode = sub.unitBillingMode;
    const unitCount = billingMode === 'ALL' ? Math.max(totalUnits, 1) : occupiedUnits;
    const yearlyRate = sub.tier === 'TIER_3' ? 2250 : 1500;
    const minRequiredDeposit = Math.max(50000, unitCount * yearlyRate);

    return {
      ...sub,
      minRequiredDeposit,
    };
  }
}
