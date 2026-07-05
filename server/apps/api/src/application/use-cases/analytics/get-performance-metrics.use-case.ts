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
    const _results = await Promise.all([
      this.prisma.upward_user.findMany({
        where: {
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
          id: true,
          uuid: true,
          email: true,
          emailHash: true,
          firstName: true,
          lastName: true,
          phone: true,
          passwordHash: true,
          isFromWaitlist: true,
          isFromInvite: true,
          createdAt: true,
          updatedAt: true,
          // Transactions: only amounts/lineItems for revenue calc
          transactions: {
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
            select: { amount: true, lineItems: true },
          },
          // Properties: only IDs needed for whitelist filter
          properties: {
            select: {
              id: true,
              pmId: true,
              companyId: true,
              pm: { select: { id: true, createdAt: true } },
              company: { select: { id: true, createdAt: true } },
            },
          },
        },
      }),
      this.prisma.upward_waitlist.findMany({
        where: {
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
      }),
      this.prisma.upward_pm_tenant.findMany({
        where: {
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
        include: {
          pm: true,
        },
      }),
      this.prisma.upward_property_manager.findMany({
        where: {
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
        include: {
          properties: {
            include: {
              // Only load unit IDs for counting — not full unit data
              units: { select: { id: true } },
            },
          },
          userProperties: {
            include: {
              subaccount: true,
              company: true,
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
          id: true,
          amount: true,
          landlordId: true,
          lineItems: true,
          userId: true,
        },
      }),
      this.prisma.upward_app_activity_log.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          userRole: 'TENANT',
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              }),
        },
        _count: { userId: true },
      }),
      this.prisma.upward_company.findMany({
        where: {
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
        include: {
          properties: {
            // Only load subaccount scalar for revenue; skip heavy relational data
            select: {
              id: true,
              rentAmount: true,
              currency: true,
              subaccountId: true,
              createdAt: true,
              subaccount: { select: { uuid: true } },
            },
          },
          managers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ])

    // Extract with explicit any[] typing so Prisma's narrow select return type
    // doesn't conflict with downstream field accesses (transactions, properties).
    let allUsers: any[]                    = _results[0] as any[]
    let allWaitlistEntries: any[]          = _results[1] as any[]
    let pmTenants: any[]                   = _results[2] as any[]
    let allPms: any[]                      = _results[3] as any[]
    let successTransactions: any[]         = _results[4] as any[]
    let activeUserGroups: any[]            = _results[5] as any[]
    let allCompanies: any[]                = _results[6] as any[]


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

    // Apply future-proof cutoff and whitelist filtering to clean up historic test data
    const cutoffDate = new Date('2026-07-04T00:00:00Z')

    // Real PM IDs: 10 (Biodun Odeleye) or any PM created after cutoff
    const realPmIds = new Set(
      allPms.filter((pm) => pm.id === 10 || pm.createdAt >= cutoffDate).map((pm) => pm.id)
    )

    const isRealUser = (u: any) => {
      // 1. If user signed up after cutoff date, they are real
      if (u.createdAt >= cutoffDate) return true

      const decrypted = userMap.get(u.emailHash)
      const email = decrypted ? decrypted.decryptedEmail.toLowerCase().trim() : ''

      // 2. Exclude if email matches test/demo pattern
      if (
        email.includes('demo') ||
        email.includes('support') ||
        email.includes('test') ||
        email.includes('goodtenants')
      ) {
        return false
      }

      // 3. Seun Isaac is the only historic user allowed to have historic transactions.
      // Filter out any other historic user who has transactions.
      if (u.transactions && u.transactions.length > 0 && email !== 'oluwaseunisaacs@gmail.com') {
        return false
      }

      // 4. Exclude if currently linked to any internal (historic, non-whitelisted) PM or Company
      if (u.properties && u.properties.length > 0) {
        const hasInternalLink = u.properties.some((p: any) => {
          // Linked PM is internal (historic and not PM ID 10)
          if (p.pmId && p.pmId !== 10 && (!p.pm || p.pm.createdAt < cutoffDate)) {
            return true
          }
          // Linked Company is internal (historic and not Company ID 2 or 11)
          if (p.companyId && p.companyId !== 2 && p.companyId !== 11 && (!p.company || p.company.createdAt < cutoffDate)) {
            return true
          }
          return false
        })
        if (hasInternalLink) return false
      }

      // 5. Otherwise, they are real (e.g. self-signups, waitlist signups with no properties yet)
      return true
    }

    // Perform filtering
    allUsers = allUsers.filter(isRealUser)
    const realUserIds = new Set(allUsers.map((u) => u.id))

    allPms = allPms.filter((pm) => pm.id === 10 || pm.createdAt >= cutoffDate)

    pmTenants = pmTenants.filter((t) => {
      if (t.createdAt >= cutoffDate) return true
      return t.pmId && realPmIds.has(t.pmId)
    })

    successTransactions = successTransactions.filter((tx) => {
      return realUserIds.has(tx.userId)
    })

    activeUserGroups = activeUserGroups.filter((log) => {
      return log.userId && realUserIds.has(log.userId)
    })

    allWaitlistEntries = allWaitlistEntries.filter((w) => {
      if (w.createdAt >= cutoffDate) return true
      const email = w.email.toLowerCase().trim()
      const isTest = email.includes('test') || email.includes('demo') || email.includes('techinfoorg') || email.includes('pingpong')
      return !isTest
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

    const finalWaitlistDirectory = waitlistUnconvertedList

    // --- Signed Up Users Directory (Self / Waitlist Signups - i.e., NOT Invited) ---
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
    const finalPmDirectoryRaw = allPms.map((pm) => {
      // Sum successful payments for this PM's properties/units
      const pmSubaccountUuids = pm.userProperties
        .map((up: any) => up.subaccount?.uuid)
        .filter(Boolean) as string[]

      // Calculate payments
      const pmTx = successTransactions.filter((tx) => {
        if (!tx.landlordId) return false
        return pmSubaccountUuids.includes(tx.landlordId)
      })
      const totalGenerated = pmTx.reduce((sum, tx) => sum + tx.amount, 0)

      const decryptedFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName).trim() : ''
      const decryptedLastName = pm.lastName ? this.encryption.decrypt(pm.lastName).trim() : ''
      const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName).trim() : ''

      let platformCompanyName = ''
      const firstCompany = pm.userProperties.find((up: any) => up.company)?.company
      if (firstCompany && firstCompany.name) {
        platformCompanyName = this.encryption.decrypt(firstCompany.name).trim()
      }

      const resolvedBusinessName = platformCompanyName || (decryptedBusinessName && decryptedBusinessName !== 'No Business Name'
        ? decryptedBusinessName
        : `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform PM')

      return {
        id: pm.id.toString(),
        uuid: pm.uuid,
        email: pm.email ? this.encryption.decrypt(pm.email) : '',
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        businessName: resolvedBusinessName,
        phone: pm.phone ? this.encryption.decrypt(pm.phone) : 'N/A',
        isVerified: pm.isVerified,
        propertiesCount: pm.properties.length,
        unitsCount: pm.properties.reduce((sum: number, p: any) => sum + p.units.length, 0),
        totalGenerated,
        createdAt: pm.createdAt,
        pmType: 'Upward PM',
      }
    })

    // Filter and map platform companies (e.g. Liveable, Company ID 2, or those created on/after cutoff)
    const filteredCompanies = allCompanies.filter(
      (c) => c.id === 2 || c.createdAt >= cutoffDate
    )

    const finalCompanyDirectory = filteredCompanies.map((c) => {
      const companySubaccountUuids = c.properties
        .map((p: any) => p.subaccount?.uuid)
        .filter(Boolean) as string[]

      // Find real transactions for this company (by subaccount OR user links)
      const companyTx = successTransactions.filter((tx) => {
        if (tx.landlordId && companySubaccountUuids.includes(tx.landlordId)) {
          return true
        }
        const user = allUsers.find((u) => u.id === tx.userId)
        return user && user.properties.some((p: any) => p.companyId === c.id)
      })

      const totalGenerated = companyTx.reduce((sum, tx) => sum + tx.amount, 0)

      const decryptedName = this.encryption.decrypt(c.name).trim()
      const decryptedEmail = c.email ? this.encryption.decrypt(c.email).trim() : ''
      const decryptedPhone = c.phone ? this.encryption.decrypt(c.phone).trim() : 'N/A'

      // Resolve manager details (fallback to first manager if available)
      const firstManager = c.managers && c.managers[0]
      let resolvedFirstName = ''
      let resolvedLastName = ''
      let resolvedEmail = decryptedEmail
      let resolvedPhone = decryptedPhone

      if (firstManager) {
        resolvedFirstName = firstManager.firstName ? this.encryption.decrypt(firstManager.firstName).trim() : ''
        resolvedLastName = firstManager.lastName ? this.encryption.decrypt(firstManager.lastName).trim() : ''
        
        if (!resolvedEmail) {
          resolvedEmail = firstManager.email ? this.encryption.decrypt(firstManager.email).trim() : ''
        }
        if (!resolvedPhone || resolvedPhone === 'N/A') {
          resolvedPhone = firstManager.phone ? this.encryption.decrypt(firstManager.phone).trim() : 'N/A'
        }
      }

      return {
        id: `co_${c.id}`,
        uuid: c.uuid,
        email: resolvedEmail,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        businessName: decryptedName,
        phone: resolvedPhone,
        isVerified: true,
        propertiesCount: c.properties.length,
        unitsCount: c.properties.length, // Each tenancy property represents a unit
        totalGenerated,
        createdAt: c.createdAt,
        pmType: 'Platform',
      }
    })

    const finalPmDirectory = [...finalPmDirectoryRaw, ...finalCompanyDirectory]

    // 5. CALCULATE GRAPH / SUMMARY METRICS

    // Waitlist Stats
    const waitlistConvertedCount = waitlistConvertedList.length
    const waitlistTotalCount = finalWaitlistDirectory.length
    const waitlistTotalPaid = waitlistConvertedList.reduce((sum, u) => sum + u.totalPaid, 0)

    // Signed Up Stats
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
          totalUsersWithPassword,
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
