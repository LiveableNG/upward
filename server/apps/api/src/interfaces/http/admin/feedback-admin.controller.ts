import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Controller('admin/feedback')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class FeedbackAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFeedback(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') typeFilter?: string,
    @Query('source') sourceFilter?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (typeFilter && typeFilter !== 'ALL') {
      where.type = typeFilter
    }

    if (sourceFilter && sourceFilter !== 'ALL') {
      if (sourceFilter === 'UPWARD_PM') {
        where.pmId = { not: null }
      } else if (sourceFilter === 'UPWARD_PAY') {
        where.userId = { not: null }
      } else if (sourceFilter === 'GUEST') {
        where.pmId = null
        where.userId = null
      }
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
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

  @Get('stats')
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFeedbackStats() {
    const [totalFeedback, feedbackByType, recentCount] = await Promise.all([
      this.prisma.upward_feedback.count(),
      this.prisma.upward_feedback.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.upward_feedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
          },
        },
      }),
    ])

    return {
      totalFeedback,
      feedbackByType,
      recentCount,
    }
  }
}
