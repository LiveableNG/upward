import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetAppActivityLogsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: {
    page?: string
    limit?: string
    appFilter?: string
    actionFilter?: string
    search?: string
    platformFilter?: string
    date?: string
  }) {
    const pageNum = query.page ? parseInt(query.page) : 1
    const limitNum = query.limit ? parseInt(query.limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    const andConditions: any[] = []

    // Filter out logins, logouts, and updates. Only query signups and creation events.
    andConditions.push({
      OR: [
        { action: 'SIGNUP' },
        {
          AND: [
            { action: 'CREATE' },
            { entityType: { in: ['UNIT', 'INVITE', 'PAYMENT', 'RENT', 'CREDIBILITY_REQUEST'] } },
          ],
        },
      ],
    })

    // Filter out anonymous guest / system logs where no real user identity can be tracked
    // EXCEPT for SIGNUP actions which are verified registration events containing email in metadata
    andConditions.push({
      OR: [
        { action: 'SIGNUP' },
        { userId: { not: null } },
        { pmId: { not: null } },
        {
          AND: [
            { userEmail: { not: null } },
            { userEmail: { not: '' } },
            { userEmail: { not: 'system' } },
            { userEmail: { not: 'System' } }
          ]
        }
      ]
    })

    if (query.appFilter && query.appFilter !== 'ALL') {
      andConditions.push({ app: query.appFilter })
    }

    if (query.actionFilter && query.actionFilter !== 'ALL') {
      andConditions.push({ action: query.actionFilter })
    }

    if (query.search) {
      andConditions.push({
        OR: [
          { userEmail: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { entityType: { contains: query.search, mode: 'insensitive' } },
        ],
      })
    }

    if (query.platformFilter && query.platformFilter !== 'ALL') {
      if (query.platformFilter === 'mobile') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
            { action: 'APP_INSTALL' },
          ],
        })
      } else if (query.platformFilter === 'web') {
        andConditions.push({
          NOT: {
            OR: [
              { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
              { action: 'APP_INSTALL' },
            ],
          },
        })
      }
    }

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`)
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`)
      andConditions.push({
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const [logs, total] = await Promise.all([
      this.prisma.upward_app_activity_log.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_app_activity_log.count({ where }),
    ])

    // Enrich logs with user and pm details
    const userIds = logs.map((l) => l.userId).filter(Boolean) as number[]
    const pmIds = logs.map((l) => l.pmId).filter(Boolean) as number[]
    const emails = logs.map((l) => l.userEmail).filter(Boolean) as string[]

    // Extract emails from SIGNUP logs metadata if userEmail is null
    logs.forEach((log) => {
      if (log.action === 'SIGNUP' && !log.userEmail && log.metadata) {
        try {
          const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          const email = meta?.body?.email;
          if (email && typeof email === 'string') {
            emails.push(email);
            // Dynamically set userEmail so mapping looks it up correctly
            log.userEmail = email;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    const tenantUuids = logs
      .filter((l) => l.entityType === 'TENANT' && l.entityId)
      .map((l) => l.entityId) as string[]
    
    // Hash emails for database query lookups
    const uniqueEmails = Array.from(new Set(emails))
    const emailHashes = uniqueEmails.map((email) => this.encryption.hash(email))

    const [usersById, usersByHash, usersByUuid, pmsById, pmsByHash] = await Promise.all([
      userIds.length > 0
        ? this.prisma.upward_user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              isFromWaitlist: true,
              isFromInvite: true,
            },
          })
        : [],
      emailHashes.length > 0
        ? this.prisma.upward_user.findMany({
            where: { emailHash: { in: emailHashes } },
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              isFromWaitlist: true,
              isFromInvite: true,
            },
          })
        : [],
      tenantUuids.length > 0
        ? this.prisma.upward_user.findMany({
            where: { uuid: { in: tenantUuids } },
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              isFromWaitlist: true,
              isFromInvite: true,
            },
          })
        : [],
      pmIds.length > 0
        ? this.prisma.upward_property_manager.findMany({
            where: { id: { in: pmIds } },
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              businessName: true,
              phone: true,
              cacNumber: true,
              pmType: true,
              country: true,
              isVerified: true,
              createdAt: true,
            },
          })
        : [],
      emailHashes.length > 0
        ? this.prisma.upward_property_manager.findMany({
            where: { emailHash: { in: emailHashes } },
            select: {
              id: true,
              uuid: true,
              email: true,
              firstName: true,
              lastName: true,
              businessName: true,
              phone: true,
              cacNumber: true,
              pmType: true,
              country: true,
              isVerified: true,
              createdAt: true,
            },
          })
        : [],
    ])

    // Map by ID, Email Hash, and UUID
    const userMap = new Map<number, any>()
    const userMapByEmail = new Map<string, any>()
    const userMapByUuid = new Map<string, any>()
    
    const allUsers = [...usersById, ...usersByHash, ...usersByUuid]
    allUsers.forEach((u) => {
      let email = ''
      let firstName = ''
      let lastName = ''
      try {
        email = u.email ? this.encryption.decrypt(u.email) : ''
        firstName = u.firstName ? this.encryption.decrypt(u.firstName) : ''
        lastName = u.lastName ? this.encryption.decrypt(u.lastName) : ''
      } catch (err) {
        email = u.email || ''
        firstName = u.firstName || ''
        lastName = u.lastName || ''
      }
      const userObj = {
        id: u.id,
        uuid: u.uuid,
        email,
        firstName,
        lastName,
        isFromWaitlist: u.isFromWaitlist,
        isFromInvite: u.isFromInvite,
      }
      userMap.set(u.id, userObj)
      userMapByUuid.set(u.uuid, userObj)
      if (email) {
        userMapByEmail.set(email.toLowerCase(), userObj)
      }
    })

    const pmMap = new Map<number, any>()
    const pmMapByEmail = new Map<string, any>()
    
    const allPms = [...pmsById, ...pmsByHash]
    allPms.forEach((p) => {
      let email = ''
      let businessName = ''
      let firstName = ''
      let lastName = ''
      let phone = ''
      try {
        email = p.email ? this.encryption.decrypt(p.email) : ''
        businessName = p.businessName ? this.encryption.decrypt(p.businessName) : ''
        firstName = p.firstName ? this.encryption.decrypt(p.firstName) : ''
        lastName = p.lastName ? this.encryption.decrypt(p.lastName) : ''
        phone = p.phone ? this.encryption.decrypt(p.phone) : ''
      } catch (err) {
        email = p.email || ''
        businessName = p.businessName || ''
        firstName = p.firstName || ''
        lastName = p.lastName || ''
        phone = p.phone || ''
      }
      const pmObj = {
        id: p.id,
        uuid: p.uuid,
        email,
        businessName,
        firstName,
        lastName,
        phone,
        cacNumber: p.cacNumber,
        pmType: p.pmType,
        country: p.country,
        isVerified: p.isVerified,
        createdAt: p.createdAt,
      }
      pmMap.set(p.id, pmObj)
      if (email) {
        pmMapByEmail.set(email.toLowerCase(), pmObj)
      }
    })

    // Enrich logs and format readable text
    const enrichedLogs = logs.map((log) => {
      // If it's a tenant entity operation (like invite or create tenant), the target user is the tenant
      const targetTenant = log.entityType === 'TENANT' && log.entityId ? userMapByUuid.get(log.entityId) : null

      let user = log.userId ? userMap.get(log.userId) : null
      if (!user && log.userEmail) {
        user = userMapByEmail.get(log.userEmail.toLowerCase())
      }

      let pm = log.pmId ? pmMap.get(log.pmId) : null
      if (!pm && log.userEmail && log.userRole === 'PM') {
        pm = pmMapByEmail.get(log.userEmail.toLowerCase())
      }

      let pathway: 'WAITLIST' | 'INVITE' | 'SELF' | null = null
      // Only show tenant pathway badges if the log belongs to a tenant user (not a PM acting)
      if (user && log.userRole !== 'PM' && log.app !== 'upward-pm') {
        if (user.isFromInvite) pathway = 'INVITE'
        else if (user.isFromWaitlist) pathway = 'WAITLIST'
        else pathway = 'SELF'
      }

      // Format human-readable event description
      let readableText = log.description || ''
      
      const userEmailLink = user?.email || log.userEmail || '';
      const userNameStr = user ? `${user.firstName} ${user.lastName}` : '';
      const userDisplayName = userNameStr.trim() ? `${userNameStr} (${userEmailLink})` : userEmailLink;

      const pmNameStr = pm ? pm.businessName : '';
      const pmEmailLink = pm?.email || '';
      const pmDisplayName = pmNameStr ? `${pmNameStr} (${pmEmailLink})` : pmEmailLink;

      if (log.action === 'SIGNUP') {
        if (log.userRole === 'PM' || log.app === 'upward-pm') {
          readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} registered a new account.`
        } else {
          if (user?.isFromInvite) {
            readableText = `Invited Tenant ${userDisplayName} completed registration and set their password.`
          } else if (user?.isFromWaitlist) {
            readableText = `Waitlist Tenant ${userDisplayName} converted and completed registration.`
          } else {
            readableText = `Tenant ${userDisplayName} self-registered a new account.`
          }
        }
      } else if (log.action === 'CREATE') {
        if (log.entityType === 'UNIT') {
          const match = log.description.match(/(?:uploaded|imported|added) (\d+) (?:units|properties|records)/i)
          if (match) {
            readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} bulk uploaded ${match[1]} units.`
          } else {
            readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} created a new unit.`
          }
        } else if (log.entityType === 'INVITE') {
          let inviteEmail = ''
          try {
            const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {}
            if (meta.email) {
              inviteEmail = meta.email
            } else if (meta.tenants && Array.isArray(meta.tenants)) {
              inviteEmail = meta.tenants.map((t: any) => t.email).join(', ')
            }
          } catch (e) {}
          if (!inviteEmail) {
            const match = log.description.match(/invite tenant:?\s*([^\s]+)/i)
            inviteEmail = match && match[1] ? match[1] : ''
          }
          if (!inviteEmail) {
            inviteEmail = log.description.replace(/CREATE action on INVITE.*by\s+/i, '') || 'a tenant'
          }
          readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} invited Tenant ${inviteEmail}.`
        } else if (log.entityType === 'TENANT') {
          const tenantEmailLink = targetTenant?.email || '';
          const tenantNameStr = targetTenant ? `${targetTenant.firstName} ${targetTenant.lastName}`.trim() : '';
          const tenantDisplayName = tenantNameStr ? `${tenantNameStr} (${tenantEmailLink})` : tenantEmailLink || 'a tenant';

          if (targetTenant?.isFromInvite) {
            readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} invited Tenant ${tenantDisplayName}.`
          } else {
            readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} created a tenant record for ${tenantDisplayName}.`
          }
        } else if (log.entityType === 'PAYMENT' || log.entityType === 'RENT') {
          let amountStr = ''
          try {
            const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {}
            if (meta.amount) {
              amountStr = ` of ₦${Number(meta.amount).toLocaleString()}`
            }
          } catch (e) {}
          if (!amountStr) {
            const amtMatch = log.description.match(/₦\s*([\d,]+)/)
            if (amtMatch) amountStr = ` of ₦${amtMatch[1]}`
          }
          readableText = `Tenant ${userDisplayName} made a payment${amountStr}.`
        } else if (log.entityType === 'CREDIBILITY_REQUEST') {
          readableText = `Tenant ${userDisplayName} requested their rental history credibility report.`
        }
      }

      return {
        ...log,
        user: targetTenant || user,
        pm,
        userPathway: pathway,
        readableText,
      }
    })

    return {
      data: enrichedLogs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }
  }
}
