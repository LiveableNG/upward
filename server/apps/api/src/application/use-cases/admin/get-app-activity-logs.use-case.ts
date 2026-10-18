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

    // Always scope to upward-pay (tenant app)
    andConditions.push({ app: 'upward-pay' })

    // Filter by action if specified, otherwise include standard business events
    if (query.actionFilter && query.actionFilter !== 'ALL') {
      andConditions.push({ action: query.actionFilter })
    } else {
      andConditions.push({
        action: { in: ['SIGNUP', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SIGNUP_FAILED', 'PAYMENT', 'DEPOSIT', 'CREDIBILITY_REQUEST', 'UPDATE', 'CREATE', 'DELETE'] },
      })
    }

    // Filter out anonymous system logs, keeping verified user events, signups, logins, and auth events
    andConditions.push({
      OR: [
        { action: { in: ['SIGNUP', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'SIGNUP_FAILED'] } },
        { userId: { not: null } },
        {
          AND: [
            { userEmail: { not: null } },
            { userEmail: { not: '' } },
            { userEmail: { not: 'system' } },
            { userEmail: { not: 'System' } },
          ],
        },
      ],
    })

    // Omit routine failed token refreshes (expired/missing cookie background checks)
    andConditions.push({
      NOT: {
        AND: [
          { action: 'LOGIN_FAILED' },
          {
            OR: [
              { entityId: 'refresh' },
              { description: { contains: 'refresh', mode: 'insensitive' } },
            ],
          },
        ],
      },
    })

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
      const p = query.platformFilter.toLowerCase()
      if (p === 'ios') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
            { userAgent: { contains: 'iPad', mode: 'insensitive' } },
            { description: { contains: 'iOS', mode: 'insensitive' } },
          ],
        })
      } else if (p === 'android') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'Android', mode: 'insensitive' } },
            { description: { contains: 'Android', mode: 'insensitive' } },
          ],
        })
      } else if (p === 'mobile') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
            { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
            { userAgent: { contains: 'iPad', mode: 'insensitive' } },
            { userAgent: { contains: 'Android', mode: 'insensitive' } },
          ],
        })
      } else if (p === 'web') {
        andConditions.push({
          NOT: {
            OR: [
              { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
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
      
      const metaObj = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null;
      const metaEmail = metaObj?.body?.email || metaObj?.body?.identifier;
      const userEmailLink = user?.email || log.userEmail || metaEmail || '';
      const userNameStr = user ? `${user.firstName} ${user.lastName}` : '';
      const userDisplayName = userNameStr.trim() ? `${userNameStr} (${userEmailLink})` : userEmailLink;

      const pmNameStr = pm ? pm.businessName : '';
      const pmEmailLink = pm?.email || '';
      const pmDisplayName = pmNameStr ? `${pmNameStr} (${pmEmailLink})` : pmEmailLink;

      const resolvePlatformAndDevice = (item: any) => {
        const meta = item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : {}
        let platform: 'ios' | 'android' | 'web' = 'web'
        if (meta.platform) {
          const p = String(meta.platform).toLowerCase()
          if (p.includes('ios')) platform = 'ios'
          else if (p.includes('android')) platform = 'android'
          else if (p.includes('web')) platform = 'web'
        } else if (meta.clientPlatform) {
          const cp = String(meta.clientPlatform).toLowerCase()
          if (cp.includes('ios')) platform = 'ios'
          else if (cp.includes('android')) platform = 'android'
          else if (cp.includes('web')) platform = 'web'
        } else {
          const ua = (item.userAgent || '').toLowerCase()
          if (/iphone|ipad|ipod/i.test(ua)) platform = 'ios'
          else if (/android/i.test(ua)) platform = 'android'
          else platform = 'web'
        }

        let deviceSummary = meta.device || ''
        if (!deviceSummary) {
          const ua = item.userAgent || ''
          if (/iphone/i.test(ua)) deviceSummary = 'iPhone'
          else if (/ipad/i.test(ua)) deviceSummary = 'iPad'
          else if (/android/i.test(ua)) {
            const m = ua.match(/;\s*([^;)]+)\s+Build/i)
            deviceSummary = m && m[1] ? m[1].trim() : 'Android Device'
          } else if (/macintosh|mac os x/i.test(ua)) deviceSummary = 'Mac'
          else if (/windows/i.test(ua)) deviceSummary = 'Windows PC'
          else if (/linux/i.test(ua)) deviceSummary = 'Linux PC'
          else deviceSummary = 'Web Browser'
        }

        return { platform, deviceSummary }
      }

      const { platform, deviceSummary } = resolvePlatformAndDevice(log)

      const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {}
      const providerName = (meta.provider || meta.authProvider || user?.authProvider || '').toLowerCase()
      const oauthLabel = providerName === 'google' ? ' via Google' : providerName === 'apple' ? ' via Apple' : ''

      if (log.action === 'SIGNUP') {
        const platformLabel = platform === 'ios' ? 'iOS App' : platform === 'android' ? 'Android App' : 'Web'
        if (log.userRole === 'PM' || log.app === 'upward-pm') {
          readableText = `Property Manager ${pmDisplayName || 'Unknown PM'} registered a new account via ${platformLabel}.`
        } else {
          if (oauthLabel) {
            readableText = `Tenant ${userDisplayName} registered${oauthLabel} via ${platformLabel}.`
          } else if (user?.isFromInvite) {
            readableText = `Invited Tenant ${userDisplayName} completed registration via ${platformLabel}.`
          } else if (user?.isFromWaitlist) {
            readableText = `Waitlist Tenant ${userDisplayName} converted and completed registration via ${platformLabel}.`
          } else {
            readableText = `Tenant ${userDisplayName} self-registered a new account via ${platformLabel}.`
          }
        }
      } else if (log.action === 'LOGIN') {
        const platformLabel = platform === 'ios' ? 'iOS App' : platform === 'android' ? 'Android App' : 'Web'
        readableText = `${userDisplayName || 'Tenant'} logged in${oauthLabel} via ${platformLabel} (${deviceSummary}).`
      } else if (log.action === 'LOGIN_FAILED' || log.action === 'AUTH_FAILED') {
        const platformLabel = platform === 'ios' ? 'iOS App' : platform === 'android' ? 'Android App' : 'Web'
        const reason = meta.error || log.description.split(': ')[1] || 'Authentication error'
        readableText = `${userDisplayName || 'User'} sign-in attempt failed${oauthLabel} via ${platformLabel}: ${reason}`
      } else if (log.action === 'SIGNUP_FAILED') {
        const platformLabel = platform === 'ios' ? 'iOS App' : platform === 'android' ? 'Android App' : 'Web'
        const reason = meta.error || log.description.split(': ')[1] || 'Registration error'
        readableText = `${userDisplayName || 'User'} registration attempt failed${oauthLabel} via ${platformLabel}: ${reason}`
      } else if (log.action === 'LOGOUT') {
        const platformLabel = platform === 'ios' ? 'iOS App' : platform === 'android' ? 'Android App' : 'Web'
        readableText = `${userDisplayName || 'Tenant'} logged out via ${platformLabel}.`
      } else if (log.action === 'PAYMENT' || log.entityType === 'PAYMENT' || log.entityType === 'RENT') {
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
        readableText = `Tenant ${userDisplayName || 'User'} initiated rent checkout${amountStr}.`
      } else if (log.action === 'DEPOSIT' || log.entityType === 'WALLET') {
        let amountStr = ''
        try {
          const meta = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {}
          if (meta.amount) {
            amountStr = ` of ₦${Number(meta.amount).toLocaleString()}`
          }
        } catch (e) {}
        readableText = `Tenant ${userDisplayName || 'User'} deposited funds${amountStr} to savings wallet.`
      } else if (log.action === 'CREDIBILITY_REQUEST' || log.entityType === 'CREDIBILITY_REQUEST') {
        readableText = `Tenant ${userDisplayName || 'User'} requested their rental history credibility report.`
      } else if (log.action === 'UPDATE' || log.entityType === 'PROFILE') {
        readableText = `Tenant ${userDisplayName || 'User'} updated profile settings.`
      }

      if (!readableText && log.description) {
        readableText = log.description
      }

      return {
        ...log,
        platform,
        deviceSummary,
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
