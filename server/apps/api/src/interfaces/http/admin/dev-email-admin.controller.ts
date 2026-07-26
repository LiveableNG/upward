import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'

@Controller('admin/dev-emails')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class DevEmailAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
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
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async getDevEmailDetails(@Param('uuid') uuid: string) {
    const email = (await this.prisma.upward_dev_email_preview.findUnique({
      where: { uuid },
    })) as any

    if (!email) return null

    if (email.html && !email.html.includes(' ') && email.html.startsWith('dev-emails/')) {
      try {
        email.html = await this.s3Service.getFileContent(email.html)
      } catch (err) {
        console.error('Failed to get email HTML from S3:', err)
      }
    }

    if (email.attachments && Array.isArray(email.attachments)) {
      const resolvedAttachments = []
      for (const att of email.attachments as any[]) {
        const signedUrl = att.s3Key ? await this.s3Service.getDownloadUrl(att.s3Key) : ''
        resolvedAttachments.push({
          filename: att.filename,
          url: signedUrl,
        })
      }
      ;(email as any).attachments = resolvedAttachments
    }

    return email
  }

  @Delete()
  @Roles(AdminRole.SUPERADMIN, AdminRole.CUSTOMER_SUPPORT, AdminRole.DEVELOPER)
  async clearAllDevEmails() {
    await this.prisma.upward_dev_email_preview.deleteMany()
    await this.s3Service.deleteObjectsWithPrefix('dev-emails/')
    return { success: true, message: 'All dev preview emails have been cleared.' }
  }
}
