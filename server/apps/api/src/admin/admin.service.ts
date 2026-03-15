import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { CreateWaitlistEntryDto } from '@upward/shared-types'

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getAllUsers() {
    return this.prisma.upward_waitlist.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        attendances: true,
        emailLogs: true,
      },
    })
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

  async deleteUser(id: string) {
    return this.prisma.upward_waitlist.delete({
      where: { id },
    })
  }

  async bulkUpload(users: CreateWaitlistEntryDto[]) {
    const results = []
    for (const user of users) {
      const result = await this.prisma.upward_waitlist.upsert({
        where: { email: user.email },
        update: {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          country: user.country,
          city: user.city,
          selectedSession: user.selectedSession,
        },
        create: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          benefits: user.benefits ?? [],
          country: user.country,
          city: user.city,
          selectedSession: user.selectedSession,
        },
      })
      results.push(result)
    }
    return results
  }

  async getSessions() {
    return this.prisma.upward_session.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        attendances: {
          include: {
            user: true,
          },
        },
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
        await this.emailService.sendGenericEmail(user.email, payload.subject, payload.content)

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
}
