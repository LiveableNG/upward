import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetAppActivityStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
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
    ]);

    // Fetch installs count by platform from metadata
    const installLogs = await this.prisma.upward_app_activity_log.findMany({
      where: { action: 'APP_INSTALL' },
      select: { metadata: true },
    });

    const platforms: Record<string, number> = { ios: 0, android: 0, web: 0, other: 0 };
    installLogs.forEach((log: any) => {
      const meta = log.metadata as any;
      if (meta && meta.platform) {
        const platform = meta.platform.toLowerCase();
        if (platform.includes('ios')) platforms.ios!++;
        else if (platform.includes('android')) platforms.android!++;
        else if (platform.includes('web')) platforms.web!++;
        else platforms.other!++;
      }
    });

    // Compute today's unique check-ins/activity counts
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

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
    });

    const getUserIdentifier = (log: any) => {
      if (log.userEmail) return log.userEmail;
      if (log.userId) return `user_${log.userId}`;
      if (log.pmId) return `pm_${log.pmId}`;
      return `ip_${log.ipAddress || 'unknown'}`;
    };

    const uniqueUsersMobile = new Set<string>();
    const uniqueUsersWeb = new Set<string>();

    const actionUsersMobile: Record<string, Set<string>> = {};
    const actionUsersWeb: Record<string, Set<string>> = {};

    todayLogs.forEach((log) => {
      const isMobile = (log.userAgent && log.userAgent.toLowerCase().includes('capacitor')) || log.action === 'APP_INSTALL';
      const userKey = getUserIdentifier(log);

      if (isMobile) {
        uniqueUsersMobile.add(userKey);
        let userSet = actionUsersMobile[log.action];
        if (!userSet) {
          userSet = new Set();
          actionUsersMobile[log.action] = userSet;
        }
        userSet.add(userKey);
      } else {
        uniqueUsersWeb.add(userKey);
        let userSet = actionUsersWeb[log.action];
        if (!userSet) {
          userSet = new Set();
          actionUsersWeb[log.action] = userSet;
        }
        userSet.add(userKey);
      }
    });

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
    };

    return {
      totalInstalls,
      platforms,
      activeUsersByApp,
      recentActivityCount,
      todayStats,
    };
  }
}
