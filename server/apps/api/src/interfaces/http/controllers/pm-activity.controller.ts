
import { Controller, Get, Param, Query, Req, UseGuards, NotFoundException, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { GetTeamActivityDashboardUseCase } from '../../../application/pm/use-cases/team/get-team-activity-dashboard.use-case';

@Controller('pm/team')
@UseGuards(JwtAuthGuard)
export class PmActivityController {
  constructor(
    private readonly activityLog: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly getTeamActivityDashboardUseCase: GetTeamActivityDashboardUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getOwnerPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm?.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Get('activity/dashboard')
  async getTeamActivityDashboard(
    @Req() req: any,
    @Query('memberUuid') memberUuid?: string,
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('timeRange') timeRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user?.role === 'PM_EMPLOYEE') {
      throw new ForbiddenException('Only PM account owners and administrators can access the activity dashboard');
    }
    const ownerPmId = await this.getOwnerPmId(req);
    return this.getTeamActivityDashboardUseCase.execute(ownerPmId, {
      memberUuid,
      category,
      action,
      search,
      timeRange: timeRange as any,
      startDate,
      endDate,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':collaboratorUuid/activities')
  async getCollaboratorActivities(@Req() req: any, @Param('collaboratorUuid') collaboratorUuid: string) {
    const ownerPmId = await this.getOwnerPmId(req);

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
