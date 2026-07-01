import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class UpdateAdminUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(
    idOrUuid: string,
    data: {
      email?: string
      firstName?: string
      lastName?: string
      phone?: string
    },
  ) {
    // 1. Try waitlist first
    const waitlist = await this.prisma.upward_waitlist.findUnique({
      where: { id: idOrUuid },
    })

    if (waitlist) {
      if (data.phone && !/^\+234\d{10}$/.test(data.phone)) {
        throw new Error('Phone number must be in format +2348000000000')
      }
      return this.prisma.upward_waitlist.update({
        where: { id: idOrUuid },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
    }

    // 2. Try upward_user
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: idOrUuid },
    })

    if (user) {
      const updateData: any = {}
      if (data.email) {
        updateData.email = this.encryption.encrypt(data.email)
        updateData.emailHash = this.encryption.hash(data.email)
      }
      if (data.firstName) {
        updateData.firstName = this.encryption.encrypt(data.firstName)
        updateData.firstNameHash = this.encryption.hash(data.firstName)
      }
      if (data.lastName) {
        updateData.lastName = this.encryption.encrypt(data.lastName)
        updateData.lastNameHash = this.encryption.hash(data.lastName)
      }
      if (data.phone) {
        updateData.phone = this.encryption.encrypt(data.phone)
        updateData.phoneHash = this.encryption.hash(data.phone)
      }

      return this.prisma.upward_user.update({
        where: { uuid: idOrUuid },
        data: updateData,
      })
    }

    // 3. Try pm_tenant
    const pmTenant = await this.prisma.upward_pm_tenant.findUnique({
      where: { uuid: idOrUuid },
    })

    if (pmTenant) {
      const updateData: any = {}
      if (data.email) {
        updateData.emailEncrypted = this.encryption.encrypt(data.email)
        updateData.emailHash = this.encryption.hash(data.email)
      }
      if (data.firstName) {
        updateData.firstNameEncrypted = this.encryption.encrypt(data.firstName)
        updateData.firstNameSearch = data.firstName
      }
      if (data.lastName) {
        updateData.lastNameEncrypted = this.encryption.encrypt(data.lastName)
        updateData.lastNameSearch = data.lastName
      }
      if (data.phone) {
        updateData.phoneEncrypted = this.encryption.encrypt(data.phone)
        updateData.phoneHash = this.encryption.hash(data.phone)
      }
      return this.prisma.upward_pm_tenant.update({
        where: { uuid: idOrUuid },
        data: updateData,
      })
    }

    throw new NotFoundException('User, Tenant, or Waitlist entry not found')
  }
}
