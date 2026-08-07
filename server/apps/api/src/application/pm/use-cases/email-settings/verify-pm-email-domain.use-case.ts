import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class VerifyPmEmailDomainUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getMailgunHeaders() {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY') || ''
    const base64ApiKey = Buffer.from(`api:${apiKey}`).toString('base64')
    return {
      Authorization: `Basic ${base64ApiKey}`,
    }
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

  async execute(pmUuid: string, domain: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
    })
    if (!pm) throw new BadRequestException('Property manager not found')

    const domainName = domain.trim().toLowerCase()

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
}
