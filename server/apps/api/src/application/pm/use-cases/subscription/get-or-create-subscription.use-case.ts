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

    return sub;
  }
}
