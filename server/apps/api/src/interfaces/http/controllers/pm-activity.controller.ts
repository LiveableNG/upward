
import { Controller, Get, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { GetTeamActivityDashboardUseCase } from '../../../application/pm/use-cases/team/get-team-activity-dashboard.use-case';
import { GetCollaboratorActivitiesUseCase } from '../../../application/pm/use-cases/team/get-collaborator-activities.use-case';

@Controller('pm/team')
@UseGuards(JwtAuthGuard)
export class PmActivityController {
  constructor(
    private readonly getTeamActivityDashboardUseCase: GetTeamActivityDashboardUseCase,
    private readonly getCollaboratorActivitiesUseCase: GetCollaboratorActivitiesUseCase,
  ) {}

  @Get('activity/dashboard')
  async getTeamActivityDashboard(
    @CurrentPmActor() actor: PmActorContext,
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
    if (actor.isEmployee) {
      throw new ForbiddenException('Only PM account owners and administrators can access the activity dashboard');
    }
    return this.getTeamActivityDashboardUseCase.execute(actor.ownerPmId, {
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
  async getCollaboratorActivities(
    @CurrentPmActor() actor: PmActorContext,
    @Param('collaboratorUuid') collaboratorUuid: string,
  ) {
    return this.getCollaboratorActivitiesUseCase.execute(actor.ownerPmId, collaboratorUuid);
  }
}
