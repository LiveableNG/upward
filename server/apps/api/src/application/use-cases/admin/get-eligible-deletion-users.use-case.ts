import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface EligibleDeletionAccount {
  id: string
  dbId: number | string
  email: string
  name: string
  role: 'PROPERTY_MANAGER' | 'USER'
  disabledAt: Date
  daysDisabled: number
  isEligible30Days: boolean
  isBlocked: boolean
  isManuallyBlocked: boolean
}

@Injectable()
export class GetEligibleDeletionUsersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(): Promise<EligibleDeletionAccount[]> {
    const now = new Date()

    // 1. Fetch Property Managers who are disabled
    const pms = await (this.prisma as any).upward_property_manager.findMany({
      where: {
        OR: [{ isBlocked: true }, { isManuallyBlocked: true }],
      },
    })

    // 2. Fetch Users who are disabled
    const users = await (this.prisma as any).upward_user.findMany({
      where: {
        OR: [{ isBlocked: true }, { isManuallyBlocked: true }],
      },
    })

    const result: EligibleDeletionAccount[] = []

    for (const pm of pms) {
      const disabledAt = pm.disabledAt ? new Date(pm.disabledAt) : new Date(pm.updatedAt)
      const diffMs = now.getTime() - disabledAt.getTime()
      const daysDisabled = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      let email = pm.email || ''
      try {
        email = this.encryption.decrypt(email)
      } catch {
        // Fallback if raw
      }

      let firstName = pm.firstName || ''
      let lastName = pm.lastName || ''
      try {
        firstName = this.encryption.decrypt(firstName)
      } catch {}
      try {
        lastName = this.encryption.decrypt(lastName)
      } catch {}

      const name = `${firstName} ${lastName}`.trim() || pm.businessName || 'Property Manager'

      result.push({
        id: pm.uuid,
        dbId: pm.id,
        email,
        name,
        role: 'PROPERTY_MANAGER',
        disabledAt,
        daysDisabled,
        isEligible30Days: daysDisabled >= 30,
        isBlocked: pm.isBlocked,
        isManuallyBlocked: pm.isManuallyBlocked,
      })
    }

    for (const user of users) {
      const disabledAt = user.disabledAt ? new Date(user.disabledAt) : new Date(user.updatedAt)
      const diffMs = now.getTime() - disabledAt.getTime()
      const daysDisabled = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      let email = user.email || ''
      try {
        email = this.encryption.decrypt(email)
      } catch {}

      let firstName = user.firstName || ''
      let lastName = user.lastName || ''
      try {
        firstName = this.encryption.decrypt(firstName)
      } catch {}
      try {
        lastName = this.encryption.decrypt(lastName)
      } catch {}

      const name = `${firstName} ${lastName}`.trim() || 'User'

      result.push({
        id: user.uuid,
        dbId: user.id,
        email,
        name,
        role: 'USER',
        disabledAt,
        daysDisabled,
        isEligible30Days: daysDisabled >= 30,
        isBlocked: user.isBlocked,
        isManuallyBlocked: user.isManuallyBlocked,
      })
    }

    // Sort descending by days disabled
    return result.sort((a, b) => b.daysDisabled - a.daysDisabled)
  }
}
