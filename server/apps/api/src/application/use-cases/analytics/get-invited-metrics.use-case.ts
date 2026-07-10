import { Injectable } from '@nestjs/common'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'

@Injectable()
export class GetInvitedMetricsUseCase {
  constructor(private readonly encryption: EncryptionService) {}

  execute(allUsers: any[], pmTenants: any[], userMap: Map<string, any>) {
    const invitedUserDirectory = allUsers
      .filter((u) => u.isFromInvite)
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
        const isShadow =
          u.passwordHash === PASS_PLACEHOLDERS.INVITED ||
          u.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
          !u.passwordHash.startsWith('$2')

        const pmMatch = pmTenants.find((t) => t.emailHash === u.emailHash)
        
        let status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID' = 'INVITED_PENDING'
        if (isShadow) {
          status = totalPaid > 0 ? 'GUEST_PAID' : 'INVITED_PENDING'
        } else {
          status = totalPaid > 0 ? 'SIGNED_UP_PAID' : 'INVITED_SIGNED_UP'
        }

        const pmsMap = new Map<string, { uuid: string; name: string; propertyAddress?: string }>()

        if (pmMatch?.pm) {
          const decryptedBusinessName = pmMatch.pm.businessName ? this.encryption.decrypt(pmMatch.pm.businessName) : ''
          const decryptedFirstName = pmMatch.pm.firstName ? this.encryption.decrypt(pmMatch.pm.firstName) : ''
          const decryptedLastName = pmMatch.pm.lastName ? this.encryption.decrypt(pmMatch.pm.lastName) : ''
          const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform'
          if (pmMatch.pm.uuid) {
            pmsMap.set(pmMatch.pm.uuid, { uuid: pmMatch.pm.uuid, name: pmName })
          }
        }

        let rentExpiryDate: Date | null | undefined = null

        u.properties.forEach((p: any) => {
          if (p.rentEndDate && (!rentExpiryDate || p.rentEndDate > rentExpiryDate)) rentExpiryDate = p.rentEndDate
          if (p.pmUnit?.rentDueDate && (!rentExpiryDate || p.pmUnit.rentDueDate > rentExpiryDate)) rentExpiryDate = p.pmUnit.rentDueDate

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

        let originType: 'INVITED_EMAIL' | 'INVITED_PHONE' = 'INVITED_EMAIL'
        if (pmMatch) {
          originType = pmMatch.emailHash ? 'INVITED_EMAIL' : 'INVITED_PHONE'
        } else if (!u.emailHash || u.emailHash.startsWith('dummy') || u.email.includes('@upward.local')) {
          originType = 'INVITED_PHONE'
        }

        return {
          id: `inv_u_${u.id}`,
          uuid: u.uuid,
          email: decrypted.decryptedEmail,
          firstName: decrypted.decryptedFirstName,
          lastName: decrypted.decryptedLastName,
          phone: decrypted.decryptedPhone,
          createdAt: u.createdAt,
          status,
          totalPaid,
          pms: pmsList,
          benefitsPaid,
          hasPaidBenefits: benefitsPaid > 0,
          rentExpiryDate,
          originType,
        }
      })

    const invitedUserEmails = new Set(allUsers.map((u) => u.emailHash))
    const uncreatedInvitedDirectory = pmTenants
      .filter((t) => t.emailHash && !invitedUserEmails.has(t.emailHash))
      .map((t) => {
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

        let pmName = 'Platform'
        if (t.pm) {
          const decryptedBusinessName = t.pm.businessName ? this.encryption.decrypt(t.pm.businessName) : ''
          const decryptedFirstName = t.pm.firstName ? this.encryption.decrypt(t.pm.firstName) : ''
          const decryptedLastName = t.pm.lastName ? this.encryption.decrypt(t.pm.lastName) : ''
          pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform'
        }
        const pmsList = t.pm?.uuid ? [{ uuid: t.pm.uuid, name: pmName, propertyAddress: t.pmUnit?.property?.address }] : []
        const rentExpiryDate = t.units && t.units.length > 0 ? t.units[0].rentDueDate : null

        return {
          id: `inv_p_${t.id}`,
          uuid: t.uuid,
          email,
          firstName,
          lastName,
          phone,
          createdAt: t.createdAt,
          status: 'INVITED_PENDING' as const,
          totalPaid: 0,
          pms: pmsList,
          rentExpiryDate,
          originType: t.emailHash ? 'INVITED_EMAIL' as const : 'INVITED_PHONE' as const,
        }
      })

    const finalInvitedDirectory = [...invitedUserDirectory, ...uncreatedInvitedDirectory]

    const invitedPendingCount = finalInvitedDirectory.filter((u) => u.status === 'INVITED_PENDING').length
    const invitedOnboardedCount = finalInvitedDirectory.filter((u) => u.status === 'INVITED_SIGNED_UP' || u.status === 'SIGNED_UP_PAID').length
    const guestPaidCount = finalInvitedDirectory.filter((u) => u.status === 'GUEST_PAID').length
    const invitedOnboardedPaidCount = finalInvitedDirectory.filter((u) => u.status === 'SIGNED_UP_PAID').length
    const guestTotalPaid = finalInvitedDirectory.filter((u) => u.status === 'GUEST_PAID').reduce((sum, u) => sum + u.totalPaid, 0)
    const invitedOnboardedTotalPaid = finalInvitedDirectory.filter((u) => u.status === 'SIGNED_UP_PAID').reduce((sum, u) => sum + u.totalPaid, 0)

    const platformSourceCount = allUsers.length - pmTenants.filter(t => t.emailHash && invitedUserEmails.has(t.emailHash)).length

    return {
      finalInvitedDirectory,
      metrics: {
        pending: invitedPendingCount,
        onboarded: invitedOnboardedCount,
        guestPaid: guestPaidCount,
        onboardedPaid: invitedOnboardedPaidCount,
        guestTotalPaid,
        onboardedTotalPaid: invitedOnboardedTotalPaid,
        total: finalInvitedDirectory.length,
      },
      sources: {
        platformCount: platformSourceCount,
      }
    }
  }
}
