import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('admin/feedback')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class FeedbackAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getFeedback(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') typeFilter?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (typeFilter && typeFilter !== 'ALL') {
      where.type = typeFilter
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
      }),
      this.prisma.upward_feedback.count({ where }),
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
