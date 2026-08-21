import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'
import { SmsService } from '../../../shared/infrastructure/sms/sms.service'
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service'

export interface SubmitLandlordEarlyAccessCommand {
  name: string
  whatsapp: string
  email?: string
  city: string
  propertyCount: string
  landlordStatus: string
  managementStyle: string
}

@Injectable()
export class SubmitLandlordEarlyAccessUseCase {
  private readonly logger = new Logger(SubmitLandlordEarlyAccessUseCase.name)

  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async execute(command: SubmitLandlordEarlyAccessCommand): Promise<EarlyAccessEntry> {
    const entry = EarlyAccessEntry.create({
      type: 'LANDLORD',
      name: command.name,
      whatsapp: command.whatsapp,
      email: command.email,
      city: command.city,
      propertyCount: command.propertyCount,
      landlordStatus: command.landlordStatus,
      managementStyle: command.managementStyle,
    })

    const saved = await this.earlyAccessRepo.save(entry)

    const firstName = command.name.trim().split(' ')[0] || 'Landlord'

    if (command.whatsapp) {
      try {
        await this.whatsappService.sendMessage({
          to: command.whatsapp,
          template: {
            name: 'upward_university_waitlist',
            languageCode: 'en_US',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: firstName },
                ],
              },
            ],
          },
        })
      } catch (err) {
        this.logger.error(`Failed to send WhatsApp template to landlord ${command.whatsapp}`, err)
      }

      try {
        const smsMessage = `Hi ${firstName}, welcome to the Upward Landlord Waitlist! Your spot is reserved. We'll send updates on WhatsApp shortly.`

        await this.smsService.sendSms({
          to: command.whatsapp,
          message: smsMessage,
        })
      } catch (err) {
        this.logger.error(`Failed to send SMS message to landlord ${command.whatsapp}`, err)
      }
    }

    try {
      const adminMessage = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #0d4d2b; margin-bottom: 12px;">New Landlord Programme Registration</h3>
          <p>A new landlord has registered for the <strong>Upward Landlord Programme</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email || 'None'}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Landlord Status:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.landlordStatus}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Property Count:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.propertyCount}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Management:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.managementStyle}</td></tr>
          </table>
        </div>
      `
      await this.emailService.sendSystemAlertToAdmins(
        `🏠 New Landlord Registration: ${command.name} (${command.city})`,
        adminMessage,
      )
    } catch (err) {
      this.logger.error('Failed to send landlord early access admin system alert', err)
    }

    return saved
  }
}
