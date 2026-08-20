import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ToggleInternalAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(type: 'user' | 'pm' | 'guest' | 'company' | 'waitlist', uuid: string, isInternal: boolean) {
    if (type === 'user') {
      const user = await this.prisma.upward_user.findUnique({ where: { uuid } })
      if (!user) throw new NotFoundException('User not found')
      
      await this.prisma.upward_user.update({
        where: { uuid },
        data: { isInternal },
      })
    } else if (type === 'pm') {
      const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid } })
      if (!pm) throw new NotFoundException('PM not found')

      await this.prisma.upward_property_manager.update({
        where: { uuid },
        data: { isInternal },
      })
    } else if (type === 'guest') {
      const pmTenant = await this.prisma.upward_pm_tenant.findUnique({ where: { uuid } })
      if (pmTenant) {
        await this.prisma.upward_pm_tenant.update({
          where: { uuid },
          data: { isInternal },
        })
        return { success: true }
      }

      const user = await this.prisma.upward_user.findUnique({ where: { uuid } })
      if (user) {
        await this.prisma.upward_user.update({
          where: { uuid },
          data: { isInternal },
        })
        return { success: true }
      }

      const waitlist = await this.prisma.upward_waitlist.findUnique({ where: { uuid } })
      if (waitlist) {
        await this.prisma.upward_waitlist.update({
          where: { uuid },
          data: { isInternal },
        })
        return { success: true }
      }

      throw new NotFoundException('Guest not found')
    } else if (type === 'company') {
      const company = await this.prisma.upward_company.findUnique({ where: { uuid } })
      if (!company) throw new NotFoundException('Company not found')

      await this.prisma.upward_company.update({
        where: { uuid },
        data: { isInternal },
      })
    } else if (type === 'waitlist') {
      const waitlist = await this.prisma.upward_waitlist.findUnique({ where: { uuid } })
      if (!waitlist) throw new NotFoundException('Waitlist user not found')

      await this.prisma.upward_waitlist.update({
        where: { uuid },
        data: { isInternal },
      })
    } else {
      throw new BadRequestException('Invalid account type')
    }

    return { success: true }
  }
}

