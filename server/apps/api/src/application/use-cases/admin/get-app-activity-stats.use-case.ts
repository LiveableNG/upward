import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetAppActivityStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalSignups,
      totalLogins,
      recentActivityCount,
      recentLogs,
    ] = await Promise.all([
      this.prisma.upward_app_activity_log.count({
        where: { app: 'upward-pay', action: 'SIGNUP' },
      }),
      this.prisma.upward_app_activity_log.count({
        where: { app: 'upward-pay', action: 'LOGIN' },
      }),
      this.prisma.upward_app_activity_log.count({
        where: {
          app: 'upward-pay',
          createdAt: { gte: thirtyDaysAgo },
          NOT: {
            AND: [
              { action: 'LOGIN_FAILED' },
              {
                OR: [
                  { entityId: 'refresh' },
                  { description: { contains: 'refresh', mode: 'insensitive' } },
                ],
              },
            ],
          },
        },
      }),
      // Fetch the last 30 days upward-pay logs for aggregation and trend graph
      this.prisma.upward_app_activity_log.findMany({
        where: {
          app: 'upward-pay',
          createdAt: { gte: thirtyDaysAgo },
          action: { in: ['SIGNUP', 'LOGIN', 'PAYMENT', 'DEPOSIT', 'CREDIBILITY_REQUEST'] },
          OR: [
            { userId: { not: null } },
            {
              AND: [
                { userEmail: { not: null } },
                { userEmail: { not: '' } },
                { userEmail: { not: 'system' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          userAgent: true,
          userEmail: true,
          userId: true,
          ipAddress: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const resolvePlatform = (log: { metadata?: any; userAgent?: string | null }): 'ios' | 'android' | 'web' => {
      const meta = log.metadata as any;
      if (meta && typeof meta === 'object') {
        const plat = (meta.platform || meta.clientPlatform || '').toLowerCase();
        if (plat.includes('ios')) return 'ios';
        if (plat.includes('android')) return 'android';
        if (plat.includes('web')) return 'web';
      }
      const ua = (log.userAgent || '').toLowerCase();
      if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
      if (/android/i.test(ua)) return 'android';
      return 'web';
    };

    const signupsByPlatform = { ios: 0, android: 0, web: 0 };
    const loginsByPlatform = { ios: 0, android: 0, web: 0 };

    // Buckets for 30-day daily trends
    const dailyMap = new Map<string, {
      date: string;
      ios: number;
      android: number;
      web: number;
      signups: number;
      logins: number;
      total: number;
    }>();

    // Populate dailyMap with all days in the 30-day window
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0]!;
      dailyMap.set(dateKey, {
        date: dateKey,
        ios: 0,
        android: 0,
        web: 0,
        signups: 0,
        logins: 0,
        total: 0,
      });
    }

    const uniqueUsersIosToday = new Set<string>();
    const uniqueUsersAndroidToday = new Set<string>();
    const uniqueUsersWebToday = new Set<string>();

    const getUserIdentifier = (log: any) => {
      if (log.userEmail) return log.userEmail;
      if (log.userId) return `user_${log.userId}`;
      return `ip_${log.ipAddress || 'unknown'}`;
    };

    for (const log of recentLogs) {
      const platform = resolvePlatform(log);
      const isToday = new Date(log.createdAt) >= startOfToday;
      const dateKey = new Date(log.createdAt).toISOString().split('T')[0]!;

      // Update aggregate counts
      if (log.action === 'SIGNUP') {
        signupsByPlatform[platform]++;
      } else if (log.action === 'LOGIN') {
        loginsByPlatform[platform]++;
      }

      // Update daily trend
      let dayEntry = dailyMap.get(dateKey);
      if (!dayEntry) {
        dayEntry = {
          date: dateKey,
          ios: 0,
          android: 0,
          web: 0,
          signups: 0,
          logins: 0,
          total: 0,
        };
        dailyMap.set(dateKey, dayEntry);
      }

      dayEntry[platform]++;
      dayEntry.total++;
      if (log.action === 'SIGNUP') dayEntry.signups++;
      if (log.action === 'LOGIN') dayEntry.logins++;

      // Today's unique users tracking - only actual tenant logins, signups, or payments
      if (isToday && (log.action === 'LOGIN' || log.action === 'SIGNUP' || log.action === 'PAYMENT')) {
        const userKey = getUserIdentifier(log);
        if (platform === 'ios') uniqueUsersIosToday.add(userKey);
        else if (platform === 'android') uniqueUsersAndroidToday.add(userKey);
        else uniqueUsersWebToday.add(userKey);
      }
    }

    // Compute cumulative series from daily values
    const dailyTrends = Array.from(dailyMap.values());
    let cumIos = 0;
    let cumAndroid = 0;
    let cumWeb = 0;
    let cumTotal = 0;
    let cumSignups = 0;
    let cumLogins = 0;

    const cumulativeTrends = dailyTrends.map((d) => {
      cumIos += d.ios;
      cumAndroid += d.android;
      cumWeb += d.web;
      cumTotal += d.total;
      cumSignups += d.signups;
      cumLogins += d.logins;
      return {
        date: d.date,
        ios: cumIos,
        android: cumAndroid,
        web: cumWeb,
        total: cumTotal,
        signups: cumSignups,
        logins: cumLogins,
      };
    });

    const uniqueUsersTotalToday = new Set([
      ...Array.from(uniqueUsersIosToday),
      ...Array.from(uniqueUsersAndroidToday),
      ...Array.from(uniqueUsersWebToday),
    ]).size;

    const totalLoginsCalculated = loginsByPlatform.ios + loginsByPlatform.android + loginsByPlatform.web;
    const totalSignupsCalculated = signupsByPlatform.ios + signupsByPlatform.android + signupsByPlatform.web;

    return {
      totalSignups: totalSignupsCalculated,
      totalLogins: totalLoginsCalculated,
      signupsByPlatform,
      loginsByPlatform,
      recentActivityCount,
      todayStats: {
        uniqueUsersIosCount: uniqueUsersIosToday.size,
        uniqueUsersAndroidCount: uniqueUsersAndroidToday.size,
        uniqueUsersWebCount: uniqueUsersWebToday.size,
        uniqueUsersMobileCount: uniqueUsersIosToday.size + uniqueUsersAndroidToday.size,
        uniqueUsersTotalCount: uniqueUsersTotalToday,
      },
      dailyTrends,
      cumulativeTrends,
    };
  }
}
