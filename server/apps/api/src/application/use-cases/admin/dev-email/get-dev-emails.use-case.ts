import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

export interface GetDevEmailsDto {
  page?: string
  limit?: string
  search?: string
}

@Injectable()
export class GetDevEmailsAdminUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: GetDevEmailsDto) {
    const pageNum = dto.page ? parseInt(dto.page) : 1
    const limitNum = dto.limit ? parseInt(dto.limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (dto.search) {
      where.OR = [
        { to: { contains: dto.search, mode: 'insensitive' } },
        { subject: { contains: dto.search, mode: 'insensitive' } },
        { html: { contains: dto.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      this.prisma.upward_dev_email_preview.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_dev_email_preview.count({ where }),
    ])

    return {
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  }
}
