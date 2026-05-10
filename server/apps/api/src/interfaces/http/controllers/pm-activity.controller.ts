
import { Controller, Get, Param, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Controller('pm/team')
@UseGuards(JwtAuthGuard)
export class PmActivityController {
  constructor(
    private readonly activityLog: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get(':collaboratorUuid/activities')
  async getCollaboratorActivities(@Req() req: any, @Param('collaboratorUuid') collaboratorUuid: string) {
    const ownerPmId = req.user.serverId; // Assuming serverId is the numeric ID

    const collaborator = await (this.prisma as any).upward_property_manager.findUnique({
      where: { uuid: collaboratorUuid },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!collaborator) throw new NotFoundException('Collaborator not found');

    // Verify they are actually in the owner's team
    const collaboration = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId,
          collaboratorPmId: collaborator.id
        }
      }
    });

    if (!collaboration) throw new NotFoundException('Collaborator is not part of your team');

    const logs = await this.activityLog.getLogsForCollaborator(ownerPmId, collaborator.id);
    
    return {
      collaborator: {
        firstName: this.encryption.decrypt(collaborator.firstName),
        lastName: this.encryption.decrypt(collaborator.lastName),
      },
      logs
    };
  }
}
