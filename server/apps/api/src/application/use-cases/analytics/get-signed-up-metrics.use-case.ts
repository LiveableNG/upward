import { Injectable } from '@nestjs/common'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetSignedUpMetricsUseCase {
  constructor(private readonly encryption: EncryptionService) {}

  execute(allUsers: any[], userMap: Map<string, any>, pmTenants: any[] = []) {
    const signedUpDirectory = allUsers
      .filter((u) => !u.isFromInvite)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        let totalPaid = 0
        let benefitsPaid = 0
        u.transactions.forEach((tx: any) => {
          totalPaid += tx.amount
          if (tx.lineItems && Array.isArray(tx.lineItems)) {
            tx.lineItems.forEach((item: any) => {
              const name = item.name || item.label || ''
              if (name === 'Upward Benefits') {
                benefitsPaid += Number(item.amountPaid || item.amount || item.totalAmount || 0)
              }
            })
          }
        })
        const pmsMap = new Map<string, { uuid: string; name: string; propertyAddress?: string }>()

        // Check if they were invited by a PM (even if they self-registered first)
        const pmMatch = pmTenants.find((t) => t.emailHash === u.emailHash || (u.phoneHash && u.phoneHash === t.phoneHash))
        if (pmMatch?.pm) {
          const decryptedBusinessName = pmMatch.pm.businessName ? this.encryption.decrypt(pmMatch.pm.businessName) : ''
          const decryptedFirstName = pmMatch.pm.firstName ? this.encryption.decrypt(pmMatch.pm.firstName) : ''
          const decryptedLastName = pmMatch.pm.lastName ? this.encryption.decrypt(pmMatch.pm.lastName) : ''
          const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform'
          if (pmMatch.pm.uuid) {
            pmsMap.set(pmMatch.pm.uuid, { uuid: pmMatch.pm.uuid, name: pmName })
          }
        }

        u.properties.forEach((p: any) => {
          let pmName = 'Platform'
          let pUuid = ''
          if (p.pm) {
            pUuid = p.pm.uuid
            const decryptedBusinessName = p.pm.businessName ? this.encryption.decrypt(p.pm.businessName) : ''
            const decryptedFirstName = p.pm.firstName ? this.encryption.decrypt(p.pm.firstName) : ''
            const decryptedLastName = p.pm.lastName ? this.encryption.decrypt(p.pm.lastName) : ''
            pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform'
          } else if (p.company) {
            pUuid = p.company.uuid
            pmName = p.company.name ? this.encryption.decrypt(p.company.name) : 'Platform'
          }
          if (pUuid && !pmsMap.has(pUuid)) {
            const propertyAddress = p.pmUnit?.property?.address || p.location?.address
            pmsMap.set(pUuid, { uuid: pUuid, name: pmName, propertyAddress })
          } else if (pUuid && pmsMap.has(pUuid)) {
            const existing = pmsMap.get(pUuid)!
            if (!existing.propertyAddress) {
               existing.propertyAddress = p.pmUnit?.property?.address || p.location?.address
               pmsMap.set(pUuid, existing)
            }
          }
        })
        const pmsList = Array.from(pmsMap.values())

        return {
          id: `su_${u.id}`,
          uuid: u.uuid,
          email: decrypted.decryptedEmail,
          firstName: decrypted.decryptedFirstName,
          lastName: decrypted.decryptedLastName,
          phone: decrypted.decryptedPhone,
          createdAt: u.createdAt,
          isWaitlist: u.isFromWaitlist,
          totalPaid,
          hasPaid: totalPaid > 0,
          benefitsPaid,
          hasPaidBenefits: benefitsPaid > 0,
          pms: pmsList,
        }
      })

    const signedUpTotalCount = allUsers.length
    const allUsersPayments = allUsers.map((u) => {
      const totalPaid = u.transactions.reduce((sum: number, tx: any) => sum + tx.amount, 0)
      return { totalPaid, hasPaid: totalPaid > 0 }
    })    
    const signedUpPayingCount = allUsersPayments.filter((u) => u.hasPaid).length
    const signedUpTotalPaid = allUsersPayments.reduce((sum, u) => sum + u.totalPaid, 0)

    const totalUsersWithPassword = allUsers.filter((u) => {
      const isShadow =
        !u.passwordHash ||
        u.passwordHash === PASS_PLACEHOLDERS.INVITED ||
        u.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
        (!u.passwordHash.startsWith('$2') && u.passwordHash !== PASS_PLACEHOLDERS.SOCIAL)
      return !isShadow
    }).length

    return {
      signedUpDirectory,
      metrics: {
        total: signedUpTotalCount,
        paying: signedUpPayingCount,
        totalPaid: signedUpTotalPaid,
      },
      totalUsersWithPassword,
    }
  }
}
