import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'
import { EmailService } from '../../../shared/infrastructure/email/email.service'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/email-settings')
@UseGuards(JwtAuthGuard)
export class PmEmailSettingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
  ) {}

  private getMailgunHeaders() {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY') || ''
    const base64ApiKey = Buffer.from(`api:${apiKey}`).toString('base64')
    return {
      Authorization: `Basic ${base64ApiKey}`,
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(@Req() req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
      include: { emailSetting: true },
    })

    if (!pm) throw new UnauthorizedException('Property manager not found')

    return pm.emailSetting || null
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async saveConfig(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })

    if (!pm) throw new UnauthorizedException('Property manager not found')

    const data = {
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      logoUrl: body.logoUrl || null,
      footerAddress: body.footerAddress || null,
      cc: body.cc || null,
      bcc: body.bcc || null,
      closingStatement: body.closingStatement || null,
    }

    const settings = await this.prisma.upward_pm_email_setting.upsert({
      where: { pmId: pm.id },
      create: {
        pmId: pm.id,
        ...data,
      },
      update: data,
    })

    return settings
  }

  @Post('logo-upload')
  @HttpCode(HttpStatus.OK)
  async uploadLogo(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    if (!body.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for logo')
    }

    const buffer = Buffer.from(body.base64Data, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = body.contentType.split('/')[1] || 'png'
    const key = `pm/${pm.uuid}/email-settings/logo_${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, body.contentType)

    return { publicUrl }
  }

  @Post('domain')
  @HttpCode(HttpStatus.OK)
  async createDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const domainName = body.domain.trim().toLowerCase()

    // 1. Update DB with domain
    await this.prisma.upward_pm_email_setting.update({
      where: { pmId: pm.id },
      data: { domain: domainName, isVerified: false },
    })

    // 2. Register or fetch from Mailgun
    try {
      // Check if already exists in Mailgun
      const checkUrl = `https://api.mailgun.net/v4/domains/${domainName}`
      const checkRes = await fetch(checkUrl, {
        method: 'GET',
        headers: this.getMailgunHeaders(),
      })

      if (checkRes.ok) {
        const domainData = await checkRes.json()
        return this.formatDomainResponse(domainData)
      }

      // Create new domain in Mailgun
      const createUrl = 'https://api.mailgun.net/v4/domains'
      const formData = new URLSearchParams()
      formData.append('name', domainName)

      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          ...this.getMailgunHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!createRes.ok) {
        const errText = await createRes.text()
        throw new BadRequestException(`Failed to register domain on Mailgun: ${errText}`)
      }

      const domainData = await createRes.json()
      return this.formatDomainResponse(domainData)
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error configuring domain on Mailgun')
    }
  }

  @Post('verify-domain')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')

    const domainName = body.domain.trim().toLowerCase()

    try {
      const verifyUrl = `https://api.mailgun.net/v4/domains/${domainName}/verify`
      const verifyRes = await fetch(verifyUrl, {
        method: 'PUT',
        headers: this.getMailgunHeaders(),
      })

      if (!verifyRes.ok) {
        const errText = await verifyRes.text()
        throw new BadRequestException(`Verification failed: ${errText}`)
      }

      const verifyData = await verifyRes.json()
      const isVerified = verifyData.domain?.state === 'active'

      if (isVerified) {
        await this.prisma.upward_pm_email_setting.update({
          where: { pmId: pm.id },
          data: { isVerified: true },
        })
      }

      return this.formatDomainResponse(verifyData)
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error verifying domain on Mailgun')
    }
  }

  @Post('send-test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Req() req: FastifyRequest, @Body() body: { email: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
      include: { emailSetting: true },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')
    if (!pm.emailSetting) throw new BadRequestException('Email settings not configured yet')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 32px; margin: 0;">
          <div class="footer" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 32px;">
            <h1 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 16px;">Test Email Configuration</h1>
            <p style="font-size: 14px; line-height: 24px; color: #374151;">
              This is a test email sent from your newly configured email settings on Upward. Your sender details, custom domain, branding, and closing signatures are configured correctly!
            </p>
          </div>
        </body>
      </html>
    `

    const result = await this.emailService.sendEmailWithRetry({
      userId: pm.uuid,
      pmUuid: pm.uuid,
      email: body.email,
      subject: `Test Email from ${pm.emailSetting.senderName}`,
      html: emailHtml,
      type: 'TEST_EMAIL',
    })

    if (!result.success) {
      throw new BadRequestException(result.error || 'Failed to send test email')
    }

    return { message: 'Test email sent successfully' }
  }

  private formatDomainResponse(data: any) {
    const domain = data.domain || {}
    const sendingDnsRecords = data.sending_dns_records || []

    return {
      id: domain.id,
      name: domain.name,
      state: domain.state,
      sending_dns_records: sendingDnsRecords.map((record: any) => ({
        name: record.name,
        record_type: record.record_type,
        value: record.value,
        status: record.cached && record.cached.length > 0 && record.value === record.cached[0],
      })),
    }
  }
}
