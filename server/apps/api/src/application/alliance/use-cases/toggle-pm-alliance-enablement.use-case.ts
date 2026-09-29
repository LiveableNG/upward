import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  IAllianceProfileRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class TogglePmAllianceEnablementUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmUuid: string, isEnabled: boolean, adminId?: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      select: { id: true, uuid: true, businessName: true, firstName: true, lastName: true },
    });

    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    const existingProfile = await this.profileRepo.ensureProfile(pm.id);

    // Idempotent check
    if (existingProfile.isEnabled === isEnabled) {
      return existingProfile;
    }

    const updatePayload: any = {
      isEnabled,
    };

    if (isEnabled) {
      updatePayload.enabledAt = new Date();
      updatePayload.disabledAt = null;
    } else {
      updatePayload.disabledAt = new Date();
    }

    const updatedProfile = await this.profileRepo.update(pm.id, updatePayload);

    await this.activityLog.log({
      pmId: pm.id,
      ownerPmId: pm.id,
      action: isEnabled ? 'ALLIANCE_ENABLED' : 'ALLIANCE_DISABLED',
      entityType: 'ALLIANCE_PROFILE',
      entityId: updatedProfile.uuid,
      description: isEnabled
        ? `Alliance enabled for PM ${pm.businessName || pm.firstName || pm.uuid} by admin`
        : `Alliance disabled for PM ${pm.businessName || pm.firstName || pm.uuid} by admin`,
      metadata: { adminId, isEnabled },
    });

    return updatedProfile;
  }
}
