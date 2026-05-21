import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('admin/dev-emails')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class DevEmailAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getDevEmails(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [
        { to: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { html: { contains: search, mode: 'insensitive' } },
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

  @Get(':uuid')
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getDevEmailDetails(@Param('uuid') uuid: string) {
    return this.prisma.upward_dev_email_preview.findUnique({
      where: { uuid },
    })
  }

  @Delete()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async clearAllDevEmails() {
    await this.prisma.upward_dev_email_preview.deleteMany()
    return { success: true, message: 'All dev preview emails have been cleared.' }
  }
}
