import { Injectable, ConflictException, Logger } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EmailService } from '@shared/infrastructure/email/email.service'
import { AdminLogService } from '@shared/infrastructure/admin-log/admin-log.service'
import { AdminRole } from '@upward/shared-types'
import * as bcrypt from 'bcrypt'

@Injectable()
export class CreateAdminUseCase {
  private readonly logger = new Logger(CreateAdminUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly adminLogService: AdminLogService,
  ) {}

  async execute(
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

    if (requesterId) {
      await this.adminLogService.logAction(
        requesterId,
        'ADD_ADMIN',
        `Added new admin: ${email} (${role})`,
      )
    }

    return admin
  }
}
