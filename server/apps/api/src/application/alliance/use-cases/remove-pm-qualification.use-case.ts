import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALLIANCE_PM_QUALIFICATION_REPOSITORY,
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAlliancePmQualificationRepository,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class RemovePmQualificationUseCase {
  constructor(
    @Inject(ALLIANCE_PM_QUALIFICATION_REPOSITORY)
    private readonly pmQualRepo: IAlliancePmQualificationRepository,
    @Inject(ALLIANCE_QUALIFICATION_REPOSITORY)
    private readonly qualRepo: IAllianceQualificationRepository,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmUuid: string, qualificationId: number, adminId?: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      select: { id: true, uuid: true, businessName: true, firstName: true },
    });

    if (!pm) {
      throw new NotFoundException('Property manager not found');
    }

    const qualification = await this.qualRepo.findById(qualificationId);
    if (!qualification) {
      throw new NotFoundException('Qualification not found');
    }

    const removed = await this.pmQualRepo.remove(pm.id, qualificationId);
    if (!removed) {
      throw new NotFoundException('Qualification assignment not found for this PM');
    }

    await this.activityLog.log({
      pmId: pm.id,
      ownerPmId: pm.id,
      action: 'REMOVE_ALLIANCE_QUALIFICATION',
      entityType: 'ALLIANCE_QUALIFICATION',
      entityId: qualification.uuid,
      description: `Removed qualification "${qualification.name}" from PM ${pm.businessName || pm.firstName || pm.uuid}`,
      metadata: { adminId, qualificationId, qualificationName: qualification.name },
    });

    return { success: true };
  }
}
