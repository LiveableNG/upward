import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class NotifyEligibleDeletionAccountsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(): Promise<{ notifiedCount: number }> {
    const now = new Date()

    const pms = await (this.prisma as any).upward_property_manager.findMany({
      where: {
        OR: [{ isBlocked: true }, { isManuallyBlocked: true }],
      },
    })

    const users = await (this.prisma as any).upward_user.findMany({
      where: {
        OR: [{ isBlocked: true }, { isManuallyBlocked: true }],
      },
    })

    const milestone10: any[] = []
    const milestone20: any[] = []
    const milestone30: any[] = []

    const processAccount = (acc: any, role: string) => {
      const disabledAt = acc.disabledAt ? new Date(acc.disabledAt) : new Date(acc.updatedAt)
      const diffMs = now.getTime() - disabledAt.getTime()
      const daysDisabled = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      let email = acc.email || ''
      try {
        email = this.encryption.decrypt(email)
      } catch {}

      const item = {
        name: acc.firstName ? `${acc.firstName} ${acc.lastName}` : acc.businessName || role,
        email,
        daysDisabled,
        role,
      }

      if (daysDisabled === 10) {
        milestone10.push(item)
      } else if (daysDisabled === 20) {
        milestone20.push(item)
      } else if (daysDisabled >= 30) {
        milestone30.push(item)
      }
    }

    pms.forEach((pm: any) => processAccount(pm, 'Property Manager'))
    users.forEach((usr: any) => processAccount(usr, 'User'))

    const totalToReport = milestone10.length + milestone20.length + milestone30.length
    if (totalToReport === 0) {
      return { notifiedCount: 0 }
    }

    const subject = `[Admin Digest] Disabled Accounts Retention & Data Deletion Alert`
    const message = `Summary of disabled accounts at 10-day, 20-day, and 30+ day deletion eligibility milestones:
    \n- 10 Days Disabled (Pre-eligibility): ${milestone10.length} account(s)
    \n- 20 Days Disabled (Mid-term reminder): ${milestone20.length} account(s)
    \n- 30+ Days Disabled (Eligible for Permanent Deletion): ${milestone30.length} account(s)
    \nPlease log into the Admin Dashboard under "Data Deletion" section to review and manage these records.`

    await this.emailService.sendSystemAlertToAdmins(subject, message)

    return { notifiedCount: 1 }
  }
}
