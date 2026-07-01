import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class SendAdminNotificationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    uuid: string,
    data: {
      title: string
      message: string
      userType: 'TENANT' | 'PM'
    },
  ) {
    if (data.userType === 'TENANT') {
      const user = await this.prisma.upward_user.findUnique({
        where: { uuid },
      })
      if (!user) {
        const pmTenant = await this.prisma.upward_pm_tenant.findUnique({
          where: { uuid },
        })
        if (pmTenant) {
          throw new Error('This user has not completed signup yet. In-app notifications are not available.')
        }
        throw new NotFoundException('Tenant user not found')
      }

      return this.prisma.upward_notification.create({
        data: {
          userId: user.id,
          title: data.title,
          message: data.message,
          type: 'SYSTEM',
        },
      })
    } else {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid },
      })
      if (!pm) {
        throw new NotFoundException('Property Manager not found')
      }

      return this.prisma.upward_pm_notification.create({
        data: {
          pmId: pm.id,
          title: data.title,
          message: data.message,
          type: 'SYSTEM',
        },
      })
    }
  }
}
