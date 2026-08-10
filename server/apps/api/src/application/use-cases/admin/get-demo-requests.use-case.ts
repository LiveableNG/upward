import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetDemoRequestsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: {
    page?: string
    limit?: string
    status?: string
    search?: string
  }) {
    const pageNum = params.page ? parseInt(params.page, 10) : 1
    const limitNum = params.limit ? parseInt(params.limit, 10) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (params.status && params.status !== 'ALL') {
      where.status = params.status
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      this.prisma.upward_demo_request.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_demo_request.count({ where }),
    ])

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
