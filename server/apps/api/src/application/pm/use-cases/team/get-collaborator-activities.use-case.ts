import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { ActivityLogService } from '../../../../shared/application/activity-log.service';

@Injectable()
export class GetCollaboratorActivitiesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(ownerPmId: number, collaboratorUuid: string) {
    // Check employee first
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { uuid: collaboratorUuid, ownerPmId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (employee) {
      const logs = await (this.prisma as any).upward_pm_activity_log.findMany({
        where: {
          ownerPmId,
          employeeId: employee.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        collaborator: {
          firstName: this.encryption.decrypt(employee.firstName),
          lastName: this.encryption.decrypt(employee.lastName),
        },
        logs,
      };
    }

    // Fallback to legacy collaborator
    const collaborator = await (this.prisma as any).upward_property_manager.findUnique({
      where: { uuid: collaboratorUuid },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!collaborator) throw new NotFoundException('Collaborator not found');

    const collaboration = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId,
          collaboratorPmId: collaborator.id,
        },
      },
    });

    if (!collaboration) throw new NotFoundException('Collaborator is not part of your team');

    const logs = await this.activityLog.getLogsForCollaborator(ownerPmId, collaborator.id);

    return {
      collaborator: {
        firstName: this.encryption.decrypt(collaborator.firstName),
        lastName: this.encryption.decrypt(collaborator.lastName),
      },
      logs,
    };
  }
}
