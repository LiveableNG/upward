import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export type AdminHomeRequestLocation = {
  state: string
  area: string
  subArea?: string
}

export type AdminHomeRequestItem = {
  id: number
  uuid: string
  requestType: string // 'RENT' | 'BUY'
  fullName: string | null
  email: string
  phone: string
  locations: AdminHomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  savedAmount: number | null
  overallBudget: number | null
  propertyTypes: string[]
  beds: number
  moveInDate: string | null
  amenities: string[]
  notes: string | null
  source: string
  status: string
  createdAt: string
  updatedAt: string
  revealCount: number
  contactReveals: {
    id: number
    uuid: string
    createdAt: string
    pm: {
      id: number
      uuid: string
      name: string
      businessName: string | null
      email: string
      phone: string | null
    } | null
  }[]
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asLocations(value: unknown): AdminHomeRequestLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const state = typeof record.state === 'string' ? record.state : ''
      const area = typeof record.area === 'string' ? record.area : ''
      if (!state || !area) return null
      const location: AdminHomeRequestLocation = { state, area }
      if (typeof record.subArea === 'string' && record.subArea.trim()) {
        location.subArea = record.subArea
      }
      return location
    })
    .filter((item): item is AdminHomeRequestLocation => item !== null)
}

@Injectable()
export class GetAdminHomeRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(params: {
    page?: string
    limit?: string
    status?: string
    requestType?: string
    search?: string
  }) {
    const pageNum = params.page ? Math.max(1, parseInt(params.page, 10)) : 1
    const limitNum = params.limit ? Math.min(100, Math.max(1, parseInt(params.limit, 10))) : 25
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (params.status && params.status !== 'ALL') {
      where.status = params.status
    }

    if (params.requestType && params.requestType !== 'ALL') {
      where.requestType = params.requestType.toUpperCase()
    }

    if (params.search && params.search.trim()) {
      const query = params.search.trim()
      where.OR = [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.upward_home_request.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          contactReveals: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.upward_home_request.count({ where }),
    ])

    // Collect all PM IDs from reveals to batch-fetch PM details
    const pmIds = Array.from(
      new Set(
        rows.flatMap((row) => row.contactReveals.map((rev) => rev.pmId)),
      ),
    )

    const pms = pmIds.length > 0
      ? await this.prisma.upward_property_manager.findMany({
          where: { id: { in: pmIds } },
          select: {
            id: true,
            uuid: true,
            firstName: true,
            lastName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        })
      : []

    const pmMap = new Map(pms.map((pm) => [pm.id, pm]))

    const items: AdminHomeRequestItem[] = rows.map((row: any) => ({
      id: row.id,
      uuid: row.uuid,
      requestType: row.requestType || 'RENT',
      fullName: row.fullName ? this.encryption.decrypt(row.fullName) : null,
      email: this.encryption.decrypt(row.email),
      phone: this.encryption.decrypt(row.phone),
      locations: asLocations(row.locations),
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      savedAmount: row.savedAmount ?? null,
      overallBudget: row.overallBudget ?? null,
      propertyTypes: asStringArray(row.propertyType),
      beds: row.beds,
      moveInDate: row.moveInDate ? row.moveInDate.toISOString() : null,
      amenities: asStringArray(row.amenities),
      notes: row.notes,
      source: row.source,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      revealCount: row.contactReveals.length,
      contactReveals: row.contactReveals.map((rev: any) => {
        const pm = pmMap.get(rev.pmId)
        if (!pm) {
          return {
            id: rev.id,
            uuid: rev.uuid,
            createdAt: rev.createdAt.toISOString(),
            pm: null,
          }
        }

        const fn = pm.firstName ? this.encryption.decrypt(pm.firstName) : ''
        const ln = pm.lastName ? this.encryption.decrypt(pm.lastName) : ''
        const pmName = `${fn} ${ln}`.trim() || 'Property Manager'
        const businessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : null
        const email = pm.email ? this.encryption.decrypt(pm.email) : ''
        const phone = pm.phone ? this.encryption.decrypt(pm.phone) : null

        return {
          id: rev.id,
          uuid: rev.uuid,
          createdAt: rev.createdAt.toISOString(),
          pm: {
            id: pm.id,
            uuid: pm.uuid,
            name: pmName,
            businessName,
            email,
            phone,
          },
        }
      }),
    }))

    return {
      items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  }
}
