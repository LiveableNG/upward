import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import * as nodemailer from 'nodemailer'

interface VerifyGmailDto {
  email: string
  password: string
  passwordChanged: boolean
  provider: string // 'gmail' | 'zoho-smtp' | 'yahoo-smtp'
}

@Injectable()
export class VerifyPmGmailConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, dto: VerifyGmailDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })

    if (!pm) throw new BadRequestException('Property manager not found')

    let password = dto.password
    if (!dto.passwordChanged) {
      if (!pm.emailSetting || !pm.emailSetting.smtpPassword) {
        throw new BadRequestException('No stored SMTP configuration found')
      }
      password = pm.emailSetting.smtpPassword
    }

    let host = 'smtp.gmail.com'
    let port = 587
    let secure = false

    if (dto.provider === 'zoho-smtp') {
      host = 'smtp.zoho.com'
      port = 465
      secure = true
    } else if (dto.provider === 'yahoo-smtp') {
      host = 'smtp.mail.yahoo.com'
      port = 465
      secure = true
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: dto.email,
          pass: password,
        },
      })

      // Run verification check
      await transporter.verify()

      // Save credentials in database
      await this.prisma.upward_pm_email_setting.upsert({
        where: { pmId: pm.id },
        create: {
          pmId: pm.id,
          provider: dto.provider,
          smtpEmail: dto.email,
          smtpPassword: password,
          isVerified: true,
        },
        update: {
          provider: dto.provider,
          smtpEmail: dto.email,
          smtpPassword: password,
          isVerified: true,
        },
      })

      return { verified: true, message: 'SMTP configuration verified successfully' }
    } catch (err: any) {
      throw new BadRequestException(
        `SMTP connection failed: ${err.message || 'Check your email and app password settings.'}`
      )
    }
  }
}
