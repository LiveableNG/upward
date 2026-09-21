import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';

export const CurrentPmActor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PmActorContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.sub) {
      throw new UnauthorizedException('Invalid user context');
    }

    if (user.role === 'PM_EMPLOYEE') {
      if (!user.ownerPmId) {
        throw new UnauthorizedException('Property Manager organization not found');
      }
      return {
        ownerPmId: user.ownerPmId,
        isEmployee: true,
        employeeId: user.employeeId,
        employeeUuid: user.sub,
        accessLevel: user.accessLevel || 'CUSTOM',
      };
    }

    if (user.role === 'PM') {
      if (!user.ownerPmId) {
        throw new UnauthorizedException('Property Manager not found');
      }
      return {
        ownerPmId: user.ownerPmId,
        isEmployee: false,
      };
    }

    // Fallback if role is landlord or other entity with an associated ownerPmId
    if (user.ownerPmId) {
      return {
        ownerPmId: user.ownerPmId,
        isEmployee: false,
      };
    }

    throw new UnauthorizedException('User is not a Property Manager');
  },
);

export const CurrentPmId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.sub) {
      throw new UnauthorizedException('Invalid user context');
    }

    if (!user.ownerPmId) {
      throw new UnauthorizedException('Property Manager not found');
    }

    return user.ownerPmId;
  },
);
