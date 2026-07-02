import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'

export interface GetPerformanceMetricsOptions {
  startDate?: string
  endDate?: string
  search?: string
}

@Injectable()
export class GetPerformanceMetricsUseCase {
  private readonly logger = new Logger(GetPerformanceMetricsUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(options: GetPerformanceMetricsOptions = {}) {
    const { startDate, endDate, search } = options

    // 1. Build Date Filters
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    }

    // 2. Query Base Datasets
    const [allUsers, allWaitlistEntries, pmTenants, allPms, successTransactions, activeUserGroups] = await Promise.all([
      this.prisma.upward_user.findMany({
        include: {
          transactions: {
            where: { status: 'SUCCESS' },
            select: { amount: true, lineItems: true },
          },
        },
      }),
      this.prisma.upward_waitlist.findMany(),
      this.prisma.upward_pm_tenant.findMany({
        include: {
          pm: true,
        },
      }),
      this.prisma.upward_property_manager.findMany({
        include: {
          properties: {
            include: {
              units: true,
            },
          },
          userProperties: {
            include: {
              subaccount: true,
            },
          },
        },
      }),
      this.prisma.upward_transaction.findMany({
        where: {
          status: 'SUCCESS',
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
        select: {
          amount: true,
          landlordId: true,
          lineItems: true,
        },
      }),
      this.prisma.upward_app_activity_log.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          userRole: 'TENANT',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    // Pre-calculate user emails hash map for fast O(1) matching
    const userMap = new Map<string, any>()
    allUsers.forEach((u) => {
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

      userMap.set(u.emailHash, {
        ...u,
        decryptedEmail: email,
        decryptedFirstName: firstName,
        decryptedLastName: lastName,
        decryptedPhone: phone,
      })
    })

    // 3. CALCULATE REVENUE STATS (Upward Fees & Benefits Fees)
    let totalUpwardFees = 0
    let totalBenefitsFees = 0
    let totalRentProcessed = 0

    successTransactions.forEach((tx) => {
      let txFee = 0
      let benFee = 0

      if (tx.lineItems && Array.isArray(tx.lineItems)) {
        tx.lineItems.forEach((item: any) => {
          const name = item.name || item.label || ''
          const amt = Number(item.amountPaid || item.amount || item.totalAmount || 0)
          if (name === 'Processing Fee' || name === 'Transaction Fee') {
            txFee += amt
          } else if (name === 'Upward Benefits') {
            benFee += amt
          }
        })
      }

      totalUpwardFees += txFee
      totalBenefitsFees += benFee
      totalRentProcessed += tx.amount - txFee - benFee
    })

    // 4. MAP AND CLASSIFY USER ECOSYSTEM

    // --- Waitlist Directory ---
    const userWaitlistEmails = new Set(allUsers.filter((u) => u.isFromWaitlist).map((u) => u.emailHash))
    
    // Converted Waitlist Users
    const waitlistConvertedList = allUsers
      .filter((u) => u.isFromWaitlist)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        const totalPaid = u.transactions.reduce((sum, tx) => sum + tx.amount, 0)
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
        }
      })

    // Unconverted Waitlist Entries
    const waitlistUnconvertedList = allWaitlistEntries
      .filter((w) => {
        const hash = this.encryption.hash(w.email)
        return !userWaitlistEmails.has(hash)
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
      }))

    const finalWaitlistDirectory = [...waitlistConvertedList, ...waitlistUnconvertedList]

    // --- Signed Up Users Directory (Self / Waitlist Signups - i.e., NOT Invited) ---
    const signedUpDirectory = allUsers
      .filter((u) => !u.isFromInvite)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        let totalPaid = 0
        let benefitsPaid = 0
        u.transactions.forEach((tx) => {
          totalPaid += tx.amount
          if (tx.lineItems && Array.isArray(tx.lineItems)) {
            tx.lineItems.forEach((item: any) => {
              const name = item.name || item.label || ''
              if (name === 'Upward Benefits') {
                benefitsPaid += Number(item.amountPaid || item.amount || 0)
              }
            })
          }
        })
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
        }
      })

    // --- Invited Tenants Directory (including Guest payments) ---
    // User accounts that are from invite
    const invitedUserDirectory = allUsers
      .filter((u) => u.isFromInvite)
      .map((u) => {
        const decrypted = userMap.get(u.emailHash)
        let totalPaid = 0
        let benefitsPaid = 0
        u.transactions.forEach((tx) => {
          totalPaid += tx.amount
          if (tx.lineItems && Array.isArray(tx.lineItems)) {
            tx.lineItems.forEach((item: any) => {
              const name = item.name || item.label || ''
              if (name === 'Upward Benefits') {
                benefitsPaid += Number(item.amountPaid || item.amount || 0)
              }
            })
          }
        })
        const isShadow =
          u.passwordHash === PASS_PLACEHOLDERS.INVITED ||
          u.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
          !u.passwordHash.startsWith('$2')

        // Resolve PM origin
        const pmMatch = pmTenants.find((t) => t.emailHash === u.emailHash)
        let pmName = 'Platform'
        if (pmMatch?.pm) {
          const decryptedBusinessName = pmMatch.pm.businessName ? this.encryption.decrypt(pmMatch.pm.businessName) : ''
          const decryptedFirstName = pmMatch.pm.firstName ? this.encryption.decrypt(pmMatch.pm.firstName) : ''
          const decryptedLastName = pmMatch.pm.lastName ? this.encryption.decrypt(pmMatch.pm.lastName) : ''
          pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform'
        }

        let status: 'INVITED_PENDING' | 'INVITED_SIGNED_UP' | 'GUEST_PAID' | 'SIGNED_UP_PAID' = 'INVITED_PENDING'
        if (isShadow) {
          status = totalPaid > 0 ? 'GUEST_PAID' : 'INVITED_PENDING'
        } else {
          status = totalPaid > 0 ? 'SIGNED_UP_PAID' : 'INVITED_SIGNED_UP'
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
          pmName,
          pmUuid: pmMatch?.pm?.uuid || null,
          benefitsPaid,
          hasPaidBenefits: benefitsPaid > 0,
        }
      })

    // PM tenants who haven't signed up at all
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
          pmName,
          pmUuid: t.pm?.uuid || null,
        }
      })

    const finalInvitedDirectory = [...invitedUserDirectory, ...uncreatedInvitedDirectory]

    // --- Property Managers & Platforms Directory ---
    const finalPmDirectory = allPms.map((pm) => {
      // Sum successful payments for this PM's properties/units
      const pmSubaccountUuids = pm.userProperties
        .map((up) => up.subaccount?.uuid)
        .filter(Boolean) as string[]

      // Calculate payments
      const pmTx = successTransactions.filter((tx) => {
        if (!tx.landlordId) return false
        return pmSubaccountUuids.includes(tx.landlordId)
      })
      const totalGenerated = pmTx.reduce((sum, tx) => sum + tx.amount, 0)

      return {
        id: pm.id.toString(),
        uuid: pm.uuid,
        email: pm.email ? this.encryption.decrypt(pm.email) : '',
        firstName: pm.firstName ? this.encryption.decrypt(pm.firstName) : '',
        lastName: pm.lastName ? this.encryption.decrypt(pm.lastName) : '',
        businessName: pm.businessName ? this.encryption.decrypt(pm.businessName) : 'No Business Name',
        phone: pm.phone ? this.encryption.decrypt(pm.phone) : 'N/A',
        isVerified: pm.isVerified,
        propertiesCount: pm.properties.length,
        unitsCount: pm.properties.reduce((sum, p) => sum + p.units.length, 0),
        totalGenerated,
        createdAt: pm.createdAt,
      }
    })

    // 5. CALCULATE GRAPH / SUMMARY METRICS

    // Waitlist Stats
    const waitlistConvertedCount = waitlistConvertedList.length
    const waitlistTotalCount = finalWaitlistDirectory.length
    const waitlistTotalPaid = waitlistConvertedList.reduce((sum, u) => sum + u.totalPaid, 0)

    // Signed Up Stats
    const signedUpTotalCount = allUsers.length
    const allUsersPayments = allUsers.map((u) => {
      const totalPaid = u.transactions.reduce((sum, tx) => sum + tx.amount, 0)
      return { totalPaid, hasPaid: totalPaid > 0 }
    })
    const signedUpPayingCount = allUsersPayments.filter((u) => u.hasPaid).length
    const signedUpTotalPaid = allUsersPayments.reduce((sum, u) => sum + u.totalPaid, 0)

    // Invited Stats
    const invitedPendingCount = finalInvitedDirectory.filter((u) => u.status === 'INVITED_PENDING').length
    const invitedOnboardedCount = finalInvitedDirectory.filter((u) => u.status === 'INVITED_SIGNED_UP' || u.status === 'SIGNED_UP_PAID').length
    const guestPaidCount = finalInvitedDirectory.filter((u) => u.status === 'GUEST_PAID').length
    const invitedOnboardedPaidCount = finalInvitedDirectory.filter((u) => u.status === 'SIGNED_UP_PAID').length
    const guestTotalPaid = finalInvitedDirectory.filter((u) => u.status === 'GUEST_PAID').reduce((sum, u) => sum + u.totalPaid, 0)
    const invitedOnboardedTotalPaid = finalInvitedDirectory.filter((u) => u.status === 'SIGNED_UP_PAID').reduce((sum, u) => sum + u.totalPaid, 0)

    // Platform vs PM distribution
    const pmSourceCount = pmTenants.length
    const platformSourceCount = allUsers.length - pmTenants.filter(t => t.emailHash && invitedUserEmails.has(t.emailHash)).length

    // Apply Search Filter (if search query exists)
    const filterList = (list: any[]) => {
      if (!search) return list
      const s = search.toLowerCase()
      return list.filter(
        (item) =>
          (item.email && item.email.toLowerCase().includes(s)) ||
          (item.firstName && item.firstName.toLowerCase().includes(s)) ||
          (item.lastName && item.lastName.toLowerCase().includes(s)) ||
          (item.phone && item.phone.includes(s)) ||
          (item.businessName && item.businessName.toLowerCase().includes(s)) ||
          (item.pmName && item.pmName.toLowerCase().includes(s)),
      )
    }

    return {
      metrics: {
        waitlist: {
          total: waitlistTotalCount,
          converted: waitlistConvertedCount,
          totalPaid: waitlistTotalPaid,
        },
        signedUp: {
          total: signedUpTotalCount,
          paying: signedUpPayingCount,
          totalPaid: signedUpTotalPaid,
        },
        invited: {
          pending: invitedPendingCount,
          onboarded: invitedOnboardedCount,
          guestPaid: guestPaidCount,
          onboardedPaid: invitedOnboardedPaidCount,
          guestTotalPaid,
          onboardedTotalPaid: invitedOnboardedTotalPaid,
          total: finalInvitedDirectory.length,
        },
        sources: {
          pmCount: allPms.length,
          platformCount: platformSourceCount,
        },
        revenue: {
          totalUpwardFees,
          totalBenefitsFees,
          totalRentProcessed,
        },
        activeUsers: {
          activeCount: activeUserGroups.length,
          totalUsers: allUsers.length,
          inactiveCount: allUsers.length - activeUserGroups.length,
          activeRate: allUsers.length > 0 ? Math.round((activeUserGroups.length / allUsers.length) * 100) : 0,
        },
      },
      directories: {
        waitlist: filterList(finalWaitlistDirectory),
        signedUp: filterList(signedUpDirectory),
        invited: filterList(finalInvitedDirectory),
        pms: filterList(finalPmDirectory),
      },
    }
  }
}
