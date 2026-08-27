import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { CalculateRentScoreUseCase } from '../user/calculate-rent-score.use-case'

@Injectable()
export class GetAdminUserDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly calculateRentScore: CalculateRentScoreUseCase,
  ) {}

  private decryptUser(u: any) {
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

    return {
      ...u,
      email,
      firstName,
      lastName,
      phone,
    }
  }

  async execute(uuid: string) {
    // 1. Try finding upward_user first
    const u = await this.prisma.upward_user.findUnique({
      where: { uuid },
      include: {
        properties: {
          include: {
            company: true,
            pm: true,
            pmUnit: {
              include: {
                property: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (u) {
      const decryptedUser = this.decryptUser(u)

        // Calculate Upward Rent Score
      let rentScore = 500
      let scoreBand = 'Fair'
      let scoreMetrics: any = null
      let scoreCycles: any[] = []
      try {
        const scoreRes: any = await this.calculateRentScore.execute(u.uuid)
        if (scoreRes && scoreRes.success && scoreRes.data) {
          rentScore = scoreRes.data.score || 500
          scoreBand = scoreRes.data.band || 'Fair'
          scoreMetrics = scoreRes.data.metrics || null
          scoreCycles = scoreRes.data.cycles || []
        }
      } catch (err) {
        rentScore = 500
      }

      let bandColor = '#4f46e5'
      if (rentScore >= 750) {
        bandColor = '#16a34a'
      } else if (rentScore >= 650) {
        bandColor = '#0284c7'
      } else if (rentScore >= 550) {
        bandColor = '#4f46e5'
      } else {
        bandColor = '#dc2626'
      }

      const upwardScore = {
        score: rentScore,
        maxScore: 900,
        band: scoreBand,
        color: bandColor,
        metrics: scoreMetrics,
        cycles: scoreCycles,
      }

      // Fetch user credibility / rent history requests
      const rawCredibilityReqs = await this.prisma.upward_credibility_request.findMany({
        where: { userId: u.id },
        orderBy: { createdAt: 'desc' },
      })

      const credibilityRequests = await Promise.all(
        rawCredibilityReqs.map(async (req) => {
          const prop = u.properties.find((p: any) => p.uuid === req.propertyUuid)
          const propAddress =
            (prop as any)?.pmUnit?.property?.address ||
            (prop as any)?.location?.address ||
            (prop as any)?.location?.area ||
            'Property'

          const pastCycles = await this.prisma.upward_rent_cycle.findMany({
            where: {
              userId: u.id,
              userPropertyId: prop?.id,
            },
            orderBy: { dueDate: 'asc' },
          })

          let yearsOfHistory = 0
          const firstCycle = pastCycles[0]
          const lastCycle = pastCycles[pastCycles.length - 1]
          if (firstCycle && lastCycle) {
            const firstDate = new Date(firstCycle.dueDate).getTime()
            const lastDate = new Date(lastCycle.dueDate).getTime()
            const diffMs = Math.max(0, lastDate - firstDate)
            yearsOfHistory = parseFloat((diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1))
          }

          let companyName = null
          let managerName = null
          let pmEmail = null
          let pmPhone = null

          try {
            companyName = req.companyName ? this.encryption.decrypt(req.companyName) : null
            managerName = req.managerName ? this.encryption.decrypt(req.managerName) : null
            pmEmail = req.email ? this.encryption.decrypt(req.email) : null
            pmPhone = req.phone ? this.encryption.decrypt(req.phone) : null
          } catch (e) {
            companyName = req.companyName
            managerName = req.managerName
            pmEmail = req.email
            pmPhone = req.phone
          }

          return {
            id: req.id,
            uuid: req.uuid,
            propertyUuid: req.propertyUuid,
            propertyAddress: propAddress,
            pmDetails: {
              companyName,
              managerName,
              email: pmEmail,
              phone: pmPhone,
            },
            status: req.status,
            sentToPmAt: req.createdAt,
            fulfilledAt: req.status === 'COMPLETED' ? req.updatedAt : null,
            yearsOfHistory,
            submittedRecordsCount: pastCycles.length,
            submittedRecords: pastCycles.map((c) => ({
              id: c.id,
              uuid: c.uuid,
              amountOwed: c.amountOwed,
              amountPaid: c.amountPaid,
              dueDate: c.dueDate,
              paidAt: c.paidAt,
              status: c.status,
              source: c.source,
            })),
          }
        })
      )

      // Fetch user's activity logs
      const activityLogs = await this.prisma.upward_app_activity_log.findMany({
        where: {
          OR: [
            { userId: u.id },
            { userEmail: decryptedUser.email },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      // Fetch user property locations
      const propertyIds = decryptedUser.properties.map((p: any) => p.locationId)
      const locations = propertyIds.length > 0
        ? await this.prisma.upward_location.findMany({ where: { id: { in: propertyIds } } })
        : []

      const resolvedProperties = decryptedUser.properties.map((p: any) => {
        const loc = locations.find((l: any) => l.id === p.locationId)
        const company = p.company
          ? {
              ...p.company,
              name: p.company.name ? this.encryption.decrypt(p.company.name) : '',
              email: p.company.email ? this.encryption.decrypt(p.company.email) : null,
              phone: p.company.phone ? this.encryption.decrypt(p.company.phone) : null,
            }
          : null
        const pm = p.pm
          ? {
              id: p.pm.id,
              uuid: p.pm.uuid,
              businessName: p.pm.businessName ? this.encryption.decrypt(p.pm.businessName) : '',
              email: p.pm.email ? this.encryption.decrypt(p.pm.email) : '',
            }
          : null
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          city: loc?.area || p.city,
          state: loc?.state || p.state,
          rentAmount: p.rentAmount,
          company,
          pm,
          pmUnit: p.pmUnit,
        }
      })

      return {
        type: 'TENANT',
        id: u.id,
        uuid: u.uuid,
        email: decryptedUser.email,
        firstName: decryptedUser.firstName,
        lastName: decryptedUser.lastName,
        phone: decryptedUser.phone,
        upwardScore,
        credibilityRequests,
        savingsWalletEnabled: u.savingsWalletEnabled,
        isFromInvite: u.isFromInvite,
        isFromWaitlist: u.isFromWaitlist,
        invitedAt: u.isFromInvite ? ((u as any).invitedAt || u.createdAt) : null,
        joinedAt: (u as any).joinedAt || (u.isFromInvite ? null : u.createdAt),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        properties: resolvedProperties,
        transactions: decryptedUser.transactions,
        supportTickets: decryptedUser.supportTickets,
        activityLogs,
      }
    }

    // 2. If not found, try finding upward_pm_tenant (invited pending)
    const t = await this.prisma.upward_pm_tenant.findUnique({
      where: { uuid },
      include: {
        pm: true,
        units: {
          include: {
            property: true,
          },
        },
      },
    })

    if (!t) {
      throw new NotFoundException('User or Tenant details not found')
    }

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

    // Fetch activity logs using email
    const activityLogs = email
      ? await this.prisma.upward_app_activity_log.findMany({
          where: { userEmail: email },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : []

    return {
      type: 'PENDING_TENANT',
      id: `pm_t_${t.id}`,
      uuid: t.uuid,
      email,
      firstName,
      lastName,
      phone,
      isFromInvite: true,
      isFromWaitlist: false,
      invitedAt: t.inviteSentAt || t.createdAt,
      joinedAt: null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      inviteStatus: t.inviteStatus,
      inviteSentAt: t.inviteSentAt,
      pm: t.pm
        ? {
            id: t.pm.id,
            businessName: t.pm.businessName ? this.encryption.decrypt(t.pm.businessName) : '',
            email: t.pm.email ? this.encryption.decrypt(t.pm.email) : '',
          }
        : null,
      units: t.units,
      properties: t.units.map((u: any) => u.property),
      transactions: [],
      supportTickets: [],
      activityLogs,
    }
  }
}
