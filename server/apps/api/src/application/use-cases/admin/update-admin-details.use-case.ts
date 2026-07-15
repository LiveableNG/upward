import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { AdminRole } from '@upward/shared-types'

@Injectable()
export class UpdateAdminDetailsUseCase {
  constructor(private readonly prisma: PrismaService) { }

  async execute(adminId: string, data: { phone?: string; receivesSystemAlerts?: boolean }, requesterRole?: AdminRole) {
    if (requesterRole && requesterRole !== AdminRole.DEVELOPER) {
      throw new BadRequestException('Only DEVELOPER can update admin details directly.')
    }

    const admin = await this.prisma.upward_admin.findUnique({ where: { id: adminId } })
    if (!admin) {
      throw new NotFoundException('Admin not found')
    }

    const updateData: any = {}

    if (data.phone !== undefined) {
      if (data.phone !== null && data.phone.trim() !== '') {
        const phoneRegex = /^\+[1-9]\d{1,14}$/
        if (!phoneRegex.test(data.phone)) {
          throw new BadRequestException('Phone number must be in E.164 international format (e.g. +1234567890)')
        }
        
        const existingPhone = await this.prisma.upward_admin.findUnique({ where: { phone: data.phone } })
        if (existingPhone && existingPhone.id !== adminId) {
          throw new ConflictException('Phone number is already in use by another admin')
        }
        
        updateData.phone = data.phone
      } else {
        updateData.phone = null
      }
    }

    if (data.receivesSystemAlerts !== undefined) {
      updateData.receivesSystemAlerts = data.receivesSystemAlerts
    }

    const updatedAdmin = await this.prisma.upward_admin.update({
      where: { id: adminId },
      data: updateData,
    })

    return updatedAdmin
  }
}
