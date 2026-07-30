import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { UpwardSubscriptionTier } from '@prisma/client';

export interface ManagePmSubscriptionDto {
  tier: UpwardSubscriptionTier;
  status: string; // "ACTIVE", "LOCKED"
  reason?: string;
}

@Injectable()
export class ManagePmSubscriptionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, adminId: string, data: ManagePmSubscriptionDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { subscription: true },
    });

    if (!pm) {
      throw new NotFoundException('Property Manager not found');
    }

    const previousTier = pm.subscription?.tier ?? UpwardSubscriptionTier.FREE;
    const previousStatus = pm.subscription?.status ?? 'ACTIVE';

    let action = 'UPGRADE';
    if (data.status === 'LOCKED' && previousStatus !== 'LOCKED') {
      action = 'REVOKE';
    } else if (data.status === 'ACTIVE' && previousStatus === 'LOCKED') {
      action = 'REACTIVATE';
    } else if (
      (data.tier === UpwardSubscriptionTier.FREE && previousTier !== UpwardSubscriptionTier.FREE) ||
      (data.tier === UpwardSubscriptionTier.TIER_2 && previousTier === UpwardSubscriptionTier.TIER_3)
    ) {
      action = 'DOWNGRADE';
    } else if (data.tier !== previousTier) {
      action = 'UPGRADE';
    } else {
      action = 'UPDATE';
    }

    // Upsert or update the subscription
    let subscription;
    if (pm.subscription) {
      subscription = await this.prisma.upward_subscription.update({
        where: { pmId: pm.id },
        data: {
          tier: data.tier,
          status: data.status,
        },
      });
    } else {
      subscription = await this.prisma.upward_subscription.create({
        data: {
          pmId: pm.id,
          tier: data.tier,
          status: data.status,
          priceYearly: data.tier === UpwardSubscriptionTier.TIER_2 ? 1500 : data.tier === UpwardSubscriptionTier.TIER_3 ? 2250 : 0,
        },
      });
    }

    // Log the action in upward_subscription_log
    const log = await this.prisma.upward_subscription_log.create({
      data: {
        pmId: pm.id,
        adminId,
        previousTier,
        newTier: data.tier,
        previousStatus,
        newStatus: data.status,
        action,
        reason: data.reason || null,
      },
    });

    // Audit the action in upward_admin_log
    await this.prisma.upward_admin_log.create({
      data: {
        adminId,
        action: `SUBSCRIPTION_${action}`,
        details: `PM: ${pm.businessName || pm.email}. Tier: ${previousTier} -> ${data.tier}. Status: ${previousStatus} -> ${data.status}. Reason: ${data.reason || 'None provided'}`,
      },
    });

    return {
      subscription,
      log,
    };
  }
}
