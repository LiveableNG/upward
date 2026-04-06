import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { Tenant, TenantRepository } from '@domains/users/tenant.repository'

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(model: any): Tenant {
    return {
      id: model.id,
      email: model.email,
      fullName: model.fullName,
      phone: model.phone,
      passwordHash: model.passwordHash,
      invitedByCompanyId: model.invitedByCompanyId,
      invitedByCompanyName: model.invitedByCompanyName,
      invitedByCompanyLogo: model.invitedByCompanyLogo,
      rentAnniversary: model.rentAnniversary,
      address: model.address,
      occupation: model.occupation,
      gender: model.gender,
      dateOfBirth: model.dateOfBirth,
      isConvertedFromWaitlist: model.isConvertedFromWaitlist,
      hasDismissedAppBanner: model.hasDismissedAppBanner,
      isGuest: model.isGuest,
      profilePic: model.profilePic,
      showSavings: model.showSavings,
      useBiometrics: model.useBiometrics,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    }
  }

  async findByEmail(email: string): Promise<Tenant | null> {
    const record = await this.prisma.upward_tenant.findUnique({
      where: { email },
    })
    return record ? this.toDomain(record) : null
  }

  async findById(id: string): Promise<Tenant | null> {
    const record = await this.prisma.upward_tenant.findUnique({
      where: { id },
    })
    return record ? this.toDomain(record) : null
  }

  async save(tenant: Tenant): Promise<void> {
    await this.prisma.upward_tenant.create({
      data: {
        id: tenant.id,
        email: tenant.email,
        fullName: tenant.fullName,
        phone: tenant.phone,
        passwordHash: tenant.passwordHash,
        invitedByCompanyId: tenant.invitedByCompanyId,
        invitedByCompanyName: tenant.invitedByCompanyName,
        invitedByCompanyLogo: tenant.invitedByCompanyLogo,
        rentAnniversary: tenant.rentAnniversary,
        address: tenant.address,
        occupation: tenant.occupation,
        gender: tenant.gender,
        dateOfBirth: tenant.dateOfBirth,
        isConvertedFromWaitlist: tenant.isConvertedFromWaitlist,
        hasDismissedAppBanner: tenant.hasDismissedAppBanner,
        isGuest: tenant.isGuest,
        profilePic: tenant.profilePic,
        showSavings: tenant.showSavings,
        useBiometrics: tenant.useBiometrics,
      },
    })
  }

  async update(id: string, data: Partial<Tenant>): Promise<void> {
    await this.prisma.upward_tenant.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        passwordHash: data.passwordHash,
        invitedByCompanyId: data.invitedByCompanyId,
        invitedByCompanyName: data.invitedByCompanyName,
        invitedByCompanyLogo: data.invitedByCompanyLogo,
        rentAnniversary: data.rentAnniversary,
        address: data.address,
        occupation: data.occupation,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        isConvertedFromWaitlist: data.isConvertedFromWaitlist,
        hasDismissedAppBanner: data.hasDismissedAppBanner,
        isGuest: data.isGuest,
        profilePic: data.profilePic,
        showSavings: data.showSavings,
        useBiometrics: data.useBiometrics,
      },
    })
  }
}
