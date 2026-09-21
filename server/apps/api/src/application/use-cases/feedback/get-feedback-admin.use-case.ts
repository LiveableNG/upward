import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface GetFeedbackAdminDto {
  page?: string
  limit?: string
  typeFilter?: string
  sourceFilter?: string
  search?: string
}

@Injectable()
export class GetFeedbackAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(dto: GetFeedbackAdminDto) {
    const pageNum = dto.page ? parseInt(dto.page) : 1
    const limitNum = dto.limit ? parseInt(dto.limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (dto.typeFilter && dto.typeFilter !== 'ALL') {
      where.type = dto.typeFilter
    }

    if (dto.sourceFilter && dto.sourceFilter !== 'ALL') {
      if (dto.sourceFilter === 'UPWARD_PM') {
        where.pmId = { not: null }
      } else if (dto.sourceFilter === 'UPWARD_PAY') {
        where.userId = { not: null }
      } else if (dto.sourceFilter === 'GUEST') {
        where.pmId = null
        where.userId = null
      }
    }

    if (dto.search) {
      where.OR = [
        { email: { contains: dto.search, mode: 'insensitive' } },
        { name: { contains: dto.search, mode: 'insensitive' } },
        { message: { contains: dto.search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      this.prisma.upward_feedback.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          pm: {
            select: { id: true, uuid: true, firstName: true, lastName: true, email: true, businessName: true },
          },
        },
      }),
      this.prisma.upward_feedback.count({ where }),
    ])

    const formattedData = items.map((item: any) => {
      const source = item.pmId ? 'UPWARD_PM' : item.userId ? 'UPWARD_PAY' : 'GUEST'

      const decryptedPm = item.pm
        ? {
            ...item.pm,
            firstName: item.pm.firstName ? this.encryption.decrypt(item.pm.firstName) : '',
            lastName: item.pm.lastName ? this.encryption.decrypt(item.pm.lastName) : '',
            email: item.pm.email ? this.encryption.decrypt(item.pm.email) : '',
            businessName: item.pm.businessName ? this.encryption.decrypt(item.pm.businessName) : '',
          }
        : null

      const decryptedUser = item.user
        ? {
            ...item.user,
            firstName: item.user.firstName ? this.encryption.decrypt(item.user.firstName) : '',
            lastName: item.user.lastName ? this.encryption.decrypt(item.user.lastName) : '',
            email: item.user.email ? this.encryption.decrypt(item.user.email) : '',
          }
        : null

      return {
        ...item,
        name: item.name ? this.encryption.decrypt(item.name) : item.name,
        email: item.email ? this.encryption.decrypt(item.email) : item.email,
        pm: decryptedPm,
        user: decryptedUser,
        source,
      }
    })

    return {
      data: formattedData,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  }
}
