import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetAdminUserDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptUser(u: any) {
    let email = ''
    let firstName = ''
    let lastName = ''
    let phone = ''

    try {
      email = this.encryption.decrypt(u.email)
      firstName = this.encryption.decrypt(u.firstName)
      lastName = this.encryption.decrypt(u.lastName)
      phone = u.phone ? this.encryption.decrypt(u.phone) : ''
    } catch (err) {
      email = u.email
      firstName = u.firstName
      lastName = u.lastName
      phone = u.phone || ''
    }

    return {
      ...u,
      email,
      firstName,
      lastName,
      phone,
    }
  }

  async execute(uuid: string) {
    // 1. Try finding upward_user first
    const u = await this.prisma.upward_user.findUnique({
      where: { uuid },
      include: {
        properties: {
          include: {
            company: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (u) {
      const decryptedUser = this.decryptUser(u)

      // Fetch user's activity logs
      const activityLogs = await this.prisma.upward_app_activity_log.findMany({
        where: {
          OR: [
            { userId: u.id },
            { userEmail: decryptedUser.email },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      // Fetch user property locations
      const propertyIds = decryptedUser.properties.map((p: any) => p.locationId)
      const locations = propertyIds.length > 0
        ? await this.prisma.upward_location.findMany({ where: { id: { in: propertyIds } } })
        : []

      const resolvedProperties = decryptedUser.properties.map((p: any) => {
        const loc = locations.find((l: any) => l.id === p.locationId)
        return {
          ...p,
          location: loc || null,
        }
      })

      return {
        type: 'TENANT',
        id: u.id.toString(),
        uuid: u.uuid,
        email: decryptedUser.email,
        firstName: decryptedUser.firstName,
        lastName: decryptedUser.lastName,
        phone: decryptedUser.phone,
        isFromInvite: u.isFromInvite,
        isFromWaitlist: u.isFromWaitlist,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        properties: resolvedProperties,
        transactions: decryptedUser.transactions,
        supportTickets: decryptedUser.supportTickets,
        activityLogs,
      }
    }

    // 2. If not found, try finding upward_pm_tenant (invited pending)
    const t = await this.prisma.upward_pm_tenant.findUnique({
      where: { uuid },
      include: {
        pm: true,
        units: {
          include: {
            property: true,
          },
        },
      },
    })

    if (!t) {
      throw new NotFoundException('User or Tenant details not found')
    }

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

    // Fetch activity logs using email
    const activityLogs = email
      ? await this.prisma.upward_app_activity_log.findMany({
          where: { userEmail: email },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : []

    return {
      type: 'PENDING_TENANT',
      id: `pm_t_${t.id}`,
      uuid: t.uuid,
      email,
      firstName,
      lastName,
      phone,
      isFromInvite: true,
      isFromWaitlist: false,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      inviteStatus: t.inviteStatus,
      inviteSentAt: t.inviteSentAt,
      pm: {
        id: t.pm.id,
        businessName: t.pm.businessName,
        email: t.pm.email,
      },
      units: t.units,
      properties: t.units.map((u: any) => u.property),
      transactions: [],
      supportTickets: [],
      activityLogs,
    }
  }
}
