import { Injectable } from '@nestjs/common'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetSignedUpMetricsUseCase {
  constructor(private readonly encryption: EncryptionService) { }

  execute(
    allUsers: any[],
    userMap: Map<string, any>,
    pmTenants: any[] = [],
    waitlistEmails: Set<string> = new Set(),
    inviteChannelMap: Map<string, string> = new Map(),
  ) {
    const signedUpDirectory = allUsers
      .filter((u) => !u.isFromInvite)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        const decryptedEmail = decrypted?.decryptedEmail || ''
        const decryptedPhone = decrypted?.decryptedPhone || ''

        let totalPaid = 0
        let benefitsPaid = 0
        let feePaid = 0
        let lastPaidAt: Date | null = null
        u.transactions.forEach((tx: any) => {
          if (tx.status === 'SUCCESS') {
            totalPaid += tx.amount
            if (tx.fee || tx.platformFee) {
              feePaid += Number(tx.fee || tx.platformFee || 0)
            }
            if (tx.lineItems && Array.isArray(tx.lineItems)) {
              tx.lineItems.forEach((item: any) => {
                const name = item.name || item.label || ''
                const lower = name.toLowerCase().trim()
                if (lower.includes('benefit')) {
                  benefitsPaid += Number(item.amountPaid || item.amount || item.totalAmount || 0)
                } else if (
                  !lower.includes('service charge') &&
                  !lower.includes('maintenance') &&
                  !lower.includes('management') &&
                  !lower.includes('security') &&
                  !lower.includes('caution') &&
                  !lower.includes('legal') &&
                  !lower.includes('agency') &&
                  (
                    lower === 'processing fee' ||
                    lower === 'transaction fee' ||
                    lower.includes('upward') ||
                    lower.includes('processing fee') ||
                    lower.includes('transaction fee') ||
                    lower.includes('paystack') ||
                    lower.includes('gateway fee')
                  )
                ) {
                  if (!tx.fee && !tx.platformFee) {
                    feePaid += Number(item.amountPaid || item.amount || item.totalAmount || 0)
                  }
                }
              })
            }
            if (tx.createdAt) {
              const txDate = new Date(tx.createdAt)
              if (!lastPaidAt || txDate > lastPaidAt) {
                lastPaidAt = txDate
              }
            }
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

        let rentExpiryDate: Date | null | undefined = null
        let rentStartDate: Date | null | undefined = null

        const propertySummaries: any[] = []

        u.properties.forEach((p: any) => {
          let propStartDate = p.rentStartDate || p.pmUnit?.rentStartDate || null
          let propEndDate = p.rentEndDate
          const latestPayment = p.pmUnit?.rentPayments?.[0]
          if (latestPayment?.periodEnd) {
            propEndDate = latestPayment.periodEnd
          }
          if (!propEndDate && p.pmUnit?.rentDueDate) {
            propEndDate = p.pmUnit.rentDueDate
          }

          if (propStartDate && (!rentStartDate || new Date(propStartDate) < new Date(rentStartDate))) {
            rentStartDate = propStartDate
          }
          if (propEndDate && (!rentExpiryDate || new Date(propEndDate) > new Date(rentExpiryDate))) {
            rentExpiryDate = propEndDate
          }

          const propertyAddress = p.pmUnit?.property?.address || p.location?.address || 'Property'
          propertySummaries.push({
            id: p.id,
            address: propertyAddress,
            unitName: p.pmUnit?.unitName || '',
            rentStartDate: propStartDate ? new Date(propStartDate).toISOString() : null,
            rentEndDate: propEndDate ? new Date(propEndDate).toISOString() : null,
            rentAmount: p.rentAmount || null,
            currency: p.currency || 'NGN',
            isVerified: p.isVerified ?? false,
          })

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
            pmsMap.set(pUuid, { uuid: pUuid, name: pmName, propertyAddress })
          } else if (pUuid && pmsMap.has(pUuid)) {
            const existing = pmsMap.get(pUuid)!
            if (!existing.propertyAddress) {
              existing.propertyAddress = propertyAddress
              pmsMap.set(pUuid, existing)
            }
          }
        })

        if (!rentExpiryDate && pmMatch?.units && pmMatch.units.length > 0) {
          const unit = pmMatch.units[0]
          const latestPayment = unit.rentPayments?.[0]
          rentExpiryDate = latestPayment?.periodEnd ? latestPayment.periodEnd : unit.rentDueDate
          if (!rentStartDate && unit.rentStartDate) {
            rentStartDate = unit.rentStartDate
          }
        }

        if (propertySummaries.length === 0 && pmMatch?.units && pmMatch.units.length > 0) {
          pmMatch.units.forEach((unit: any) => {
            const latestPayment = unit.rentPayments?.[0]
            const endDate = latestPayment?.periodEnd || unit.rentDueDate || null
            const startDate = unit.rentStartDate || null
            propertySummaries.push({
              id: `unit_${unit.id || Math.random()}`,
              address: pmMatch.pmUnit?.property?.address || pmMatch.pm?.businessName || 'PM Unit',
              unitName: unit.unitName || '',
              rentStartDate: startDate ? new Date(startDate).toISOString() : null,
              rentEndDate: endDate ? new Date(endDate).toISOString() : null,
              rentAmount: unit.rentAmount || null,
              currency: unit.currency || 'NGN',
              isVerified: true,
            })
          })
        }

        const pmsList = Array.from(pmsMap.values())

        const isWaitlist = u.isFromWaitlist || waitlistEmails.has(decryptedEmail.toLowerCase())
        const origin: 'WAITLIST' | 'SELF_REGISTERED' | 'INVITED_EMAIL' | 'INVITED_PHONE' = isWaitlist ? 'WAITLIST' : 'SELF_REGISTERED'

        const isShadow =
          !u.passwordHash ||
          u.passwordHash === PASS_PLACEHOLDERS.INVITED ||
          u.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
          u.passwordHash === 'INVITED_NO_PASSWORD' ||
          u.passwordHash === 'SHADOW_GUEST' ||
          (!u.passwordHash.startsWith('$2') && u.passwordHash !== PASS_PLACEHOLDERS.SOCIAL && u.passwordHash !== 'SOCIAL_AUTH')
        const hasPassword = !isShadow

        const hasUserProperty = propertySummaries.length > 0

        return {
          id: `su_${u.id}`,
          uuid: u.uuid,
          email: decrypted.decryptedEmail,
          firstName: decrypted.decryptedFirstName,
          lastName: decrypted.decryptedLastName,
          phone: decrypted.decryptedPhone,
          createdAt: u.createdAt,
          invitedAt: null,
          joinedAt: u.joinedAt || u.createdAt,
          isWaitlist,
          totalPaid,
          hasPaid: totalPaid > 0,
          benefitsPaid,
          hasPaidBenefits: benefitsPaid > 0,
          feePaid,
          platformRevenue: feePaid + benefitsPaid,
          hasPlatformRevenue: feePaid + benefitsPaid > 0,
          pms: pmsList,
          hasUserProperty,
          propertiesCount: propertySummaries.length,
          properties: propertySummaries,
          rentStartDate: rentStartDate ? (rentStartDate as Date).toISOString() : null,
          rentEndDate: rentExpiryDate ? (rentExpiryDate as Date).toISOString() : null,
          rentExpiryDate: rentExpiryDate ? (rentExpiryDate as Date).toISOString() : null,
          originType: origin,
          origin,
          hasPassword,
          hearAboutUs: u.hearAboutUs || null,
          lastPaidAt: lastPaidAt ? (lastPaidAt as Date).toISOString() : null,
          transactions: u.transactions || [],
          paymentRequests: u.paymentRequests || [],
        }
      })

    const hearAboutUsStats: Record<string, number> = {}
    signedUpDirectory.forEach((u) => {
      if (u.hearAboutUs) {
        const val = u.hearAboutUs.trim()
        hearAboutUsStats[val] = (hearAboutUsStats[val] || 0) + 1
      }
    })

    const signedUpTotalCount = allUsers.length
    const allUsersPayments = allUsers.map((u) => {
      const totalPaid = u.transactions.reduce((sum: number, tx: any) => sum + (tx.status === 'SUCCESS' ? tx.amount : 0), 0)
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
        hearAboutUsStats,
      },
      totalUsersWithPassword,
    }
  }
}
