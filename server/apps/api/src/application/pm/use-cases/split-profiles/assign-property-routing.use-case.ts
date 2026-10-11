import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';
import { AssignPropertyRoutingDto } from './dtos/split-profile.dto';

@Injectable()
export class AssignPropertyRoutingUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pmId: number,
    dto: AssignPropertyRoutingDto,
    actor?: PmActorContext,
  ): Promise<{ success: boolean; message: string }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can configure property routing assignments');
    }

    const property = await this.prisma.upward_pm_property.findFirst({
      where: { uuid: dto.propertyUuid, pmId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    let targetSplitProfileId: number | null = null;
    let targetManualAccountId: number | null = null;
    let targetSettlementAccountId: number | null = null;
    let routingSummary = '';

    if (dto.routingType === 'PROFILE') {
      if (!dto.targetUuid) {
        throw new BadRequestException('Split profile UUID is required for PROFILE routing');
      }
      const profile = await (this.prisma as any).upward_pm_split_profile.findFirst({
        where: { uuid: dto.targetUuid, pmId },
      });
      if (!profile) {
        throw new NotFoundException('Split profile not found');
      }
      targetSplitProfileId = profile.id;
      targetManualAccountId = null;
      targetSettlementAccountId = null;
      routingSummary = `Split profile "${profile.name}"`;
    } else if (dto.routingType === 'ACCOUNT') {
      if (!dto.targetUuid) {
        throw new BadRequestException('Settlement account UUID is required for ACCOUNT routing');
      }
      const account = await (this.prisma as any).upward_settlement_account.findFirst({
        where: { uuid: dto.targetUuid, pmId },
        include: { manualAccount: true },
      });
      if (!account) {
        throw new NotFoundException('Settlement account not found');
      }
      targetManualAccountId = account.manualAccountId;
      targetSettlementAccountId = account.id;
      targetSplitProfileId = null;
      routingSummary = `Direct account "${account.manualAccount?.bankName || account.title}" (100% of Rent)`;
    } else if (dto.routingType === 'DEFAULT') {
      targetSplitProfileId = null;
      targetManualAccountId = null;
      targetSettlementAccountId = null;
      routingSummary = 'Default Account Fallback';
    } else {
      throw new BadRequestException(`Invalid routing type: ${dto.routingType}`);
    }

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Update property
      await tx.upward_pm_property.update({
        where: { id: property.id },
        data: {
          splitProfileId: targetSplitProfileId,
          manualAccountId: targetManualAccountId,
          settlementAccountId: targetSettlementAccountId,
        },
      });

      // 2. Propagate manualAccountId to upward_user_property for active units
      const units = await tx.upward_pm_unit.findMany({
        where: { propertyId: property.id },
        select: { id: true },
      });
      const unitIds = units.map((u: any) => u.id);
      if (unitIds.length > 0) {
        await tx.upward_user_property.updateMany({
          where: { pmUnitId: { in: unitIds } },
          data: { manualAccountId: targetManualAccountId },
        });
      }
    });

    return {
      success: true,
      message: `Property "${property.name}" successfully assigned to ${routingSummary}`,
    };
  }
}
