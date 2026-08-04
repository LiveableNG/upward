import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

type HomeRequestLocation = { state: string; area: string; subArea?: string }

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function asLocations(value: unknown): HomeRequestLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const state = typeof record.state === 'string' ? record.state : ''
      const area = typeof record.area === 'string' ? record.area : ''
      if (!state || !area) return null
      const location: HomeRequestLocation = { state, area }
      if (typeof record.subArea === 'string' && record.subArea.trim()) {
        location.subArea = record.subArea
      }
      return location
    })
    .filter((item): item is HomeRequestLocation => item !== null)
}

function formatLocations(locations: HomeRequestLocation[]): string {
  if (locations.length === 0) return 'Any location'
  return locations
    .map((l) => (l.subArea ? `${l.subArea}, ${l.area}, ${l.state}` : `${l.area}, ${l.state}`))
    .join('; ')
}

/**
 * Kernel job (see ScheduleService.defineSchedule -> 'homeRequestDigest', daily 08:00).
 * Sends every PM a shared summary of the previous day's home requests.
 * Deliberately ignores subscription tier / LISTING_BROKERAGE gating for now —
 * that gate lives only in the PM app's list view (contact reveal + row locking).
 */
@Injectable()
export class SendHomeRequestDigestUseCase {
  private readonly logger = new Logger(SendHomeRequestDigestUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute() {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)

    const requests = await this.prisma.upward_home_request.findMany({
      where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
      orderBy: { createdAt: 'asc' },
    })

    if (requests.length === 0) {
      this.logger.log('No home requests submitted yesterday — skipping digest.')
      return
    }

    const managers = await this.prisma.upward_property_manager.findMany()
    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()

    let sent = 0
    for (const pm of managers) {
      const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null
      if (!pmEmail) continue

      const pmFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName) : ''
      const pmLastName = pm.lastName ? this.encryption.decrypt(pm.lastName) : ''
      const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : ''
      const pmName = decryptedBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager'

      await this.unifiedCommService
        .processCommunication({
          recipientEmail: pmEmail,
          recipientName: pmName,
          recipientRole: 'PM',
          pmUuid: pm.uuid,
          type: 'PM_HOME_REQUEST_DIGEST',
          context: {
            htmlOverride: this.buildEmailHtml(requests, pmName, baseUrl),
            title: `[Upward] ${requests.length} New Rent Request${requests.length === 1 ? '' : 's'} Yesterday`,
          },
        })
        .then(() => sent++)
        .catch((err) => {
          this.logger.error(`Failed to send home request digest to PM ${pmEmail}:`, err)
        })
    }

    this.logger.log(`Home request digest: ${requests.length} requests, sent to ${sent}/${managers.length} PMs.`)
  }

  private buildEmailHtml(requests: any[], pmName: string, baseUrl: string): string {
    const rows = requests
      .map((r) => {
        const locations = formatLocations(asLocations(r.locations))
        const propertyTypes = asStringArray(r.propertyType).join(', ') || 'Any type'
        const moveIn = r.moveInDate ? new Date(r.moveInDate).toDateString() : 'Flexible'
        return `
          <tr style="border-bottom: 1px solid #e3e2cf; font-size: 13px;">
            <td style="padding: 10px;">
              <strong style="color: #2f3e35;">${locations}</strong><br/>
              <span style="font-size: 11px; color: #607366;">${propertyTypes} &bull; ${r.beds} bed(s) &bull; Move-in: ${moveIn}</span>
            </td>
            <td style="padding: 10px; text-align: right; font-weight: 700; color: #1b4332;">NGN ${r.budgetMin.toLocaleString()} - ${r.budgetMax.toLocaleString()}</td>
          </tr>
        `
      })
      .join('')

    return `
      <div style="background-color: #fafae6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fffffb; border: 1px solid #e3e2cf; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.05);">
          <div style="background-color: #1b4332; padding: 32px 24px; text-align: center;">
            <h1 style="color: #fffff0; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">New Rent Requests</h1>
            <p style="color: #a3b899; font-size: 14px; margin: 8px 0 0 0;">Upward Property Management</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 16px; color: #2f3e35; margin-top: 0; line-height: 1.5;">Dear <strong>${pmName}</strong>,</p>
            <p style="font-size: 14px; color: #506256; line-height: 1.5; margin-bottom: 24px;">${requests.length} prospective tenant${requests.length === 1 ? '' : 's'} submitted a rent request yesterday. Sign in to view full details and reveal contact info.</p>
            <div style="border: 1px solid #e3e2cf; border-radius: 12px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid #e3e2cf; text-align: left; font-size: 12px; color: #506256; background-color: #fafae6;">
                    <th style="padding: 10px; font-weight: 700;">Request</th>
                    <th style="padding: 10px; font-weight: 700; text-align: right;">Budget</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
            <div style="margin-top: 36px; padding: 20px; background-color: #fafae6; border-radius: 12px; border: 1px solid #e3e2cf; text-align: center;">
              <a href="${baseUrl}/home-requests" style="display: inline-block; background-color: #1b4332; color: #fffff0; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">View Rent Requests</a>
            </div>
            <p style="margin-top: 32px; font-size: 11px; color: #88998e; text-align: center; border-top: 1px solid #e3e2cf; padding-top: 16px;">
              This is an automated digest sent by Upward. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      </div>
    `
  }
}
