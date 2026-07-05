import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetAdminPmDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptTenant(t: any) {
    let email = ''
    let firstName = ''
    let lastName = ''
    let phone = ''

    try {
      email = t.emailEncrypted ? this.encryption.decrypt(t.emailEncrypted) : ''
      firstName = t.firstNameEncrypted ? this.encryption.decrypt(t.firstNameEncrypted) : ''
      lastName = t.lastNameEncrypted ? this.encryption.decrypt(t.lastNameEncrypted) : ''
      phone = t.phoneEncrypted ? this.encryption.decrypt(t.phoneEncrypted) : ''
    } catch (err) {
      email = t.emailEncrypted || ''
      firstName = t.firstNameSearch || ''
      lastName = t.lastNameSearch || ''
      phone = t.phoneEncrypted || ''
    }

    return {
      ...t,
      email,
      firstName,
      lastName,
      phone,
    }
  }

  async execute(uuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid },
      include: {
        properties: {
          include: {
            units: true,
          },
        },
        tenants: true,
      },
    })

    if (!pm) {
      throw new NotFoundException('Property Manager not found')
    }

    // Decrypt tenants list
    const decryptedTenants = pm.tenants.map((t) => this.decryptTenant(t))

    // Fetch activity logs
    const activityLogs = await this.prisma.upward_app_activity_log.findMany({
      where: {
        OR: [
          { pmId: pm.id },
          { userEmail: pm.email },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Fetch rent payments recorded
    const rentPayments = await this.prisma.upward_pm_rent_payment.findMany({
      where: {
        unit: {
          property: {
            pmId: pm.id,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    })

    return {
      type: 'PM',
      id: pm.id.toString(),
      uuid: pm.uuid,
      email: pm.email ? this.encryption.decrypt(pm.email) : '',
      firstName: pm.firstName ? this.encryption.decrypt(pm.firstName) : '',
      lastName: pm.lastName ? this.encryption.decrypt(pm.lastName) : '',
      businessName: pm.businessName ? this.encryption.decrypt(pm.businessName) : '',
      phone: pm.phone ? this.encryption.decrypt(pm.phone) : '',
      isVerified: pm.isVerified,
      createdAt: pm.createdAt,
      updatedAt: pm.updatedAt,
      properties: pm.properties,
      tenants: decryptedTenants,
      rentPayments,
      activityLogs,
    }
  }
}
