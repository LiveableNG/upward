import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'

interface VerifyOauthDto {
  clientId: string
  clientSecret: string
  secretChanged: boolean
  code: string
  state: string
  redirectUrl: string
  provider: 'gmail-oauth' | 'zoho-oauth'
}

@Injectable()
export class VerifyPmOauthConfigUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string, dto: VerifyOauthDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })

    if (!pm) throw new BadRequestException('Property manager not found')

    let secret = dto.clientSecret
    if (!dto.secretChanged) {
      if (!pm.emailSetting) {
        throw new BadRequestException('No email configuration found')
      }
      const existingConfig =
        dto.provider === 'gmail-oauth'
          ? (pm.emailSetting.gmailOauthConfig as any)
          : (pm.emailSetting.zohoConfig as any)

      if (!existingConfig || !existingConfig.clientSecret) {
        throw new BadRequestException('Stored credentials not found')
      }
      secret = existingConfig.clientSecret
    }

    let tokenUrl = 'https://oauth2.googleapis.com/token'
    if (dto.provider === 'zoho-oauth') {
      tokenUrl = 'https://accounts.zoho.com/oauth/v2/token'
    }

    try {
      const params = new URLSearchParams()
      params.append('client_id', dto.clientId)
      params.append('client_secret', secret)
      params.append('code', dto.code)
      params.append('grant_type', 'authorization_code')
      params.append('redirect_uri', dto.redirectUrl)

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })

      const tokenData = await response.json()

      if (!response.ok || tokenData.error) {
        throw new BadRequestException(
          `OAuth Token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`
        )
      }

      if (dto.provider === 'gmail-oauth') {
        await this.prisma.upward_pm_email_setting.upsert({
          where: { pmId: pm.id },
          create: {
            pmId: pm.id,
            provider: 'gmail-oauth',
            domain: 'gmail.com',
            gmailOauthConfig: {
              clientId: dto.clientId,
              clientSecret: secret,
              refreshToken: tokenData.refresh_token || null,
            },
          },
          update: {
            provider: 'gmail-oauth',
            domain: 'gmail.com',
            gmailOauthConfig: {
              clientId: dto.clientId,
              clientSecret: secret,
              refreshToken: tokenData.refresh_token || null,
            },
          },
        })
      } else {
        // Zoho OAuth: retrieve accounts information to get account_id
        let accountId = null
        if (tokenData.access_token) {
          try {
            const zohoProfileResponse = await fetch('https://mail.zoho.com/api/accounts', {
              headers: { Authorization: `Zoho-oauthtoken ${tokenData.access_token}` },
            })
            const profileData = await zohoProfileResponse.json()
            if (profileData.data && profileData.data[0]) {
              accountId = profileData.data[0].accountId
            }
          } catch (profileErr) {
            // Log or ignore profile lookup failure
          }
        }

        await this.prisma.upward_pm_email_setting.upsert({
          where: { pmId: pm.id },
          create: {
            pmId: pm.id,
            provider: 'zoho-oauth',
            zohoConfig: {
              clientId: dto.clientId,
              clientSecret: secret,
              refreshToken: tokenData.refresh_token || null,
              accessToken: tokenData.access_token || null,
              accountId,
              tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
            },
          },
          update: {
            provider: 'zoho-oauth',
            zohoConfig: {
              clientId: dto.clientId,
              clientSecret: secret,
              refreshToken: tokenData.refresh_token || null,
              accessToken: tokenData.access_token || null,
              accountId,
              tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
            },
          },
        })
      }

      return { verified: true, message: 'OAuth credentials verified successfully' }
    } catch (err: any) {
      throw new BadRequestException(err.message || 'OAuth validation failed')
    }
  }
}
