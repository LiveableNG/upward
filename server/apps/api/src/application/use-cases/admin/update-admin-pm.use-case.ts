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
      businessName?: string
    },
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
    if (data.businessName !== undefined) {
      updateData.businessName = data.businessName ? this.encryption.encrypt(data.businessName) : null
    }

    return this.prisma.upward_property_manager.update({
      where: { uuid },
      data: updateData,
    })
  }
}
