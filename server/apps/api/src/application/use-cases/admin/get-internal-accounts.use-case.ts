import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetInternalAccountsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  async execute() {
    // 1. Fetch Registered / Shadow Users
    const rawUsers = await this.prisma.upward_user.findMany({
      select: {
        uuid: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        passwordHash: true,
        isFromInvite: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const users = await Promise.all(
      rawUsers.map(async (u: any) => ({
        uuid: u.uuid,
        isInternal: u.isInternal,
        hasRealPassword: !u.isFromInvite || (u.passwordHash?.startsWith('$2') || false),
        firstName: await this.encryption.decrypt(u.firstName),
        lastName: await this.encryption.decrypt(u.lastName),
        email: await this.encryption.decrypt(u.email),
        phone: u.phone ? await this.encryption.decrypt(u.phone) : null,
      }))
    )

    // 2. Fetch Independent PMs
    const rawPms = await this.prisma.upward_property_manager.findMany({
      select: {
        uuid: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const pms = await Promise.all(
      rawPms.map(async (pm: any) => ({
        uuid: pm.uuid,
        isInternal: pm.isInternal,
        firstName: await this.encryption.decrypt(pm.firstName),
        lastName: await this.encryption.decrypt(pm.lastName),
        email: await this.encryption.decrypt(pm.email),
        phone: pm.phone ? await this.encryption.decrypt(pm.phone) : null,
        businessName: pm.businessName ? await this.encryption.decrypt(pm.businessName) : null,
      }))
    )

    // 3. Fetch Platforms (Companies)
    const rawCompanies = await this.prisma.upward_company.findMany({
      select: {
        uuid: true,
        name: true,
        email: true,
        phone: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const companies = await Promise.all(
      rawCompanies.map(async (c: any) => ({
        uuid: c.uuid,
        isInternal: c.isInternal,
        firstName: null,
        lastName: null,
        email: c.email ? await this.encryption.decrypt(c.email) : null,
        phone: c.phone ? await this.encryption.decrypt(c.phone) : null,
        businessName: await this.encryption.decrypt(c.name),
      }))
    )

    // 4. Fetch Pending Invites (Guests)
    const rawGuests = await this.prisma.upward_pm_tenant.findMany({
      select: {
        uuid: true,
        firstNameEncrypted: true,
        lastNameEncrypted: true,
        emailEncrypted: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const guests = await Promise.all(
      rawGuests.map(async (g: any) => ({
        uuid: g.uuid,
        isInternal: g.isInternal,
        firstName: g.firstNameEncrypted ? await this.encryption.decrypt(g.firstNameEncrypted) : null,
        lastName: g.lastNameEncrypted ? await this.encryption.decrypt(g.lastNameEncrypted) : null,
        email: g.emailEncrypted ? await this.encryption.decrypt(g.emailEncrypted) : null,
      }))
    )

    // 5. Fetch Waitlist (Guests)
    const rawWaitlist = await this.prisma.upward_waitlist.findMany({
      select: {
        uuid: true,
        firstName: true,
        lastName: true,
        email: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const waitlist = rawWaitlist.map((w: any) => ({
      uuid: w.uuid,
      isInternal: w.isInternal,
      firstName: w.firstName,
      lastName: w.lastName,
      email: w.email,
    }))

    return {
      users,
      pms,
      companies,
      guests,
      waitlist,
    }
  }
}
