import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('admin/app-activity')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AppActivityLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getAppActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('app') appFilter?: string,
    @Query('action') actionFilter?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (appFilter && appFilter !== 'ALL') {
      where.app = appFilter
    }

    if (actionFilter && actionFilter !== 'ALL') {
      where.action = actionFilter
    }

    if (search) {
      where.OR = [
        { userEmail: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      this.prisma.upward_app_activity_log.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_app_activity_log.count({ where }),
    ])

    return {
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
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

    return {
      totalInstalls,
      platforms,
      activeUsersByApp,
      recentActivityCount,
    }
  }
}
