import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class GetWaitlistUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private buildUserWhereClause(options: {
    search?: string
    isWaitlist?: string
    isInvited?: string
    unsubscribed?: string
    createdFrom?: string
    createdTo?: string
  }) {
    const {
      search,
      isWaitlist,
      isInvited,
      unsubscribed,
      createdFrom,
      createdTo,
    } = options
    const where: Prisma.upward_userWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isWaitlist === 'true') {
      where.isFromWaitlist = true
    } else if (isWaitlist === 'false') {
      where.isFromWaitlist = false
    }

    if (isInvited === 'true') {
      where.isFromInvite = true
    } else if (isInvited === 'false') {
      where.isFromInvite = false
    }

    if (unsubscribed === 'true') {
      where.unsubscribed = true
    } else if (unsubscribed === 'false') {
      where.unsubscribed = false
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom && { gte: new Date(createdFrom) }),
        ...(createdTo && { lte: new Date(createdTo) }),
      }
    }

    return where
  }

  async execute(options: {
    page: number
    limit: number
    search?: string
    isWaitlist?: string
    isInvited?: string
    unsubscribed?: string
    createdFrom?: string
    createdTo?: string
  }) {
    const { page, limit } = options
    const skip = (page - 1) * limit
    const where = this.buildUserWhereClause(options)

    const [users, total] = await Promise.all([
      this.prisma.upward_user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          emailLogs: true,
        },
      }),
      this.prisma.upward_user.count({ where }),
    ])

    // Map uuid to id string for frontend compatibility
    const data = users.map((user) => ({
      ...user,
      id: user.uuid,
    }))

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

