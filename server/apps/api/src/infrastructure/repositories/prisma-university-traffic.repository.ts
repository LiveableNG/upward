import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IUniversityTrafficRepository,
  CreateUniversityTrafficSourceData,
  UpdateUniversityTrafficSourceData,
  RecordTrafficVisitData,
  TrafficStatsOverview,
} from '../../domains/university-traffic/university-traffic.repository'
import {
  UniversityTrafficSource,
  UniversityTrafficVisit,
} from '../../domains/university-traffic/university-traffic.entity'

@Injectable()
export class PrismaUniversityTrafficRepository implements IUniversityTrafficRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapSourceToEntity(raw: any): UniversityTrafficSource {
    return new UniversityTrafficSource({
      id: raw.id,
      identifier: raw.identifier,
      name: raw.name,
      channel: raw.channel,
      targetUrl: raw.targetUrl,
      description: raw.description,
      totalViews: raw.totalViews,
      uniqueViews: raw.uniqueViews,
      conversions: raw.conversions,
      isActive: raw.isActive,
      lastVisitedAt: raw.lastVisitedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })
  }

  private mapVisitToEntity(raw: any): UniversityTrafficVisit {
    return new UniversityTrafficVisit({
      id: raw.id,
      sourceId: raw.sourceId,
      identifier: raw.identifier,
      visitorId: raw.visitorId,
      sessionId: raw.sessionId,
      ipHash: raw.ipHash,
      userAgent: raw.userAgent,
      referer: raw.referer,
      path: raw.path,
      isUnique: raw.isUnique,
      createdAt: raw.createdAt,
    })
  }

  async findSourceById(id: string): Promise<UniversityTrafficSource | null> {
    const raw = await (this.prisma as any).upward_university_source.findUnique({
      where: { id },
    })
    return raw ? this.mapSourceToEntity(raw) : null
  }

  async findSourceByIdentifier(identifier: string): Promise<UniversityTrafficSource | null> {
    const normalized = identifier.trim().toLowerCase()
    const raw = await (this.prisma as any).upward_university_source.findUnique({
      where: { identifier: normalized },
    })
    return raw ? this.mapSourceToEntity(raw) : null
  }

  async createSource(data: CreateUniversityTrafficSourceData): Promise<UniversityTrafficSource> {
    const normalizedIdentifier = data.identifier.trim().toLowerCase()
    const raw = await (this.prisma as any).upward_university_source.create({
      data: {
        identifier: normalizedIdentifier,
        name: data.name.trim(),
        channel: (data.channel || 'OTHER').toUpperCase(),
        targetUrl: data.targetUrl || '/university',
        description: data.description,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    })
    return this.mapSourceToEntity(raw)
  }

  async updateSource(id: string, data: UpdateUniversityTrafficSourceData): Promise<UniversityTrafficSource> {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.channel !== undefined) updateData.channel = data.channel.toUpperCase()
    if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl
    if (data.description !== undefined) updateData.description = data.description
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const raw = await (this.prisma as any).upward_university_source.update({
      where: { id },
      data: updateData,
    })
    return this.mapSourceToEntity(raw)
  }

  async deleteSource(id: string): Promise<void> {
    await (this.prisma as any).upward_university_source.delete({
      where: { id },
    })
  }

  async listSources(options: {
    page?: number
    limit?: number
    search?: string
    channel?: string
    isActive?: boolean
  } = {}): Promise<{
    data: UniversityTrafficSource[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 50
    const skip = (page - 1) * limit

    const where: any = {}
    if (options.channel && options.channel !== 'ALL') {
      where.channel = options.channel.toUpperCase()
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive
    }
    if (options.search && options.search.trim()) {
      const q = options.search.trim()
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { identifier: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, records] = await Promise.all([
      (this.prisma as any).upward_university_source.count({ where }),
      (this.prisma as any).upward_university_source.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ uniqueViews: 'desc' }, { createdAt: 'desc' }],
      }),
    ])

    return {
      data: records.map((r: any) => this.mapSourceToEntity(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  async getStatsOverview(): Promise<TrafficStatsOverview> {
    const sources = await (this.prisma as any).upward_university_source.findMany()

    let totalViews = 0
    let uniqueViews = 0
    let totalConversions = 0
    const channelMap = new Map<string, { views: number; uniqueViews: number; conversions: number }>()

    for (const s of sources) {
      totalViews += s.totalViews
      uniqueViews += s.uniqueViews
      totalConversions += s.conversions

      const channel = s.channel || 'OTHER'
      const curr = channelMap.get(channel) || { views: 0, uniqueViews: 0, conversions: 0 }
      curr.views += s.totalViews
      curr.uniqueViews += s.uniqueViews
      curr.conversions += s.conversions
      channelMap.set(channel, curr)
    }

    const channelBreakdown = Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel,
      views: stats.views,
      uniqueViews: stats.uniqueViews,
      conversions: stats.conversions,
    }))

    const overallConversionRate =
      uniqueViews > 0 ? Math.round((totalConversions / uniqueViews) * 10000) / 100 : 0

    return {
      totalSources: sources.length,
      totalViews,
      uniqueViews,
      totalConversions,
      overallConversionRate,
      channelBreakdown,
    }
  }

  async recordVisit(data: RecordTrafficVisitData): Promise<{
    visit: UniversityTrafficVisit
    isDeduplicated: boolean
    isNewUnique: boolean
  }> {
    const normalizedIdentifier = data.identifier.trim().toLowerCase()

    // 1. Find or auto-create the source record
    let source = await (this.prisma as any).upward_university_source.findUnique({
      where: { identifier: normalizedIdentifier },
    })

    if (!source) {
      source = await (this.prisma as any).upward_university_source.create({
        data: {
          identifier: normalizedIdentifier,
          name: `Organic / Ref (${normalizedIdentifier})`,
          channel: 'OTHER',
          targetUrl: data.path || '/university',
          isActive: true,
        },
      })
    }

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 2. GA-Level Deduplication Check:
    // Check if the same session or visitor visited this identifier within the last 30 minutes
    const recentSessionVisit = await (this.prisma as any).upward_university_visit.findFirst({
      where: {
        identifier: normalizedIdentifier,
        OR: [
          { sessionId: data.sessionId },
          ...(data.ipHash ? [{ visitorId: data.visitorId, ipHash: data.ipHash }] : [{ visitorId: data.visitorId }]),
        ],
        createdAt: { gte: thirtyMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentSessionVisit) {
      // Reload / repeat interaction within the same 30m window:
      // Return existing entity without incrementing views
      return {
        visit: this.mapVisitToEntity(recentSessionVisit),
        isDeduplicated: true,
        isNewUnique: false,
      }
    }

    // 3. Unique Visitor check (within 24 hours)
    const priorUniqueVisit = await (this.prisma as any).upward_university_visit.findFirst({
      where: {
        identifier: normalizedIdentifier,
        visitorId: data.visitorId,
        createdAt: { gte: twentyFourHoursAgo },
      },
    })

    const isNewUnique = !priorUniqueVisit

    // 4. Create new visit log & increment source counters atomically
    const [visitRecord] = await (this.prisma as any).$transaction([
      (this.prisma as any).upward_university_visit.create({
        data: {
          sourceId: source.id,
          identifier: normalizedIdentifier,
          visitorId: data.visitorId,
          sessionId: data.sessionId,
          ipHash: data.ipHash,
          userAgent: data.userAgent?.slice(0, 500),
          referer: data.referer?.slice(0, 500),
          path: data.path || '/university',
          isUnique: isNewUnique,
        },
      }),
      (this.prisma as any).upward_university_source.update({
        where: { id: source.id },
        data: {
          totalViews: { increment: 1 },
          ...(isNewUnique ? { uniqueViews: { increment: 1 } } : {}),
          lastVisitedAt: now,
        },
      }),
    ])

    return {
      visit: this.mapVisitToEntity(visitRecord),
      isDeduplicated: false,
      isNewUnique,
    }
  }

  async incrementConversion(identifier: string): Promise<boolean> {
    if (!identifier) return false
    const normalized = identifier.trim().toLowerCase()

    const source = await (this.prisma as any).upward_university_source.findUnique({
      where: { identifier: normalized },
    })

    if (!source) return false

    await (this.prisma as any).upward_university_source.update({
      where: { id: source.id },
      data: {
        conversions: { increment: 1 },
      },
    })

    return true
  }

  async listVisitsForSource(sourceId: string, limit = 50): Promise<UniversityTrafficVisit[]> {
    const visits = await (this.prisma as any).upward_university_visit.findMany({
      where: { sourceId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
    return visits.map((v: any) => this.mapVisitToEntity(v))
  }
}
