import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

type HomeRequestLocation = {
  state: string
  area: string
  subArea?: string
}

export type PmHomeRequestListItem = {
  uuid: string
  displayName: string
  locations: HomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  propertyTypes: string[]
  beds: number
  moveInDate: string | null
  amenities: string[]
  notes: string | null
  status: string
  submittedAt: string
  contactRevealCount: number
  contactRevealedByMe: boolean
}

export type PmHomeRequestDetail = PmHomeRequestListItem & {
  contact: null | {
    fullName: string | null
    email: string
    phone: string
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asLocations(value: unknown): HomeRequestLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const state = typeof record.state === 'string' ? record.state : ''
      const area = typeof record.area === 'string' ? record.area : ''
      if (!state || !area) return null
      const location: HomeRequestLocation = { state, area }
      if (typeof record.subArea === 'string' && record.subArea.trim()) {
        location.subArea = record.subArea
      }
      return location
    })
    .filter((item): item is HomeRequestLocation => item !== null)
}

function displayNameFrom(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim()
  return trimmed || 'Prospect'
}

@Injectable()
export class ListPmHomeRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number): Promise<PmHomeRequestListItem[]> {
    const rows = await this.prisma.upward_home_request.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contactReveals: {
          select: { pmId: true },
        },
      },
    })

    return rows.map((row) => ({
      uuid: row.uuid,
      displayName: displayNameFrom(row.fullName),
      locations: asLocations(row.locations),
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      propertyTypes: asStringArray(row.propertyType),
      beds: row.beds,
      moveInDate: row.moveInDate ? row.moveInDate.toISOString() : null,
      amenities: asStringArray(row.amenities),
      notes: row.notes,
      status: row.status,
      submittedAt: row.createdAt.toISOString(),
      contactRevealCount: row.contactReveals.length,
      contactRevealedByMe: row.contactReveals.some((reveal) => reveal.pmId === pmId),
    }))
  }
}

@Injectable()
export class GetPmHomeRequestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, requestUuid: string): Promise<PmHomeRequestDetail> {
    const row = await this.prisma.upward_home_request.findUnique({
      where: { uuid: requestUuid },
      include: {
        contactReveals: {
          select: { pmId: true },
        },
      },
    })

    if (!row) throw new NotFoundException('Home request not found')

    const revealedByMe = row.contactReveals.some((reveal) => reveal.pmId === pmId)

    return {
      uuid: row.uuid,
      displayName: displayNameFrom(row.fullName),
      locations: asLocations(row.locations),
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      propertyTypes: asStringArray(row.propertyType),
      beds: row.beds,
      moveInDate: row.moveInDate ? row.moveInDate.toISOString() : null,
      amenities: asStringArray(row.amenities),
      notes: row.notes,
      status: row.status,
      submittedAt: row.createdAt.toISOString(),
      contactRevealCount: row.contactReveals.length,
      contactRevealedByMe: revealedByMe,
      contact: revealedByMe
        ? {
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
          }
        : null,
    }
  }
}

@Injectable()
export class RevealPmHomeRequestContactUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getPmHomeRequestUseCase: GetPmHomeRequestUseCase,
  ) {}

  async execute(pmId: number, requestUuid: string, limit?: number): Promise<PmHomeRequestDetail> {
    const row = await this.prisma.upward_home_request.findUnique({
      where: { uuid: requestUuid },
    })

    if (!row) throw new NotFoundException('Home request not found')

    // Check if already revealed
    const existing = await this.prisma.upward_home_request_contact_reveal.findUnique({
      where: {
        homeRequestId_pmId: {
          homeRequestId: row.id,
          pmId,
        },
      },
    })

    if (!existing && limit !== undefined && limit < 1.0) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [totalRequestsThisMonth, myRevealsThisMonth] = await Promise.all([
        this.prisma.upward_home_request.count({
          where: {
            createdAt: { gte: startOfMonth },
          },
        }),
        this.prisma.upward_home_request_contact_reveal.count({
          where: {
            pmId,
            createdAt: { gte: startOfMonth },
          },
        }),
      ])

      const allowedReveals = Math.ceil(totalRequestsThisMonth * limit)
      if (myRevealsThisMonth >= allowedReveals) {
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: `Plan Limit Reached: Your tier only permits revealing up to ${limit * 100}% of listings this month (${allowedReveals} reveals allowed based on ${totalRequestsThisMonth} total announcements).`,
          code: 'LIMIT_EXCEEDED',
        })
      }
    }

    await this.prisma.upward_home_request_contact_reveal.upsert({
      where: {
        homeRequestId_pmId: {
          homeRequestId: row.id,
          pmId,
        },
      },
      create: {
        homeRequestId: row.id,
        pmId,
      },
      update: {},
    })

    if (row.status === 'submitted') {
      await this.prisma.upward_home_request.update({
        where: { id: row.id },
        data: { status: 'contacted' },
      })
    }

    return this.getPmHomeRequestUseCase.execute(pmId, requestUuid)
  }
}
