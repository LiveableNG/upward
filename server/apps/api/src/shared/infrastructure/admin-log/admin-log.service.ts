import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    adminId: string,
    action: string,
    details?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.upward_admin_log.create({
      data: {
        adminId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    })
  }

  async getLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.upward_admin_log.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.upward_admin_log.count(),
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
