/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { CreateWaitlistEntryDto, AdminRole } from '@upward/shared-types'
import * as bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { AdminLogService } from '../admin-log/admin-log.service'
import { formatName } from '@upward/common-utils'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async getAllUsers(options: {
    page: number
    limit: number
    search?: string
    roles?: string[]
    countries?: string[]
    cities?: string[]
    selectedSessions?: string[]
    createdFrom?: string
    createdTo?: string
    completed?: string
  }) {
    const {
      page,
      limit,
      search,
      roles,
      countries,
      cities,
      selectedSessions,
      createdFrom,
      createdTo,
      completed,
    } = options
    const skip = (page - 1) * limit

    const where: Prisma.upward_waitlistWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (roles && roles.length > 0) {
      where.role = { in: roles }
    }

    if (countries && countries.length > 0) {
      where.country = { in: countries }
    }

    if (cities && cities.length > 0) {
      where.city = { in: cities }
    }

    if (selectedSessions && selectedSessions.length > 0) {
      // Find sessions whose names match the selected days (e.g. "Saturday")
      const matchingSessions = await this.prisma.upward_session.findMany({
        where: {
          OR: selectedSessions.map((s) => ({
            name: { contains: s, mode: 'insensitive' },
          })),
        },
        select: { id: true, name: true },
      })

      const sessionIds = matchingSessions.map((s) => s.id)
      const sessionNames = matchingSessions.map((s) => s.name)

      // Combine conditions: either contains the day string OR matches a known session ID
      const sessionFilters: Prisma.upward_waitlistWhereInput[] = [
        ...selectedSessions.map((s) => ({
          selectedSession: { contains: s, mode: 'insensitive' as const },
        })),
        { selectedSession: { in: sessionIds } },
        { selectedSession: { in: sessionNames } },
      ]

      if (where.OR) {
        // If we already have search filters, we need (Search OR ...) AND (Session Condition)
        const existingOR = where.OR as Prisma.upward_waitlistWhereInput[]
        delete where.OR
        where.AND = [{ OR: existingOR }, { OR: sessionFilters }]
      } else {
        where.OR = sessionFilters
      }
    }

    if (completed === 'true') {
      where.acceptTerms = true
    } else if (completed === 'false') {
      where.acceptTerms = { not: true }
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom && { gte: new Date(createdFrom) }),
        ...(createdTo && { lte: new Date(createdTo) }),
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.upward_waitlist.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          attendances: true,
          emailLogs: true,
        },
      }),
      this.prisma.upward_waitlist.count({ where }),
    ])

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateUser(id: string, data: Partial<CreateWaitlistEntryDto>) {
    return this.prisma.upward_waitlist.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }

  async deleteUser(id: string, requesterRole: AdminRole, requesterId: string) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.upward_waitlist.findUnique({
        where: { id },
        select: { email: true },
      })

      // Delete related records first to avoid foreign key constraint violations
      await tx.upward_email_log.deleteMany({
        where: { userId: id },
      })
      await tx.upward_attendance.deleteMany({
        where: { userId: id },
      })

      const deleted = await tx.upward_waitlist.delete({
        where: { id },
      })

      if (user) {
        await this.adminLogService.logAction(
          requesterId,
          'DELETE_USER',
          `Deleted user: ${user.email}`,
        )
      }

      return deleted
    })
  }

  async bulkDeleteUsers(ids: string[], requesterRole: AdminRole, requesterId: string) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }

    return this.prisma.$transaction(async (tx) => {
      const count = ids.length
      // Delete related records first to avoid foreign key constraint violations
      await tx.upward_email_log.deleteMany({
        where: { userId: { in: ids } },
      })
      await tx.upward_attendance.deleteMany({
        where: { userId: { in: ids } },
      })

      const result = await tx.upward_waitlist.deleteMany({
        where: { id: { in: ids } },
      })

      await this.adminLogService.logAction(
        requesterId,
        'DELETE_USER',
        `Bulk deleted ${count} users`,
      )

      return result
    })
  }

  // --- Analytics & Drop-off ---

  async getAnalytics() {
    // Current totals
    const totalWaitlist = await this.prisma.upward_waitlist.count()
    const totalCompleted = await this.prisma.upward_waitlist.count({ where: { acceptTerms: true } })
    const totalIncomplete = await this.prisma.upward_waitlist.count({
      where: { acceptTerms: { not: true } },
    })

    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const joinedLast24h = await this.prisma.upward_waitlist.count({
      where: { createdAt: { gte: last24hStart } },
    })

    // Yesterday's stats (calendar day)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayEnd = todayStart

    const [completedYesterday, incompleteYesterday] = await Promise.all([
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: true,
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
        },
      }),
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: { not: true },
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
        },
      }),
    ])

    // Group by day for simple interaction chart (last 30 days)
    const interactionStats: { date: Date; count: number }[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        COUNT(*)::int as count
      FROM upward_waitlist
      WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `

    const [roleDist, countryDist, cityDist, allWaitlistBenefits] = await Promise.all([
      this.prisma.upward_waitlist.groupBy({
        by: ['role'],
        _count: { _all: true },
        where: { role: { not: null } },
        orderBy: { _count: { role: 'desc' } },
      }),
      this.prisma.upward_waitlist.groupBy({
        by: ['country'],
        _count: { _all: true },
        where: { country: { not: null } },
        orderBy: { _count: { country: 'desc' } },
      }),
      this.prisma.upward_waitlist.groupBy({
        by: ['city'],
        _count: { _all: true },
        where: { city: { not: null } },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
      this.prisma.upward_waitlist.findMany({
        select: { role: true, benefits: true },
        where: { benefits: { isEmpty: false } },
      }),
    ])

    // Process benefits
    const tenantBenefits = ['PRIORITY', 'FINANCING', 'OWNERSHIP']
    const ownerBenefits = ['HISTORY', 'CREDIT', 'TITLE']
    const defaultBenefits = [...tenantBenefits, ...ownerBenefits]

    const benefitStats: Record<string, number> = {}
    defaultBenefits.forEach((b) => (benefitStats[b] = 0))

    const roleTotalWithBenefits: Record<string, number> = {}
    const roleBenefitStats: Record<string, Record<string, number>> = {}
    const customBenefitMap: Record<string, { count: number; roles: string[] }> = {}
    let customCount = 0

    allWaitlistBenefits.forEach((entry) => {
      const role = entry.role || 'Unknown'
      roleTotalWithBenefits[role] = (roleTotalWithBenefits[role] || 0) + 1

      if (!roleBenefitStats[role]) {
        const initialStats: Record<string, number> = {}
        defaultBenefits.forEach((b) => (initialStats[b] = 0))
        roleBenefitStats[role] = initialStats
      }

      const stats = roleBenefitStats[role] || {}
      entry.benefits.forEach((b) => {
        if (defaultBenefits.includes(b)) {
          benefitStats[b] = (benefitStats[b] || 0) + 1
          stats[b] = (stats[b] || 0) + 1
        } else {
          customCount++
          const normalized = b.trim()
          if (!customBenefitMap[normalized]) {
            customBenefitMap[normalized] = { count: 0, roles: [] }
          }
          customBenefitMap[normalized].count++
          customBenefitMap[normalized].roles.push(role)
        }
      })
    })

    const last10Users = await this.prisma.upward_waitlist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    const customBenefitsList = Object.entries(customBenefitMap)
      .map(([label, data]) => ({ 
          label, 
          count: data.count, 
          roles: data.roles 
      }))
      .sort((a, b) => b.count - a.count)

    return {
      totalWaitlist,
      joinedLast24h,
      totalCompleted,
      totalIncomplete,
      completedYesterday,
      incompleteYesterday,
      interactionStats,
      last10Users,
      distributions: {
        roles: roleDist.map((r) => ({
          label: (r.role as string) || 'Unknown',
          count: (r._count as any)._all || 0,
        })),
        countries: countryDist.map((c) => ({
          label: (c.country as string) || 'Unknown',
          count: (c._count as any)._all || 0,
        })),
        cities: cityDist.map((c) => ({
          label: (c.city as string) || 'Unknown',
          count: (c._count as any)._all || 0,
        })),
        benefits: defaultBenefits.map((b) => ({ label: b, count: benefitStats[b] || 0 })),
        roleBenefits: Object.keys(roleBenefitStats).reduce(
          (acc, role) => {
            const relevantBenefits = role === 'TENANT' ? tenantBenefits : ownerBenefits
            // If it's a known role, only show relevant benefits. Otherwise show all.
            const benefitsToDisplay =
              role === 'TENANT' || role === 'OWNER' ? relevantBenefits : defaultBenefits
            const stats = roleBenefitStats[role] || {}
            acc[role] = benefitsToDisplay.map((b) => ({
              label: b,
              count: (stats[b] as number) || 0,
            }))
            return acc
          },
          {} as Record<string, { label: string; count: number }[]>,
        ),
        roleTotalWithBenefits,
        customBenefits: {
          count: customCount,
          items: customBenefitsList,
        },
      },
    }
  }

  async getDropOffAnalysis() {
    // Classification logic provided by user
    return this.prisma.$queryRaw`
      SELECT 
          id,
          email,
          "firstName" || ' ' || "lastName" AS full_name,
          role,
          benefits,
          "acceptTerms",
          CASE 
              WHEN "acceptTerms" = true THEN 'Completed'
              WHEN "selectedSession" IS NOT NULL OR "wantsAmbassador" = true THEN 'Stage 4: Confirmation'
              WHEN cardinality(benefits) > 0 THEN 'Stage 3: Benefits'
              WHEN role IS NOT NULL THEN 'Stage 2: Role'
              WHEN "firstName" IS NOT NULL OR "phone" IS NOT NULL OR "city" IS NOT NULL THEN 'Stage 1: Contact Info'
              ELSE 'Stage 0: Email Capture'
          END AS drop_off_stage,
          "createdAt" AS started_at,
          "updatedAt" AS last_activity,
          "selectedSession"
      FROM upward_waitlist
      ORDER BY "updatedAt" DESC;
    `
  }

  // --- Session Management ---

  async getSessions() {
    // 1. Fetch all existing sessions
    const allSessions = await this.prisma.upward_session.findMany({
      orderBy: { startTime: 'asc' },
    })

    // 2. Map and include attendees for each session
    const regularResults = await Promise.all(
      allSessions.map(async (session) => {
        const attendees = await this.prisma.upward_waitlist.findMany({
          where: { selectedSession: session.name },
          include: {
            attendances: {
              where: { sessionId: session.id },
            },
          },
        })

        return {
          ...session,
          attendances: attendees.map((user) => ({
            userId: user.id,
            user,
            attended: user.attendances.length > 0 ? user.attendances[0]?.attended : false,
          })),
        }
      }),
    )

    // 3. Synthesize the "None" session
    const noneAttendees = await this.prisma.upward_waitlist.findMany({
      where: {
        OR: [{ selectedSession: null }, { selectedSession: '' }, { selectedSession: 'NONE' }],
      },
    })

    const noneSession = {
      id: 'none',
      name: 'None (Unscheduled)',
      googleMeetLink: '',
      startTime: new Date(0).toISOString(),
      endTime: new Date(0).toISOString(),
      isVirtual: true,
      attendances: noneAttendees.map((user) => ({
        userId: user.id,
        user,
        attended: false, // Attendance doesn't apply to "None"
      })),
    }

    return [noneSession, ...regularResults]
  }

  async updateSession(
    id: string,
    data: { name?: string; googleMeetLink?: string; startTime?: string; endTime?: string },
  ) {
    return this.prisma.upward_session.update({
      where: { id },
      data: {
        ...data,
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
      },
    })
  }

  async createSession(data: {
    name: string
    googleMeetLink: string
    startTime: string
    endTime: string
  }) {
    return this.prisma.upward_session.create({
      data: {
        name: data.name,
        googleMeetLink: data.googleMeetLink,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    })
  }

  async deleteSession(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Delete attendances first
      await tx.upward_attendance.deleteMany({
        where: { sessionId: id },
      })
      // Delete the session
      return tx.upward_session.delete({
        where: { id },
      })
    })
  }

  async markAttendance(sessionId: string, userId: string, attended: boolean) {
    return this.prisma.upward_attendance.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      update: { attended },
      create: { sessionId, userId, attended },
    })
  }

  async changeUserSession(userId: string, sessionId: string) {
    return this.prisma.upward_waitlist.update({
      where: { id: userId },
      data: { selectedSession: sessionId },
    })
  }

  // --- Admin Management (Superadmin Only) ---

  async getAdmins() {
    return this.prisma.upward_admin.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createAdmin(
    email: string,
    passwordPlain: string,
    role: AdminRole = AdminRole.ADMIN,
    requesterId?: string,
  ) {
    const existing = await this.prisma.upward_admin.findUnique({ where: { email } })
    if (existing) throw new ConflictException('Admin already exists')

    const passwordHash = await bcrypt.hash(passwordPlain, 10)
    const admin = await this.prisma.upward_admin.create({
      data: {
        email,
        passwordHash,
        role,
        mustChangePassword: true,
      },
    })

    try {
      await this.emailService.sendGenericEmail(
        email,
        'Your Admin Access for Upward',
        `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d97757;">Welcome to Upward Admin</h2>
          <p>You have been granted <strong>${role}</strong> access to the Upward Dashboard.</p>
          <p>Use the following credentials to log in:</p>
          <div style="background: #f4f4f4; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0;"><strong>Password:</strong> ${passwordPlain}</p>
          </div>
          <p style="color: #666; font-size: 14px;">For security reasons, you will be required to change your password on your first login.</p>
          <a href="${process.env.ADMIN_SITE_URL || 'https://upward-admin-site.vercel.app'}" style="display: inline-block; padding: 12px 24px; background: #d97757; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;">Log in to Dashboard</a>
        </div>
        `,
      )
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err)
    }

    // Log this action
    if (requesterId) {
      await this.adminLogService.logAction(
        requesterId,
        'ADD_ADMIN',
        `Added new admin: ${email} (${role})`,
      )
    }

    return admin
  }

  async deleteAdmin(id: string, requesterId: string) {
    const adminToDelete = await this.prisma.upward_admin.findUnique({ where: { id } })
    if (!adminToDelete) throw new NotFoundException('Admin not found')

    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete yourself')
    }
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.upward_admin.delete({
        where: { id },
      })
      await this.adminLogService.logAction(
        requesterId,
        'DELETE_ADMIN',
        `Deleted admin: ${deleted.email}`,
      )
      return deleted
    })
  }

  async demoteAdmin(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot demote yourself')
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.upward_admin.update({
        where: { id },
        data: { role: AdminRole.ADMIN },
      })
      await this.adminLogService.logAction(
        requesterId,
        'DEMOTE_ADMIN',
        `Demoted admin to ADMIN: ${updated.email}`,
      )
      return updated
    })
  }

  async changePassword(adminId: string, newPasswordPlain: string) {
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10)
    return this.prisma.upward_admin.update({
      where: { id: adminId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    })
  }

  async promoteAdmin(id: string, requesterId: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.upward_admin.update({
        where: { id },
        data: { role: AdminRole.SUPERADMIN },
      })
      await this.adminLogService.logAction(
        requesterId,
        'PROMOTE_ADMIN',
        `Promoted admin to SUPERADMIN: ${updated.email}`,
      )
      return updated
    })
  }

  // --- Emailing ---

  async sendBulkEmail(payload: {
    userIds: string[]
    subject: string
    content: string
    sessionId?: string
    requesterId?: string
  }) {
    const users = await this.prisma.upward_waitlist.findMany({
      where: { id: { in: payload.userIds } },
    })

    const results = []

    for (const user of users) {
      try {
        // Variables replacement
        const customizedContent = payload.content
          .replace(/{{firstName}}/g, formatName(user.firstName || ''))
          .replace(/{{lastName}}/g, formatName(user.lastName || ''))
          .replace(/{{email}}/g, user.email)

        await this.emailService.sendGenericEmail(user.email, payload.subject, customizedContent)

        await this.prisma.upward_email_log.create({
          data: {
            userId: user.id,
            sessionId: payload.sessionId,
            subject: payload.subject,
            status: 'SENT',
          },
        })
        results.push({ email: user.email, status: 'SENT' })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error(`Failed to send email to ${user.email}`, error)
        await this.prisma.upward_email_log.create({
          data: {
            userId: user.id,
            sessionId: payload.sessionId,
            subject: payload.subject,
            status: 'FAILED',
          },
        })
        results.push({ email: user.email, status: 'FAILED', error: errorMessage })
      }
    }

    // Log the batch email action
    if (payload.requesterId) {
      await this.adminLogService.logAction(
        payload.requesterId,
        'SEND_EMAIL',
        `Batch emailed ${users.length} users. Subject: ${payload.subject}`,
      )
    }

    return results
  }

  async resendConfirmationEmail(userId: string, requesterId: string) {
    const user = await this.prisma.upward_waitlist.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.acceptTerms) {
      throw new ForbiddenException('User has not accepted terms yet')
    }

    const result = await this.emailService.sendWaitlistConfirmation(
      user.id,
      user.email,
      user.firstName ?? undefined,
    )

    await this.adminLogService.logAction(
      requesterId,
      'RESEND_EMAIL',
      `Manually resent confirmation email to: ${user.email}. Result: ${result.success ? 'Success' : 'Failed'}`,
    )

    return result
  }

  async getFilterOptions() {
    const [roles, countries, cities, sessions] = await Promise.all([
      this.prisma.upward_waitlist.findMany({
        distinct: ['role'],
        select: { role: true },
        where: { role: { not: null } },
      }),
      this.prisma.upward_waitlist.findMany({
        distinct: ['country'],
        select: { country: true },
        where: { country: { not: null } },
      }),
      this.prisma.upward_waitlist.findMany({
        distinct: ['country', 'city'],
        select: { country: true, city: true },
        where: { city: { not: null } },
      }),
      this.prisma.upward_session.findMany({
        select: { id: true, name: true },
      }),
    ])

    return {
      roles: roles.map((r) => r.role),
      countries: countries.map((c) => c.country),
      cities: cities.map((c) => ({ country: c.country, city: c.city })),
      sessions: sessions.map((s) => ({ id: s.id, name: s.name })),
    }
  }

  // --- A/B Test Statistics ---

  async getAbStats() {
    // 1. Total interactions & unique visitors per variant (from upward_interaction)
    const variantSummary: { abvariant: string; total: number; unique_visitors: number }[] =
      await this.prisma.$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          COUNT(*)::int AS total,
          COUNT(DISTINCT "visitorId")::int AS unique_visitors
        FROM upward_interaction
        GROUP BY "abVariant"
        ORDER BY "abVariant"
      `

    // 2. Click-through events per variant (type = CLICK)
    const clickCounts: { abvariant: string; clicks: number }[] = await this.prisma.$queryRaw`
      SELECT
        "abVariant" AS abvariant,
        COUNT(*)::int AS clicks
      FROM upward_interaction
      WHERE type = 'CLICK'
      GROUP BY "abVariant"
    `

    // 3. Top targets per variant (top 10)
    const topTargets: { abvariant: string; target: string; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          target,
          COUNT(*)::int AS count
        FROM upward_interaction
        GROUP BY "abVariant", target
        ORDER BY "abVariant", count DESC
      `

    // 4. Event type breakdown per variant
    const typeBreakdown: { abvariant: string; type: string; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          type,
          COUNT(*)::int AS count
        FROM upward_interaction
        GROUP BY "abVariant", type
        ORDER BY "abVariant", type
      `

    // 5. Daily interaction trend (last 30 days) per variant
    const dailyTrend: { abvariant: string; date: Date; count: number }[] = await this.prisma
      .$queryRaw`
        SELECT
          "abVariant" AS abvariant,
          DATE_TRUNC('day', "createdAt") AS date,
          COUNT(*)::int AS count
        FROM upward_interaction
        WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY "abVariant", DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `

    // 6. Signups (completed waitlist entries) per abVariant from upward_waitlist
    const signupsByVariant: { abvariant: string; signups: number; completed: number }[] = await this
      .prisma.$queryRaw`
        SELECT
          COALESCE("abVariant", 'unknown') AS abvariant,
          COUNT(*)::int AS signups,
          COUNT(*) FILTER (WHERE "acceptTerms" = true)::int AS completed
        FROM upward_waitlist
        GROUP BY "abVariant"
        ORDER BY "abVariant"
      `

    // Merge into per-variant objects
    const variants = ['A', 'B']
    const result = variants.map((v) => {
      const summary = variantSummary.find((s) => s.abvariant === v)
      const clicks = clickCounts.find((c) => c.abvariant === v)
      const signups = signupsByVariant.find((s) => s.abvariant === v)
      const total = summary?.total ?? 0
      const clickTotal = clicks?.clicks ?? 0

      return {
        variant: v,
        totalEvents: total,
        uniqueVisitors: summary?.unique_visitors ?? 0,
        totalClicks: clickTotal,
        ctr: total > 0 ? Math.round((clickTotal / total) * 1000) / 10 : 0, // %
        signups: signups?.signups ?? 0,
        completedSignups: signups?.completed ?? 0,
        conversionRate:
          (summary?.unique_visitors ?? 0) > 0
            ? Math.round(((signups?.completed ?? 0) / (summary?.unique_visitors ?? 1)) * 1000) / 10
            : 0,
        topTargets: topTargets
          .filter((t) => t.abvariant === v)
          .slice(0, 10)
          .map((t) => ({ target: t.target, count: t.count })),
        typeBreakdown: typeBreakdown
          .filter((t) => t.abvariant === v)
          .map((t) => ({ type: t.type, count: t.count })),
        dailyTrend: dailyTrend
          .filter((d) => d.abvariant === v)
          .map((d) => ({ date: d.date, count: d.count })),
      }
    })

    return result
  }

  async sendDailyReport() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    const [completedToday, incompleteToday] = await Promise.all([
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: true,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
      this.prisma.upward_waitlist.count({
        where: {
          acceptTerms: false,
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
    ])

    const totalToday = completedToday + incompleteToday

    // Get Superadmins to notify
    const superadmins = await this.prisma.upward_admin.findMany({
      where: { role: AdminRole.SUPERADMIN },
      select: { email: true },
    })

    const emails = superadmins.map((s) => s.email)

    // Fallback if no superadmins
    if (emails.length === 0) {
      emails.push('hello@goodtenants.africa')
    }

    const stats = {
      completed: completedToday,
      incomplete: incompleteToday,
      total: totalToday,
    }

    for (const email of emails) {
      await this.emailService.sendDailyAnalyticsEmail(email, stats)
    }

    return { success: true, stats, notified: emails }
  }

  async getErrorLogs() {
    return this.prisma.upward_error_log.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async resolveError(id: string) {
    return this.prisma.upward_error_log.update({
      where: { id },
      data: { resolved: true },
    })
  }

  async clearErrorLogs() {
    return this.prisma.upward_error_log.deleteMany({
      where: { resolved: true },
    })
  }
}
