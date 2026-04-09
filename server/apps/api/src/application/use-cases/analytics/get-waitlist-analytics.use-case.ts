import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class GetWaitlistAnalyticsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private buildWaitlistWhereClause(options: {
    search?: string
    roles?: string[]
    countries?: string[]
    cities?: string[]
    selectedSessions?: string[]
    createdFrom?: string
    createdTo?: string
    completed?: string
    missingName?: string
  }) {
    const {
      search,
      roles,
      countries,
      cities,
      selectedSessions,
      createdFrom,
      createdTo,
      completed,
      missingName,
    } = options
    const where: Prisma.upward_waitlistWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (roles && roles.length > 0) {
      where.role = { in: roles }
    }

    if (countries && countries.length > 0) {
      where.country = { in: countries }
    }

    if (cities && cities.length > 0) {
      where.city = { in: cities }
    }

    if (selectedSessions && selectedSessions.length > 0) {
      const sessionFilters: Prisma.upward_waitlistWhereInput[] = [
        ...selectedSessions.map((s) => ({
          selectedSession: { contains: s, mode: 'insensitive' as const },
        })),
        { selectedSession: { in: selectedSessions } },
      ]
      if (where.OR) {
        const existingOR = where.OR as Prisma.upward_waitlistWhereInput[]
        delete where.OR
        where.AND = [{ OR: existingOR }, { OR: sessionFilters }]
      } else {
        where.OR = sessionFilters
      }
    }

    if (completed === 'true') {
      where.acceptTerms = true
    } else if (completed === 'false') {
      where.acceptTerms = { not: true }
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom && { gte: new Date(createdFrom) }),
        ...(createdTo && { lte: new Date(createdTo) }),
      }
    }

    if (missingName === 'true') {
      const existingOR = (where.OR as Prisma.upward_waitlistWhereInput[]) || []
      const nameFilters: Prisma.upward_waitlistWhereInput[] = [
        { firstName: null },
        { firstName: '' },
      ]
      if (existingOR.length > 0) {
        if (where.AND) {
          ;(where.AND as Prisma.upward_waitlistWhereInput[]).push({ OR: nameFilters })
        } else {
          where.AND = [{ OR: existingOR }, { OR: nameFilters }]
          delete where.OR
        }
      } else {
        where.OR = nameFilters
      }
    }
    return where
  }

  async execute(
    options: {
      search?: string
      roles?: string[]
      countries?: string[]
      cities?: string[]
      selectedSessions?: string[]
      createdFrom?: string
      createdTo?: string
      completed?: string
      missingName?: string
    } = {},
  ) {
    const where = this.buildWaitlistWhereClause(options)

    const totalWaitlist = await this.prisma.upward_waitlist.count()
    const totalCompleted = await this.prisma.upward_waitlist.count({ where: { acceptTerms: true } })
    const totalIncomplete = await this.prisma.upward_waitlist.count({
      where: { acceptTerms: { not: true } },
    })

    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const joinedLast24h = await this.prisma.upward_waitlist.count({
      where: { createdAt: { gte: last24hStart } },
    })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayEnd = todayStart

    const [completedYesterday, incompleteYesterday] = await Promise.all([
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: true,
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
        },
      }),
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: { not: true },
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
        },
      }),
    ])

    const interactionStats: { date: Date; count: number }[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*)::int as count
      FROM upward_waitlist
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `

    const [roleDist, countryDist, cityDist, filteredWaitlistData] = await Promise.all([
      this.prisma.upward_waitlist.groupBy({
        by: ['role'],
        _count: { _all: true },
        where: { ...where, role: { not: null } },
        orderBy: { _count: { role: 'desc' } },
      }),
      this.prisma.upward_waitlist.groupBy({
        by: ['country'],
        _count: { _all: true },
        where: { ...where, country: { not: null } },
        orderBy: { _count: { country: 'desc' } },
      }),
      this.prisma.upward_waitlist.groupBy({
        by: ['city'],
        _count: { _all: true },
        where: { ...where, city: { not: null } },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
      this.prisma.upward_waitlist.findMany({
        select: { role: true, benefits: true },
        where,
      }),
    ])

    const tenantBenefits = ['PRIORITY', 'FINANCING', 'OWNERSHIP']
    const ownerBenefits = ['HISTORY', 'CREDIT', 'TITLE']
    const defaultBenefits = [...tenantBenefits, ...ownerBenefits]

    const benefitStats: Record<string, number> = {}
    defaultBenefits.forEach((b) => (benefitStats[b] = 0))

    const roleTotals: Record<string, number> = {}
    const roleTotalWithBenefits: Record<string, number> = {}
    const roleBenefitStats: Record<string, Record<string, number>> = {}
    const customBenefitMap: Record<string, { count: number; roles: string[] }> = {}
    let customCount = 0

    filteredWaitlistData.forEach((entry) => {
      const role = entry.role || 'Unknown'
      roleTotals[role] = (roleTotals[role] || 0) + 1
      const hasBenefits = entry.benefits && entry.benefits.length > 0
      if (hasBenefits) {
        roleTotalWithBenefits[role] = (roleTotalWithBenefits[role] || 0) + 1
        if (!roleBenefitStats[role]) {
          const initialStats: Record<string, number> = {}
          defaultBenefits.forEach((b) => (initialStats[b] = 0))
          roleBenefitStats[role] = initialStats
        }
        const stats = roleBenefitStats[role] || {}
        entry.benefits.forEach((b: string) => {
          if (defaultBenefits.includes(b)) {
            benefitStats[b] = (benefitStats[b] || 0) + 1
            stats[b] = (stats[b] || 0) + 1
          } else {
            const normalized = b.trim()
            if (normalized) {
              customCount++
              if (!customBenefitMap[normalized]) {
                customBenefitMap[normalized] = { count: 0, roles: [] }
              }
              customBenefitMap[normalized].count++
              customBenefitMap[normalized].roles.push(role)
            }
          }
        })
      }
    })

    const last10Users = await this.prisma.upward_waitlist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    const customBenefitsList = Object.entries(customBenefitMap)
      .map(([label, data]) => ({
        label,
        count: data.count,
        roles: data.roles,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      totalWaitlist,
      joinedLast24h,
      totalCompleted,
      totalIncomplete,
      completedYesterday,
      incompleteYesterday,
      interactionStats,
      last10Users,
      distributions: {
        roles: roleDist.map((r) => ({
          label: (r.role as string) || 'Unknown',
          count: (r._count as { _all: number })._all || 0,
        })),
        countries: countryDist.map((c) => ({
          label: (c.country as string) || 'Unknown',
          count: (c._count as { _all: number })._all || 0,
        })),
        cities: cityDist.map((c) => ({
          label: (c.city as string) || 'Unknown',
          count: (c._count as { _all: number })._all || 0,
        })),
        benefits: defaultBenefits.map((b) => ({ label: b, count: benefitStats[b] || 0 })),
        roleBenefits: Object.keys(roleBenefitStats).reduce(
          (acc, role) => {
            const relevantBenefits = role === 'TENANT' ? tenantBenefits : ownerBenefits
            const benefitsToDisplay =
              role === 'TENANT' || role === 'OWNER' ? relevantBenefits : defaultBenefits
            const stats = roleBenefitStats[role] || {}
            acc[role] = benefitsToDisplay.map((b) => ({
              label: b,
              count: (stats[b] as number) || 0,
            }))
            return acc
          },
          {} as Record<string, { label: string; count: number }[]>,
        ),
        roleTotals,
        roleTotalWithBenefits,
        customBenefits: {
          count: customCount,
          items: customBenefitsList,
        },
      },
    }
  }
}
