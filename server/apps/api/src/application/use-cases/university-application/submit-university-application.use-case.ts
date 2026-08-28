import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import { UniversityApplication } from '../../../domains/university-application/university-application.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'

export interface SubmitUniversityApplicationCommand {
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  occupation?: string
  experienceLevel?: string
  goals?: string
  commitment: string
  why: string
  timing?: string
}

@Injectable()
export class SubmitUniversityApplicationUseCase {
  private readonly logger = new Logger(SubmitUniversityApplicationUseCase.name)

  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SubmitUniversityApplicationCommand): Promise<UniversityApplication> {
    const application = UniversityApplication.create({
      name: command.name,
      whatsapp: command.whatsapp,
      email: command.email,
      city: command.city,
      ageBracket: command.ageBracket,
      occupation: command.occupation,
      experienceLevel: command.experienceLevel,
      goals: command.goals,
      commitment: command.commitment,
      why: command.why,
      timing: command.timing,
    })

    const saved = await this.applicationRepo.save(application)

    // 1. Send applicant confirmation email
    if (command.email) {
      try {
        const firstName = command.name.trim().split(' ')[0] || 'there'
        const contentHtml = `
          <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
          <p><strong>Your Upward University Application has been received!</strong></p>
          <p>Thank you for submitting your detailed application for the <strong>Founding Cohort 2026</strong>.</p>
          <p>Our admissions team is reviewing your profile and responses. We will contact you via WhatsApp and email with admission decisions and next steps regarding the ₦5,000 application fee credit/payment.</p>
          <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward University Admissions Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: 'Upward University Application Received',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'UNIVERSITY',
          buttonText: 'Explore Upward University',
          buttonUrl: 'https://upward.goodtenants.io/university',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: 'Application Received — Upward University Cohort 2026',
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send application confirmation email to ${command.email}`, err)
      }
    }

    // 2. Send Admin System Notification
    try {
      const adminMessage = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #8A4A2A; margin-bottom: 12px;">New Upward University Application</h3>
          <p>A new applicant has submitted a full application for the <strong>Founding Cohort 2026</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Age Bracket:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.ageBracket}</td></tr>
            ${command.occupation ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Occupation:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.occupation}</td></tr>` : ''}
            ${command.experienceLevel ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Experience:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.experienceLevel}</td></tr>` : ''}
            ${command.goals ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Goals:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.goals}</td></tr>` : ''}
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Commitment:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.commitment}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Why Join:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.why}</td></tr>
            ${command.timing ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Timing:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.timing}</td></tr>` : ''}
          </table>
        </div>
      `
      await this.emailService.sendSystemAlertToAdmins(
        `🎓 New University Application: ${command.name} (${command.city})`,
        adminMessage,
      )
    } catch (err) {
      this.logger.error('Failed to send university application admin alert', err)
    }

    return saved
  }
}
