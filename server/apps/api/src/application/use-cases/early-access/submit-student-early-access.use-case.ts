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
          <p><strong>Welcome to the Upward University Waitlist!</strong></p>
          <p>Thank you for signing up and taking the first step toward building a ₦10M+ property management business.</p>
          <p>Upward helps responsible tenants build a verifiable rental reputation by tracking rent payments and other relevant rental information. This can help tenants access benefits such as rent financing, rewards, discounts, and exclusive homes.</p>
          <p>For landlords and property managers, Upward provides reliable tenant information, including tenant verification, rental history, payment behaviour, and Tenant Scores to help them make smarter rental decisions.</p>
          <p>We have a record of supported reputable firms, including <strong>Diya Fatimilehin & Co.</strong>, <strong>Estatelinks</strong>, and many others, with their property management operations.</p>
          <p>We’re excited to have you on the waitlist. Stay tuned as we share more information about the programme, what to expect, and how you can begin your journey toward building a ₦10M+ property management business.</p>
          <p><strong>Welcome to Upward University.</strong></p>
          <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: 'Welcome to the Upward University Waitlist',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'UNIVERSITY',
          buttonText: 'Explore Upward University',
          buttonUrl: 'https://upward.goodtenants.io/university',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: "You're on the list — here's what happens next",
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
