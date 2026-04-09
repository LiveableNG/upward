import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class GetEmailLogsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: {
    email?: string
    type?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const { email, type, status, page = 1, limit = 10 } = query
    const skip = (page - 1) * limit
    const where: Prisma.upward_email_logWhereInput = {
      ...(email ? { email: { contains: email, mode: 'insensitive' as const } } : {}),
      ...(type && type !== 'All'
        ? type === 'CAMPAIGN'
          ? { type: { startsWith: 'CAMPAIGN' } }
          : { type }
        : {}),
      ...(status && status !== 'All' ? { status } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.upward_email_log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.upward_email_log.count({ where }),
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
