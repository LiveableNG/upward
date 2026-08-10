import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class CreatePmEmailDomainUseCase {
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

    await this.prisma.upward_pm_email_setting.update({
      where: { pmId: pm.id },
      data: { domain: domainName, isVerified: false },
    })

    try {
      const checkUrl = `https://api.mailgun.net/v4/domains/${domainName}`
      const checkRes = await fetch(checkUrl, {
        method: 'GET',
        headers: this.getMailgunHeaders(),
      })

      if (checkRes.ok) {
        const domainData = await checkRes.json()
        return this.formatDomainResponse(domainData)
      }

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
}
