import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { SubscriptionService, FeatureKey } from '../../../domains/subscription/subscription.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class SubscriptionGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<FeatureKey>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const pmUuid = request.user?.sub;
    if (!pmUuid) throw new UnauthorizedException('Invalid user context');

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    });
    if (!pm) throw new UnauthorizedException('Property Manager not found');

    const check = await this.subscriptionService.checkAccess(pm.id, requiredFeature);
    if (!check.hasAccess) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'This feature is locked under your current plan.',
        code: 'FEATURE_LOCKED',
        requiredTier: check.requiredTier,
        reason: check.reason,
      });
    }

    request.featureLimit = check.limit;
    return true;
  }
}
