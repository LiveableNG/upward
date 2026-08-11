import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

interface VerifyOffice365Dto {
  clientId: string
  clientSecret: string
  secretChanged: boolean
  secretExpires: string
  tenantId: string
  userObjectId: string
}

@Injectable()
export class VerifyPmOffice365ConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, dto: VerifyOffice365Dto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })

    if (!pm) throw new BadRequestException('Property manager not found')

    let secret = dto.clientSecret
    if (!dto.secretChanged) {
      if (!pm.emailSetting || !pm.emailSetting.office365Config) {
        throw new BadRequestException('No Office365 configuration found')
      }
      const existingConfig = pm.emailSetting.office365Config as any
      secret = existingConfig.clientSecret
    }

    try {
      // Exchange for token with Microsoft
      const params = new URLSearchParams()
      params.append('client_id', dto.clientId)
      params.append('scope', 'https://graph.microsoft.com/.default')
      params.append('client_secret', secret)
      params.append('grant_type', 'client_credentials')

      const response = await fetch(
        `https://login.microsoftonline.com/${dto.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new BadRequestException(
          `Microsoft authentication failed: ${result.error_description || 'Unknown error'}`
        )
      }

      // Save credentials in database
      await this.prisma.upward_pm_email_setting.upsert({
        where: { pmId: pm.id },
        create: {
          pmId: pm.id,
          provider: 'office365',
          office365Config: {
            applicationId: dto.clientId,
            directoryId: dto.tenantId,
            clientSecret: secret,
            userObjectId: dto.userObjectId,
          },
          office365SecretExpiresAt: new Date(dto.secretExpires),
        },
        update: {
          provider: 'office365',
          office365Config: {
            applicationId: dto.clientId,
            directoryId: dto.tenantId,
            clientSecret: secret,
            userObjectId: dto.userObjectId,
          },
          office365SecretExpiresAt: new Date(dto.secretExpires),
        },
      })

      return { verified: true, message: 'Office365 configuration verified successfully' }
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Microsoft connection failed')
    }
  }
}
