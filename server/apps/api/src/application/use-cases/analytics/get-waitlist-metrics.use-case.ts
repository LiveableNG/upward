import { Injectable } from '@nestjs/common'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetWaitlistMetricsUseCase {
  constructor(private readonly encryption: EncryptionService) {}

  execute(allUsers: any[], allWaitlistEntries: any[], userMap: Map<string, any>, allUserEmailHashes: Set<string>) {
    const waitlistConvertedList = allUsers
      .filter((u) => u.isFromWaitlist)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        const totalPaid = u.transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0)
        return {
          id: `w_c_${u.id}`,
          uuid: u.uuid,
          email: decrypted.decryptedEmail,
          firstName: decrypted.decryptedFirstName,
          lastName: decrypted.decryptedLastName,
          phone: decrypted.decryptedPhone,
          createdAt: u.createdAt,
          converted: true,
          totalPaid,
          hasPassword: true, // If they converted and are in allUsers, they have a password
          origin: 'WAITLIST',
          originType: 'WAITLIST',
        }
      })

    const waitlistUnconvertedList = allWaitlistEntries
      .filter((w) => {
        const hash = this.encryption.hash(w.email)
        return !allUserEmailHashes.has(hash)
      })
      .map((w) => ({
        id: `w_u_${w.id}`,
        uuid: w.uuid,
        email: w.email,
        firstName: w.firstName || 'N/A',
        lastName: w.lastName || 'N/A',
        phone: w.phone || 'N/A',
        createdAt: w.createdAt,
        converted: false,
        totalPaid: 0,
        hasPassword: false,
        origin: 'WAITLIST',
        originType: 'WAITLIST',
      }))

    const finalWaitlistDirectory = waitlistUnconvertedList

    const waitlistConvertedCount = waitlistConvertedList.length
    const waitlistTotalCount = finalWaitlistDirectory.length
    const waitlistTotalPaid = waitlistConvertedList.reduce((sum, u) => sum + u.totalPaid, 0)

    return {
      waitlistConvertedList,
      finalWaitlistDirectory,
      metrics: {
        total: waitlistTotalCount,
        converted: waitlistConvertedCount,
        totalPaid: waitlistTotalPaid,
      }
    }
  }
}
