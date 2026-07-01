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

    const updateData: any = { ...data }
    if (data.email) {
      updateData.emailHash = this.encryption.hash(data.email)
    }

    return this.prisma.upward_property_manager.update({
      where: { uuid },
      data: updateData,
    })
  }
}
