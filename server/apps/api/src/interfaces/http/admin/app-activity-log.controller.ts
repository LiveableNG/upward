import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { GetAppActivityLogsUseCase } from '../../../application/use-cases/admin/get-app-activity-logs.use-case'
import { GoogleAnalyticsService } from '../../../shared/infrastructure/common/google-analytics.service'

@Controller('admin/app-activity')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AppActivityLogController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getAppActivityLogsUseCase: GetAppActivityLogsUseCase,
    private readonly googleAnalyticsService: GoogleAnalyticsService,
  ) {}

  @Get('google-analytics/stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getGoogleAnalyticsStats() {
    return this.googleAnalyticsService.getDashboardStats()
  }

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
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
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getAppActivityStats() {
    const [totalInstalls, activeUsersByApp, recentActivityCount] = await Promise.all([
      this.prisma.upward_app_activity_log.count({
        where: { action: 'APP_INSTALL' },
      }),
      this.prisma.upward_app_activity_log.groupBy({
        by: ['app'],
        _count: true,
      }),
      this.prisma.upward_app_activity_log.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
          },
        },
      }),
    ])

    // Fetch installs count by platform from metadata
    const installLogs = await this.prisma.upward_app_activity_log.findMany({
      where: { action: 'APP_INSTALL' },
      select: { metadata: true },
    })

    const platforms: Record<string, number> = { ios: 0, android: 0, web: 0, other: 0 }
    installLogs.forEach((log: any) => {
      const meta = log.metadata as any
      if (meta && meta.platform) {
        const platform = meta.platform.toLowerCase()
        if (platform.includes('ios')) platforms.ios!++
        else if (platform.includes('android')) platforms.android!++
        else if (platform.includes('web')) platforms.web!++
        else platforms.other!++
      }
    });

    // Compute today's unique check-ins/activity counts
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const todayLogs = await this.prisma.upward_app_activity_log.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
      select: {
        userId: true,
        pmId: true,
        userEmail: true,
        action: true,
        userAgent: true,
        ipAddress: true,
      },
    })

    const getUserIdentifier = (log: any) => {
      if (log.userEmail) return log.userEmail
      if (log.userId) return `user_${log.userId}`
      if (log.pmId) return `pm_${log.pmId}`
      return `ip_${log.ipAddress || 'unknown'}`
    }

    const uniqueUsersMobile = new Set<string>()
    const uniqueUsersWeb = new Set<string>()

    const actionUsersMobile: Record<string, Set<string>> = {}
    const actionUsersWeb: Record<string, Set<string>> = {}

    todayLogs.forEach((log) => {
      const isMobile = (log.userAgent && log.userAgent.toLowerCase().includes('capacitor')) || log.action === 'APP_INSTALL'
      const userKey = getUserIdentifier(log)

      if (isMobile) {
        uniqueUsersMobile.add(userKey)
        let userSet = actionUsersMobile[log.action]
        if (!userSet) {
          userSet = new Set()
          actionUsersMobile[log.action] = userSet
        }
        userSet.add(userKey)
      } else {
        uniqueUsersWeb.add(userKey)
        let userSet = actionUsersWeb[log.action]
        if (!userSet) {
          userSet = new Set()
          actionUsersWeb[log.action] = userSet
        }
        userSet.add(userKey)
      }
    })

    const todayStats = {
      uniqueUsersMobileCount: uniqueUsersMobile.size,
      uniqueUsersWebCount: uniqueUsersWeb.size,
      mobileActionGrouped: Object.entries(actionUsersMobile).map(([action, users]) => ({
        action,
        count: users.size,
      })),
      webActionGrouped: Object.entries(actionUsersWeb).map(([action, users]) => ({
        action,
        count: users.size,
      })),
    }

    return {
      totalInstalls,
      platforms,
      activeUsersByApp,
      recentActivityCount,
      todayStats,
    }
  }
}
