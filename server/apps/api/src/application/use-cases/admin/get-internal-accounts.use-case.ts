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
        emailHash: true,
        phone: true,
        passwordHash: true,
        isFromInvite: true,
        isInternal: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const processedUsers = await Promise.all(
      rawUsers.map(async (u: any) => {
        const isShadow =
          !u.passwordHash ||
          u.passwordHash === 'INVITED_NO_PASSWORD' ||
          u.passwordHash === 'SHADOW_GUEST' ||
          (!u.passwordHash.startsWith('$2') && u.passwordHash !== 'SOCIAL_AUTH' && u.passwordHash !== 'SOCIAL_AUTH_NO_PASSWORD')

        return {
          uuid: u.uuid,
          isInternal: u.isInternal,
          hasRealPassword: !isShadow,
          firstName: await this.encryption.decrypt(u.firstName),
          lastName: await this.encryption.decrypt(u.lastName),
          email: await this.encryption.decrypt(u.email),
          phone: u.phone ? await this.encryption.decrypt(u.phone) : null,
        }
      })
    )

    const users = processedUsers.filter((u) => u.hasRealPassword)
    const shadowUsers = processedUsers.filter((u) => !u.hasRealPassword)

    // 2. Fetch Independent PMs
    const rawPms = await this.prisma.upward_property_manager.findMany({
      select: {
        id: true,
        uuid: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isInternal: true,
        pmType: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const pms = await Promise.all(
      rawPms.map(async (pm: any) => ({
        uuid: pm.uuid,
        isInternal: pm.isInternal,
        pmType: pm.pmType ?? null,
        firstName: await this.encryption.decrypt(pm.firstName),
        lastName: await this.encryption.decrypt(pm.lastName),
        email: await this.encryption.decrypt(pm.email),
        phone: pm.phone ? await this.encryption.decrypt(pm.phone) : null,
        businessName: pm.businessName ? await this.encryption.decrypt(pm.businessName) : null,
      }))
    )

    // 3. Fetch Platforms (Companies) — all upward_company records
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

    // 4. Fetch Waitlist (Guests)
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

    const allDecryptedEmails = new Set(processedUsers.map(u => u.email.toLowerCase()))

    const unconvertedWaitlist = rawWaitlist
      .filter((w: any) => !allDecryptedEmails.has(w.email.toLowerCase()))
      .map((w: any) => ({
        uuid: w.uuid,
        isInternal: w.isInternal,
        firstName: w.firstName,
        lastName: w.lastName,
        email: w.email,
      }))

    const guests = [...shadowUsers, ...unconvertedWaitlist]
    const waitlist: any[] = [] // Kept for backwards compatibility if frontend expects it

    return {
      users,
      pms,
      companies,
      guests,
      waitlist,
    }
  }
}
