import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetWaitlistUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private buildUserWhereClause(options: {
    isWaitlist?: string
    isInvited?: string
    unsubscribed?: string
    createdFrom?: string
    createdTo?: string
  }) {
    const {
      isWaitlist,
      isInvited,
      unsubscribed,
      createdFrom,
      createdTo,
    } = options
    const where: Prisma.upward_userWhereInput = {}

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

  private decryptUser(user: any) {
    return {
      ...user,
      email: this.encryption.decrypt(user.email),
      firstName: this.encryption.decrypt(user.firstName),
      lastName: this.encryption.decrypt(user.lastName),
      phone: user.phone ? this.encryption.decrypt(user.phone) : user.phone,
    }
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
    const { page, limit, search } = options
    const skip = (page - 1) * limit
    const where = this.buildUserWhereClause(options)

    let finalUsers: any[] = []
    let total = 0

    if (search) {
      const allUsers = await this.prisma.upward_user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          communicationLogs: true,
        },
      })

      const decrypted = allUsers.map((u) => this.decryptUser(u))
      const searchLower = search.toLowerCase()

      const filtered = decrypted.filter((u) => {
        return (
          u.email?.toLowerCase().includes(searchLower) ||
          u.firstName?.toLowerCase().includes(searchLower) ||
          u.lastName?.toLowerCase().includes(searchLower) ||
          u.phone?.toLowerCase().includes(searchLower)
        )
      })

      total = filtered.length
      finalUsers = filtered.slice(skip, skip + limit)
    } else {
      // Without search, we can let database paginate directly
      const [users, dbCount] = await Promise.all([
        this.prisma.upward_user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            communicationLogs: true,
          },
        }),
        this.prisma.upward_user.count({ where }),
      ])

      total = dbCount
      finalUsers = users.map((u) => this.decryptUser(u))
    }

    // Map uuid to id string for frontend compatibility
    const data = finalUsers.map((user) => ({
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

