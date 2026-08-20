import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'

export interface SubmitStudentEarlyAccessCommand {
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  experienceLevel: string
  interest?: string
}

@Injectable()
export class SubmitStudentEarlyAccessUseCase {
  private readonly logger = new Logger(SubmitStudentEarlyAccessUseCase.name)

  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SubmitStudentEarlyAccessCommand): Promise<EarlyAccessEntry> {
    const entry = EarlyAccessEntry.create({
      type: 'STUDENT',
      name: command.name,
      whatsapp: command.whatsapp,
      email: command.email,
      city: command.city,
      ageBracket: command.ageBracket,
      experienceLevel: command.experienceLevel,
      interest: command.interest,
    })

    const saved = await this.earlyAccessRepo.save(entry)

    // 1. Send applicant confirmation email
    if (command.email) {
      try {
        const firstName = command.name.trim().split(' ')[0] || 'there'
        const contentHtml = `
          <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
          <p>Thank you for registering for early access to the <strong>Upward University Founding Cohort 2026</strong> in <strong>${command.city}</strong>.</p>
          <div style="background-color: #f9fafb; border-left: 4px solid #d97757; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Cohort Application Highlights:</p>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li><strong>Track:</strong> Property Management + Real Estate Brokerage (Dual Specialization)</li>
              <li><strong>City:</strong> ${command.city} (Hybrid Practical Onsite Training)</li>
              <li><strong>Applications Open:</strong> August 28, 2026</li>
            </ul>
          </div>
          <p>We have reserved a priority position for you in the <strong>${command.city}</strong> cohort. As soon as applications go live on August 28, we will send direct notifications to your WhatsApp (<code>${command.whatsapp}</code>) and this email address.</p>
          <p style="margin-bottom: 0;">Warm regards,<br><strong>The Upward University Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: "You're on the Early Access List for Upward University",
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'UNIVERSITY',
          buttonText: 'Explore Upward University',
          buttonUrl: 'https://upward.goodtenants.io/university',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: 'Welcome to Upward University – Early Access Confirmed 🚀',
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send student early access email to ${command.email}`, err)
      }
    }

    // 2. Send Admin System Notification
    try {
      const adminMessage = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #d97757; margin-bottom: 12px;">New Student Early Access Application</h3>
          <p>A new student applicant has just joined the <strong>Upward University Founding Cohort 2026</strong> early access list.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email || 'None'}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Age Bracket:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.ageBracket}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Experience:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.experienceLevel}</td></tr>
            ${command.interest ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Interest:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.interest}</td></tr>` : ''}
          </table>
        </div>
      `
      await this.emailService.sendSystemAlertToAdmins(
        `🎓 New Student Early Access: ${command.name} (${command.city})`,
        adminMessage,
      )
    } catch (err) {
      this.logger.error('Failed to send student early access admin system alert', err)
    }

    return saved
  }
}
