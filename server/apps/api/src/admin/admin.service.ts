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

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getAllUsers(options: {
    page: number
    limit: number
    search?: string
    role?: string
    country?: string
    city?: string
    selectedSession?: string
  }) {
    const { page, limit, search, role, country, city, selectedSession } = options
    const skip = (page - 1) * limit

    const where: Prisma.upward_waitlistWhereInput = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role && role !== 'All') {
      where.role = role
    }

    if (country && country !== 'All') {
      where.country = country
    }

    if (city && city !== 'All') {
      where.city = city
    }

    if (selectedSession && selectedSession !== 'All') {
      where.selectedSession = selectedSession
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

  async deleteUser(id: string, requesterRole: AdminRole) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }
    return this.prisma.upward_waitlist.delete({
      where: { id },
    })
  }

  async bulkDeleteUsers(ids: string[], requesterRole: AdminRole) {
    if (requesterRole !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmins can delete users')
    }
    return this.prisma.upward_waitlist.deleteMany({
      where: { id: { in: ids } },
    })
  }

  // --- Analytics & Drop-off ---

  async getAnalytics() {
    const totalWaitlist = await this.prisma.upward_waitlist.count()
    const joinedLast24h = await this.prisma.upward_waitlist.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

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

    const [roleDist, countryDist, cityDist] = await Promise.all([
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
    ])

    const last10Users = await this.prisma.upward_waitlist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    return {
      totalWaitlist,
      joinedLast24h,
      interactionStats,
      last10Users,
      distributions: {
        roles: roleDist.map((r) => ({ label: r.role, count: r._count._all })),
        countries: countryDist.map((c) => ({ label: c.country, count: c._count._all })),
        cities: cityDist.map((c) => ({ label: c.city, count: c._count._all })),
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
    // 1. Get unique session names from upward_waitlist
    const uniqueWaitlistSessions = await this.prisma.upward_waitlist.findMany({
      where: { selectedSession: { not: null } },
      distinct: ['selectedSession'],
      select: { selectedSession: true },
    })

    const sessionNames = uniqueWaitlistSessions
      .map((s) => s.selectedSession)
      .filter((s): s is string => !!s)

    // 2. Fetch existing session data
    const sessions = await this.prisma.upward_session.findMany({
      where: { name: { in: sessionNames } },
      orderBy: { startTime: 'asc' },
    })

    // 3. Identify missing sessions and create them (defaults)
    const existingNames = sessions.map((s) => s.name)
    const missingNames = sessionNames.filter((name) => !existingNames.includes(name))

    if (missingNames.length > 0) {
      await Promise.all(
        missingNames.map((name) =>
          this.prisma.upward_session.create({
            data: {
              name,
              googleMeetLink: 'https://meet.google.com/',
              startTime: new Date(),
              endTime: new Date(Date.now() + 60 * 60 * 1000),
            },
          }),
        ),
      )
    }

    // 4. Fetch all sessions with their attendees from waitlist
    const allSessions = await this.prisma.upward_session.findMany({
      orderBy: { startTime: 'asc' },
    })

    const result = await Promise.all(
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

    return result
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

  async createAdmin(email: string, passwordPlain: string, role: AdminRole = AdminRole.ADMIN) {
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

    // Send email to the new admin
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
          <a href="${process.env.ADMIN_SITE_URL || 'https://admin.upward.ng'}" style="display: inline-block; padding: 12px 24px; background: #d97757; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;">Log in to Dashboard</a>
        </div>
        `,
      )
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err)
    }

    return admin
  }

  async deleteAdmin(id: string, requesterId: string) {
    const adminToDelete = await this.prisma.upward_admin.findUnique({ where: { id } })
    if (!adminToDelete) throw new NotFoundException('Admin not found')

    if (adminToDelete.role === AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Superadmins cannot be deleted')
    }

    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete yourself')
    }

    return this.prisma.upward_admin.delete({ where: { id } })
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

  async promoteAdmin(id: string) {
    return this.prisma.upward_admin.update({
      where: { id },
      data: { role: AdminRole.SUPERADMIN },
    })
  }

  // --- Emailing ---

  async sendBulkEmail(payload: {
    userIds: string[]
    subject: string
    content: string
    sessionId?: string
  }) {
    const users = await this.prisma.upward_waitlist.findMany({
      where: { id: { in: payload.userIds } },
    })

    const results = []
    for (const user of users) {
      try {
        // Variables replacement
        const customizedContent = payload.content
          .replace(/{{firstName}}/g, user.firstName || '')
          .replace(/{{lastName}}/g, user.lastName || '')
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
        results.push({ email: user.email, status: 'SUCCESS' })
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
    return results
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
}
