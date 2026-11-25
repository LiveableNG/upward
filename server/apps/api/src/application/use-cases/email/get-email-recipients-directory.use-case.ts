import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

/**
 * Ultra-lightweight recipient directory for the Admin Email Composer.
 * Runs 3 minimal SELECT queries (~100ms) instead of invoking the heavy
 * /admin/performance-metrics analytics + rent-score pipeline (~85s).
 */
@Injectable()
export class GetEmailRecipientsDirectoryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private safeDecrypt(val?: string | null): string {
    if (!val) return ''
    try {
      return this.encryption.decrypt(val)
    } catch {
      return val
    }
  }

  private isValidEmail(email: string): boolean {
    if (!email) return false
    const e = email.trim().toLowerCase()
    return e.includes('@') && !e.endsWith('@upward.com') && !e.endsWith('@upward.local')
  }

  async execute() {
    const [users, pms, waitlist] = await Promise.all([
      this.prisma.upward_user.findMany({
        where: { isInternal: false, unsubscribed: false },
        select: {
          uuid: true,
          email: true,
          firstName: true,
          lastName: true,
          passwordHash: true,
        },
      }),
      this.prisma.upward_property_manager.findMany({
        select: {
          uuid: true,
          email: true,
          firstName: true,
          lastName: true,
          businessName: true,
        },
      }),
      this.prisma.upward_waitlist.findMany({
        where: { unsubscribed: false },
        select: {
          id: true,
          uuid: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      }),
    ])

    const tenants = users
      .filter((u) => Boolean(u.passwordHash))
      .map((u) => ({
        uuid: u.uuid,
        email: this.safeDecrypt(u.email),
        firstName: this.safeDecrypt(u.firstName),
        lastName: this.safeDecrypt(u.lastName),
        hasPassword: true,
      }))
      .filter((u) => this.isValidEmail(u.email))

    const formattedPms = pms
      .map((p) => ({
        uuid: p.uuid,
        email: this.safeDecrypt(p.email),
        firstName: this.safeDecrypt(p.firstName),
        lastName: this.safeDecrypt(p.lastName),
        businessName: p.businessName || '',
      }))
      .filter((p) => this.isValidEmail(p.email))

    const formattedWaitlist = waitlist
      .map((w) => ({
        id: w.id,
        uuid: w.uuid,
        email: w.email || '',
        firstName: w.firstName || '',
        lastName: w.lastName || '',
      }))
      .filter((w) => this.isValidEmail(w.email))

    return {
      tenants,
      pms: formattedPms,
      waitlist: formattedWaitlist,
    }
  }
}
