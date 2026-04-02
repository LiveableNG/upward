import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetAbStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const variantSummary: { abvariant: string; total: number; unique_visitors: number }[] =
      await this.prisma.$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          COUNT(*)::int AS total,
          COUNT(DISTINCT "visitorId")::int AS unique_visitors
        FROM upward_interaction
        GROUP BY "abVariant"
        ORDER BY "abVariant"
      `
    const clickCounts: { abvariant: string; clicks: number }[] = await this.prisma.$queryRaw`
      SELECT
        "abVariant" AS abvariant,
        COUNT(*)::int AS clicks
      FROM upward_interaction
      WHERE type = 'CLICK'
      GROUP BY "abVariant"
    `
    const topTargets: { abvariant: string; target: string; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          target,
          COUNT(*)::int AS count
        FROM upward_interaction
        GROUP BY "abVariant", target
        ORDER BY "abVariant", count DESC
      `
    const typeBreakdown: { abvariant: string; type: string; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          type,
          COUNT(*)::int AS count
        FROM upward_interaction
        GROUP BY "abVariant", type
        ORDER BY "abVariant", type
      `
    const dailyTrend: { abvariant: string; date: Date; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          DATE_TRUNC('day', "createdAt") AS date,
          COUNT(*)::int AS count
        FROM upward_interaction
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY "abVariant", DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `
    const signupsByVariant: { abvariant: string; signups: number; completed: number }[] = await this
      .prisma.$queryRaw`
        SELECT
          COALESCE("abVariant", 'unknown') AS abvariant,
          COUNT(*)::int AS signups,
          COUNT(*) FILTER (WHERE "acceptTerms" = true)::int AS completed
        FROM upward_waitlist
        GROUP BY "abVariant"
        ORDER BY "abVariant"
      `
    const variants = ['A', 'B']
    const result = variants.map((v) => {
      const summary = variantSummary.find((s) => s.abvariant === v)
      const clicks = clickCounts.find((c) => c.abvariant === v)
      const signups = signupsByVariant.find((s) => s.abvariant === v)
      const total = summary?.total ?? 0
      const clickTotal = clicks?.clicks ?? 0
      return {
        variant: v,
        totalEvents: total,
        uniqueVisitors: summary?.unique_visitors ?? 0,
        totalClicks: clickTotal,
        ctr: total > 0 ? Math.round((clickTotal / total) * 1000) / 10 : 0,
        signups: signups?.signups ?? 0,
        completedSignups: signups?.completed ?? 0,
        conversionRate:
          (summary?.unique_visitors ?? 0) > 0
            ? Math.round(((signups?.completed ?? 0) / (summary?.unique_visitors ?? 1)) * 1000) / 10
            : 0,
        topTargets: topTargets
          .filter((t) => t.abvariant === v)
          .slice(0, 10)
          .map((t) => ({ target: t.target, count: t.count })),
        typeBreakdown: typeBreakdown
          .filter((t) => t.abvariant === v)
          .map((t) => ({ type: t.type, count: t.count })),
        dailyTrend: dailyTrend
          .filter((d) => d.abvariant === v)
          .map((d) => ({ date: d.date, count: d.count })),
      }
    })
    return result
  }
}
