import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { IEarlyAccessRepository, EarlyAccessStats } from '../../domains/early-access/early-access.repository'
import {
  EarlyAccessEntry,
  EarlyAccessProps,
} from '../../domains/early-access/early-access.entity'

@Injectable()
export class PrismaEarlyAccessRepository implements IEarlyAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(entry: EarlyAccessEntry): Promise<EarlyAccessEntry> {
    const rawData = entry.toObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (this.prisma as any).upward_early_access.create({
      data: {
        id: rawData.id,
        type: rawData.type,
        name: rawData.name,
        whatsapp: rawData.whatsapp,
        email: rawData.email ?? null,
        city: rawData.city,
        ageBracket: rawData.ageBracket ?? null,
        experienceLevel: rawData.experienceLevel ?? null,
        interest: rawData.interest ?? null,
        propertyCount: rawData.propertyCount ?? null,
        landlordStatus: rawData.landlordStatus ?? null,
        managementStyle: rawData.managementStyle ?? null,
        sourceIdentifier: rawData.sourceIdentifier ?? null,
        abVariant: rawData.abVariant ? rawData.abVariant.toUpperCase() : 'A',
      },
    })

    return EarlyAccessEntry.restore({
      id: created.id,
      type: created.type,
      name: created.name,
      whatsapp: created.whatsapp,
      email: created.email,
      city: created.city,
      ageBracket: created.ageBracket,
      experienceLevel: created.experienceLevel,
      interest: created.interest,
      propertyCount: created.propertyCount,
      landlordStatus: created.landlordStatus,
      managementStyle: created.managementStyle,
      sourceIdentifier: created.sourceIdentifier,
      abVariant: created.abVariant || 'A',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    })
  }

  async findById(id: string): Promise<EarlyAccessEntry | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (this.prisma as any).upward_early_access.findUnique({
      where: { id },
    })

    if (!record) return null

    return EarlyAccessEntry.restore(record as EarlyAccessProps)
  }

  async findAll(params?: {
    type?: string
    search?: string
    sourceIdentifier?: string
    sessionDate?: string
    limit?: number
    offset?: number
  }): Promise<{ entries: EarlyAccessEntry[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = []

    if (params?.type && params.type !== 'ALL') {
      conditions.push({ type: params.type.toUpperCase() })
    }

    if (params?.sourceIdentifier && params.sourceIdentifier !== 'ALL') {
      conditions.push({ sourceIdentifier: params.sourceIdentifier })
    }

    if (params?.sessionDate && params.sessionDate !== 'ALL') {
      const s = params.sessionDate.trim()
      if (s === 'WEBINAR_NOV_21' || /21st\s*nov/i.test(s)) {
        conditions.push({
          OR: [
            { interest: { contains: '21st November', mode: 'insensitive' } },
            { interest: { contains: 'Nov 21', mode: 'insensitive' } },
            { interest: { contains: '21 Nov', mode: 'insensitive' } },
          ],
        })
      } else if (s === 'WEBINAR_ALL') {
        conditions.push({
          OR: [
            { interest: { contains: 'Webinar', mode: 'insensitive' } },
            { interest: { contains: '21st November', mode: 'insensitive' } },
          ],
        })
      } else if (s === 'ONLINE_TUE') {
        conditions.push({ interest: { contains: 'Tuesday', mode: 'insensitive' } })
      } else if (s === 'ONLINE_SAT') {
        conditions.push({ interest: { contains: 'Saturday', mode: 'insensitive' } })
      } else if (s === 'PHYSICAL_ABUJA') {
        conditions.push({ interest: { contains: 'Abuja', mode: 'insensitive' } })
      } else if (s === 'PHYSICAL_PH') {
        conditions.push({
          OR: [
            { interest: { contains: 'Port Harcourt', mode: 'insensitive' } },
            { interest: { contains: 'PH', mode: 'insensitive' } },
          ],
        })
      } else if (s === 'PHYSICAL_LAGOS') {
        conditions.push({ interest: { contains: 'Lagos', mode: 'insensitive' } })
      } else if (s === 'PHYSICAL_IBADAN') {
        conditions.push({
          OR: [
            { interest: { contains: 'Ibadan', mode: 'insensitive' } },
            { interest: { contains: 'Bodija', mode: 'insensitive' } },
          ],
        })
      } else {
        const cleanDate = s.startsWith('DATE:') ? s.replace('DATE:', '') : s
        conditions.push({ interest: { contains: cleanDate, mode: 'insensitive' } })
      }
    }

    if (params?.search && params.search.trim().length > 0) {
      const query = params.search.trim()
      conditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { whatsapp: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
          { interest: { contains: query, mode: 'insensitive' } },
          { sourceIdentifier: { contains: query, mode: 'insensitive' } },
        ],
      })
    }

    const where = conditions.length > 0 ? { AND: conditions } : {}

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [records, total] = await Promise.all([
      (this.prisma as any).upward_early_access.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      (this.prisma as any).upward_early_access.count({ where }),
    ])

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entries: records.map((record: any) => EarlyAccessEntry.restore(record as EarlyAccessProps)),
      total,
    }
  }

  async getStats(): Promise<EarlyAccessStats> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [totalSubmissions, studentCount, landlordCount, cityGroups] = await Promise.all([
      (this.prisma as any).upward_early_access.count(),
      (this.prisma as any).upward_early_access.count({ where: { type: 'STUDENT' } }),
      (this.prisma as any).upward_early_access.count({ where: { type: 'LANDLORD' } }),
      (this.prisma as any).upward_early_access.groupBy({
        by: ['city'],
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cityBreakdown = cityGroups.map((g: any) => ({
      city: g.city || 'Unknown',
      count: g._count.city,
    }))

    return {
      totalSubmissions,
      studentCount,
      landlordCount,
      cityBreakdown,
    }
  }

  async delete(id: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).upward_early_access.delete({
      where: { id },
    })
    return true
  }
}
