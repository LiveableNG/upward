import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'

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

    // 1. Send applicant confirmation email
    if (command.email) {
      try {
        const firstName = command.name.trim().split(' ')[0] || 'Landlord'
        const contentHtml = `
          <p style="margin-top: 0;">Dear <strong>${firstName}</strong>,</p>
          <p>Thank you for registering for the <strong>Upward Landlord Micro-Course & Management Programme</strong> in <strong>${command.city}</strong>.</p>
          <div style="background-color: #fdfcfb; border-left: 4px solid #0d4d2b; padding: 16px 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #e8e6e1;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #0d4d2b;">Your Registration Summary:</p>
            <ul style="margin: 0; padding-left: 20px; color: #334155;">
              <li><strong>Status:</strong> ${command.landlordStatus}</li>
              <li><strong>Property Portfolio:</strong> ${command.propertyCount} properties</li>
              <li><strong>Management Style:</strong> ${command.managementStyle}</li>
              <li><strong>City:</strong> ${command.city}</li>
            </ul>
          </div>
          <p>Your micro-course lessons will be delivered directly to your WhatsApp inbox (<code>${command.whatsapp}</code>). You will learn how to optimize rental yields, assure consistent tenant payments, and leverage Upward Certified property managers.</p>
          <p style="margin-bottom: 0;">Sincerely,<br><strong>The Upward Landlord Programme Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'LANDLORD',
          title: 'Welcome to the Upward Landlord Programme',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'LANDLORD PROGRAMME',
          buttonText: 'View Landlord Programme Details',
          buttonUrl: 'https://upward.goodtenants.io/university/landlord',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: 'Upward Landlord Programme – Early Access Confirmed 🏠',
          html,
          type: 'LANDLORD_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send landlord early access email to ${command.email}`, err)
      }
    }

    // 2. Send Admin System Notification
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
