import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { GetAppActivityLogsUseCase } from '../../../application/use-cases/admin/get-app-activity-logs.use-case'
import { GetAppActivityStatsUseCase } from '../../../application/use-cases/admin/get-app-activity-stats.use-case'
import { GoogleAnalyticsService } from '../../../shared/infrastructure/common/google-analytics.service'
import { GetSessionFunnelsUseCase } from '../../../application/use-cases/analytics/get-session-funnels.use-case'
import { GetSessionExplorerUseCase } from '../../../application/use-cases/analytics/get-session-explorer.use-case'

@Controller('admin/app-activity')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AppActivityLogController {
  constructor(
    private readonly getAppActivityLogsUseCase: GetAppActivityLogsUseCase,
    private readonly getAppActivityStatsUseCase: GetAppActivityStatsUseCase,
    private readonly googleAnalyticsService: GoogleAnalyticsService,
    private readonly getSessionFunnelsUseCase: GetSessionFunnelsUseCase,
    private readonly getSessionExplorerUseCase: GetSessionExplorerUseCase,
  ) {}

  @Get('google-analytics/stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getGoogleAnalyticsStats() {
    return this.googleAnalyticsService.getDashboardStats()
  }

  @Get('funnels')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getSessionFunnels(
    @Query('platform') platform?: string,
    @Query('days') days?: number,
    @Query('app') app?: string,
  ) {
    return this.getSessionFunnelsUseCase.execute({ platform, days, app })
  }

  @Get('sessions')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getSessionExplorer(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('platform') platform?: string,
    @Query('dropOffStage') dropOffStage?: string,
    @Query('hasError') hasError?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.getSessionExplorerUseCase.execute({
      page,
      limit,
      search,
      platform,
      dropOffStage,
      hasError,
      sessionId,
    })
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getAppActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('app') appFilter?: string,
    @Query('action') actionFilter?: string,
    @Query('search') search?: string,
    @Query('platform') platformFilter?: string,
    @Query('date') date?: string,
  ) {
    return this.getAppActivityLogsUseCase.execute({
      page,
      limit,
      appFilter,
      actionFilter,
      search,
      platformFilter,
      date,
    })
  }

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getAppActivityStats() {
    return this.getAppActivityStatsUseCase.execute()
  }
}
