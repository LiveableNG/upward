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

  async findAll(params?: { type?: string; search?: string; limit?: number; offset?: number }): Promise<{ entries: EarlyAccessEntry[]; total: number }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (params?.type && params.type !== 'ALL') {
      where.type = params.type.toUpperCase()
    }

    if (params?.search && params.search.trim().length > 0) {
      const query = params.search.trim()
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { whatsapp: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ]
    }

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
