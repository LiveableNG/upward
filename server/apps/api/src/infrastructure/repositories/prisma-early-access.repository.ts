import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { IEarlyAccessRepository } from '../../domains/early-access/early-access.repository'
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

  async findAll(params?: { type?: string }): Promise<EarlyAccessEntry[]> {
    const where = params?.type ? { type: params.type } : {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = await (this.prisma as any).upward_early_access.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return records.map((record: any) => EarlyAccessEntry.restore(record as EarlyAccessProps))
  }
}
