import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { GetRevenueMetricsUseCase } from './get-revenue-metrics.use-case'
import { GetWaitlistMetricsUseCase } from './get-waitlist-metrics.use-case'
import { GetSignedUpMetricsUseCase } from './get-signed-up-metrics.use-case'
import { GetInvitedMetricsUseCase } from './get-invited-metrics.use-case'
import { GetPmMetricsUseCase } from './get-pm-metrics.use-case'

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
    private readonly getRevenueMetrics: GetRevenueMetricsUseCase,
    private readonly getWaitlistMetrics: GetWaitlistMetricsUseCase,
    private readonly getSignedUpMetrics: GetSignedUpMetricsUseCase,
    private readonly getInvitedMetrics: GetInvitedMetricsUseCase,
    private readonly getPmMetrics: GetPmMetricsUseCase,
  ) {}

  async execute(options: GetPerformanceMetricsOptions = {}) {
    const { startDate, endDate, search } = options

    const _results = await Promise.all([
      this.prisma.upward_user.findMany({
        where: {
          isInternal: false,
          ...(startDate || endDate
            ? {
                OR: [
                  {
                    createdAt: {
                      ...(startDate ? { gte: new Date(startDate) } : {}),
                      ...(endDate ? { lte: new Date(endDate) } : {}),
                    },
                  },
                  {
                    authSessions: {
                      some: {
                        createdAt: {
                          ...(startDate ? { gte: new Date(startDate) } : {}),
                          ...(endDate ? { lte: new Date(endDate) } : {}),
                        },
                      },
                    },
                  },
                ],
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
          authSessions: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true },
          },
          transactions: {
            select: {
              id: true,
              uuid: true,
              amount: true,
              status: true,
              reference: true,
              lineItems: true,
              createdAt: true,
            },
          },
          paymentRequests: {
            select: {
              id: true,
              uuid: true,
              amount: true,
              amountPaid: true,
              status: true,
              dueDate: true,
              createdAt: true,
              lineItemRecords: {
                select: {
                  id: true,
                  name: true,
                  totalAmount: true,
                  amountPaid: true,
                  status: true,
                },
              },
            },
          },
          properties: {
            select: {
              id: true,
              pmId: true,
              companyId: true,
              pm: { select: { id: true, createdAt: true, uuid: true, businessName: true, firstName: true, lastName: true } },
              company: { select: { id: true, createdAt: true, uuid: true, name: true } },
              location: { select: { address: true } },
              rentEndDate: true,
              pmUnit: {
                select: {
                  unitName: true,
                  rentDueDate: true,
                  rentStartDate: true,
                  property: { select: { address: true } },
                  rentPayments: {
                    where: { status: 'SUCCESS' },
                    orderBy: { periodEnd: 'desc' },
                    take: 1,
                    select: {
                      periodStart: true,
                      periodEnd: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.upward_waitlist.findMany({
        where: {
          isInternal: false,
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
          isInternal: false,
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
          units: {
            select: {
              rentDueDate: true,
              rentStartDate: true,
              rentPayments: {
                where: { status: 'SUCCESS' },
                orderBy: { periodEnd: 'desc' },
                take: 1,
                select: {
                  periodStart: true,
                  periodEnd: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.upward_property_manager.findMany({
        where: {
          isInternal: false,
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
          user: {
            isInternal: false,
          },
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
          isInternal: false,
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
            select: {
              id: true,
              rentAmount: true,
              currency: true,
              subaccountId: true,
              createdAt: true,
              externalPropertyId: true,
              externalUnitId: true,
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
      this.prisma.upward_communication_log.findMany({
        where: {
          type: 'TENANT_INVITE',
          status: 'SENT',
        },
        select: {
          recipient: true,
          channel: true,
          email: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.upward_communication_log.findMany({
        where: {
          channel: 'EMAIL',
          OR: [
            {
              type: {
                in: [
                  'BULK',
                  'TENANT_INVITE',
                  'SEQUENCE',
                  'ONBOARDING_SEQUENCE_WELCOME',
                  'EMAIL_SEQUENCE'
                ]
              }
            },
            {
              emailSequenceLogId: { not: null }
            }
          ],
          NOT: [
            { subject: { startsWith: '[CRITICAL ERROR]' } },
            { subject: { contains: 'Assisted Upload' } },
            { subject: { contains: 'document' } },
            { subject: { contains: 'vault' } },
            { subject: { contains: 'Property Unit' } },
            { subject: { contains: 'admin access' } },
            { subject: { contains: 'Admin Access' } },
            { subject: { contains: 'Rent Request' } },
            { subject: { contains: 'Login Code' } },
            { subject: { contains: 'OTP' } },
          ],
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
          subject: true,
          isOpened: true,
          emailSequenceLog: {
            select: { isOpened: true }
          }
        }
      }),
      this.prisma.upward_auth_session.count({
        where: {
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        }
      }).then(tenantCount =>
        this.prisma.upward_pm_auth_session.count({
          where: {
            ...(startDate || endDate
              ? {
                  createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                  },
                }
              : {}),
          }
        }).then(pmCount => tenantCount + pmCount)
      ),
    ])

    const allUsers = _results[0] as any[]
    const allWaitlistEntries = _results[1] as any[]
    const pmTenants = _results[2] as any[]
    const allPms = _results[3] as any[]
    const successTransactions = _results[4] as any[]
    const activeUserGroups = _results[5] as any[]
    const allCompanies = _results[6] as any[]
    const inviteLogs = _results[7] as any[]
    const emailLogsInTimeframe = _results[8] as any[]
    const activityLogsCountInTimeframe = _results[9] as number

    const isDummyEmail = (email: string) => {
      if (!email) return true
      const normalized = email.toLowerCase()
      return (
        normalized.includes('@upward.local') ||
        normalized.includes('@upward.com') ||
        normalized.startsWith('guest-') ||
        normalized.includes('dummy')
      )
    }

    const decryptedUsers = allUsers.map((u) => {
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
        decryptedEmail: email,
        decryptedFirstName: firstName,
        decryptedLastName: lastName,
        decryptedPhone: phone,
      }
    })

    const realUsersByPhone = new Map<string, any>()
    decryptedUsers.forEach((u) => {
      if (u.decryptedPhone && !isDummyEmail(u.decryptedEmail)) {
        const cleanPhone = u.decryptedPhone.replace(/\D/g, '')
        if (cleanPhone) {
          realUsersByPhone.set(cleanPhone, u)
        }
      }
    })

    const mergedUsers: any[] = []
    decryptedUsers.forEach((u) => {
      if (isDummyEmail(u.decryptedEmail) && u.decryptedPhone) {
        const cleanPhone = u.decryptedPhone.replace(/\D/g, '')
        const realUser = realUsersByPhone.get(cleanPhone)
        if (realUser && realUser.id !== u.id) {
          realUser.transactions = [...(realUser.transactions || []), ...(u.transactions || [])]
          realUser.properties = [...(realUser.properties || []), ...(u.properties || [])]
          realUser.paymentRequests = [...(realUser.paymentRequests || []), ...(u.paymentRequests || [])]
          return
        }
      }
      mergedUsers.push(u)
    })

    const waitlistEmails = new Set(allWaitlistEntries.map((w) => w.email.toLowerCase()))
    const allUserEmailHashes = new Set(mergedUsers.map((u) => u.emailHash))

    const inviteChannelMap = new Map<string, 'EMAIL' | 'SMS' | 'WHATSAPP'>()
    inviteLogs.forEach((log) => {
      if (log.recipient) {
        inviteChannelMap.set(log.recipient.toLowerCase(), log.channel as any)
      }
      if (log.email) {
        inviteChannelMap.set(log.email.toLowerCase(), log.channel as any)
      }
    })

    const userMap = new Map<string, any>()
    mergedUsers.forEach((u) => {
      userMap.set(u.emailHash, u)
    })

    const revenueMetrics = this.getRevenueMetrics.execute(successTransactions)
    const waitlistMetrics = this.getWaitlistMetrics.execute(mergedUsers, allWaitlistEntries, userMap, allUserEmailHashes)
    const signedUpMetrics = this.getSignedUpMetrics.execute(mergedUsers, userMap, pmTenants, waitlistEmails, inviteChannelMap)
    const invitedMetrics = this.getInvitedMetrics.execute(mergedUsers, pmTenants, userMap, waitlistEmails, inviteChannelMap)
    const pmMetrics = this.getPmMetrics.execute(allPms, allCompanies, successTransactions, mergedUsers)

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
        waitlist: waitlistMetrics.metrics,
        signedUp: signedUpMetrics.metrics,
        invited: invitedMetrics.metrics,
        sources: {
          pmCount: allPms.length,
          platformCount: invitedMetrics.sources.platformCount,
        },
        revenue: revenueMetrics,
        activeUsers: {
          activeCount: activeUserGroups.length,
          totalUsers: allUsers.length,
          inactiveCount: allUsers.length - activeUserGroups.length,
          activeRate: allUsers.length > 0 ? Math.round((activeUserGroups.length / allUsers.length) * 100) : 0,
          totalUsersWithPassword: signedUpMetrics.totalUsersWithPassword,
        },
        emailLogsSummary: {
          totalSent: emailLogsInTimeframe.length,
          totalOpened: emailLogsInTimeframe.filter(l => l.isOpened || l.emailSequenceLog?.isOpened).length,
          totalNotOpened: emailLogsInTimeframe.filter(l => !(l.isOpened || l.emailSequenceLog?.isOpened)).length,
          openRate: emailLogsInTimeframe.length > 0 ? Math.round((emailLogsInTimeframe.filter(l => l.isOpened || l.emailSequenceLog?.isOpened).length / emailLogsInTimeframe.length) * 100) : 0,
          bySubject: (Object.entries(
            emailLogsInTimeframe.reduce((acc, log) => {
              let sub = log.subject || 'No Subject';
              if (sub.startsWith('Invitation to join Upward')) {
                sub = 'Invitation to join Upward';
              }
              if (!acc[sub]) {
                acc[sub] = { sent: 0, opened: 0 }
              }
              acc[sub].sent += 1
              if (log.isOpened || log.emailSequenceLog?.isOpened) {
                acc[sub].opened += 1
              }
              return acc
            }, {} as Record<string, { sent: number; opened: number }>)
          ) as [string, { sent: number; opened: number }][]).map(([subject, counts]) => ({
            subject,
            sent: counts.sent,
            opened: counts.opened,
            notOpened: counts.sent - counts.opened,
            openRate: counts.sent > 0 ? Math.round((counts.opened / counts.sent) * 100) : 0
          }))
        },
        activitySessionsCount: activityLogsCountInTimeframe,
      },
      directories: {
        waitlist: filterList(waitlistMetrics.finalWaitlistDirectory),
        signedUp: filterList(signedUpMetrics.signedUpDirectory),
        invited: filterList(invitedMetrics.finalInvitedDirectory),
        pms: filterList(pmMetrics.finalPmDirectory),
      },
    }
  }
}
