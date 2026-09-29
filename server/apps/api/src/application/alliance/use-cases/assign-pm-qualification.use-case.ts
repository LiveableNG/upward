import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import {
  ALLIANCE_PM_QUALIFICATION_REPOSITORY,
  ALLIANCE_QUALIFICATION_REPOSITORY,
  IAlliancePmQualificationRepository,
  IAllianceQualificationRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';

@Injectable()
export class AssignPmQualificationUseCase {
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

    if (!qualification.isActive) {
      throw new BadRequestException('Cannot assign an inactive qualification');
    }

    const existingAssignment = await this.pmQualRepo.findByPmAndQualification(pm.id, qualificationId);
    if (existingAssignment) {
      throw new ConflictException('PM already has this qualification assigned');
    }

    const assignment = await this.pmQualRepo.assign(pm.id, qualificationId, adminId);

    await this.activityLog.log({
      pmId: pm.id,
      ownerPmId: pm.id,
      action: 'ASSIGN_ALLIANCE_QUALIFICATION',
      entityType: 'ALLIANCE_QUALIFICATION',
      entityId: qualification.uuid,
      description: `Assigned qualification "${qualification.name}" to PM ${pm.businessName || pm.firstName || pm.uuid}`,
      metadata: { adminId, qualificationId, qualificationName: qualification.name },
    });

    return assignment;
  }
}
