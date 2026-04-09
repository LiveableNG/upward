import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class GetWaitlistUseCase {
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

  async execute(options: {
    page: number
    limit: number
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
    const { page, limit } = options
    const skip = (page - 1) * limit
    const where = this.buildWaitlistWhereClause(options)

    const [data, total] = await Promise.all([
      this.prisma.upward_waitlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          attendances: true,
          emailLogs: true,
        },
      }),
      this.prisma.upward_waitlist.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
