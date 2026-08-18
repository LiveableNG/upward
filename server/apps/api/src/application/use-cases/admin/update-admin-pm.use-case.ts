import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class UpdateAdminPmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(
    uuid: string,
    data: {
      email?: string
      firstName?: string
      lastName?: string
      phone?: string
      personalEmail?: string
      personalPhone?: string
      businessName?: string
      isVerified?: boolean
      isBlocked?: boolean
      isManuallyBlocked?: boolean
    },
    adminId?: string,
  ) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid },
    })

    if (!pm) {
      throw new NotFoundException('Property Manager not found')
    }

    const updateData: any = {}
    if (data.email !== undefined) {
      updateData.email = data.email ? this.encryption.encrypt(data.email) : null
      updateData.emailHash = data.email ? this.encryption.hash(data.email) : null
    }
    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName ? this.encryption.encrypt(data.firstName) : null
      updateData.firstNameHash = data.firstName ? this.encryption.hash(data.firstName) : null
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName ? this.encryption.encrypt(data.lastName) : null
      updateData.lastNameHash = data.lastName ? this.encryption.hash(data.lastName) : null
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone ? this.encryption.encrypt(data.phone) : null
      updateData.phoneHash = data.phone ? this.encryption.hash(data.phone) : null
    }
    if (data.personalEmail !== undefined) {
      updateData.personalEmail = data.personalEmail ? this.encryption.encrypt(data.personalEmail) : null
    }
    if (data.personalPhone !== undefined) {
      updateData.personalPhone = data.personalPhone ? this.encryption.encrypt(data.personalPhone) : null
    }
    if (data.businessName !== undefined) {
      updateData.businessName = data.businessName ? this.encryption.encrypt(data.businessName) : null
    }
    if (data.isVerified !== undefined) {
      updateData.isVerified = data.isVerified
    }
    if (data.isBlocked !== undefined) {
      updateData.isBlocked = data.isBlocked
    }
    if (data.isManuallyBlocked !== undefined) {
      updateData.isManuallyBlocked = data.isManuallyBlocked
    }

    const updatedPm = await this.prisma.upward_property_manager.update({
      where: { uuid },
      data: updateData,
    })

    if (data.isVerified === true) {
      await this.prisma.upward_user_property.updateMany({
        where: { pmId: pm.id },
        data: {
          isVerified: true,
          verificationStatus: 'VERIFIED'
        }
      })
    } else if (data.isVerified === false) {
      await this.prisma.upward_user_property.updateMany({
        where: { pmId: pm.id },
        data: {
          isVerified: false,
          verificationStatus: 'UNVERIFIED'
        }
      })
    }

    if (data.isBlocked !== undefined || data.isManuallyBlocked !== undefined) {
      if (adminId) {
        let logAction = 'PM_UPDATE'
        let logDetails = `Updated PM profile details`
        
        if (data.isBlocked !== undefined) {
          logAction = data.isBlocked ? 'PM_SUBSCRIPTION_SUSPENDED' : 'PM_SUBSCRIPTION_ACTIVATED'
          logDetails = `${data.isBlocked ? 'Suspended' : 'Activated'} PM subscription for PM: ${pm.email ? this.encryption.decrypt(pm.email) : pm.uuid}`
        } else if (data.isManuallyBlocked !== undefined) {
          logAction = data.isManuallyBlocked ? 'PM_BANNED' : 'PM_UNBANNED'
          logDetails = `${data.isManuallyBlocked ? 'Banned' : 'Unbanned'} PM account for PM: ${pm.email ? this.encryption.decrypt(pm.email) : pm.uuid}`
        }

        await this.prisma.upward_admin_log.create({
          data: {
            adminId,
            action: logAction,
            details: logDetails,
          }
        })
      }
    }

    return updatedPm
  }
}
