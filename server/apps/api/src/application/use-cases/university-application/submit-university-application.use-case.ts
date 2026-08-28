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
  isScholarship?: boolean
  scholarshipVideoUrl?: string
  feeStatus?: string
  paymentRef?: string
  sendEmail?: boolean
}

export interface SubmitUniversityApplicationResult {
  application: UniversityApplication
  isAlreadyPaid: boolean
  isExisting: boolean
}

@Injectable()
export class SubmitUniversityApplicationUseCase {
  private readonly logger = new Logger(SubmitUniversityApplicationUseCase.name)

  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SubmitUniversityApplicationCommand): Promise<SubmitUniversityApplicationResult> {
    const existing = await this.applicationRepo.findByEmail(command.email.trim().toLowerCase())
    
    let application: UniversityApplication
    let isAlreadyPaid = false
    let isExisting = false

    if (existing) {
      isExisting = true
      const existingProps = existing.toObject()
      
      // If user already paid, preserve PAID fee status and existing ID
      if (existingProps.feeStatus === 'PAID') {
        isAlreadyPaid = true
      }

      const newFeeStatus = isAlreadyPaid ? 'PAID' : ((command.feeStatus as any) || existingProps.feeStatus || 'PENDING')
      const newPaymentRef = command.paymentRef || existingProps.paymentRef || null

      application = UniversityApplication.restore({
        ...existingProps,
        name: command.name,
        whatsapp: command.whatsapp,
        city: command.city,
        ageBracket: command.ageBracket,
        occupation: command.occupation ?? existingProps.occupation,
        experienceLevel: command.experienceLevel ?? existingProps.experienceLevel,
        goals: command.goals ?? existingProps.goals,
        commitment: command.commitment,
        why: command.why,
        timing: command.timing ?? existingProps.timing,
        isScholarship: command.isScholarship ?? existingProps.isScholarship,
        scholarshipVideoUrl: command.scholarshipVideoUrl ?? existingProps.scholarshipVideoUrl,
        feeStatus: newFeeStatus,
        paymentRef: newPaymentRef,
        updatedAt: new Date(),
      })
    } else {
      application = UniversityApplication.create({
        name: command.name,
        whatsapp: command.whatsapp,
        email: command.email.trim().toLowerCase(),
        city: command.city,
        ageBracket: command.ageBracket,
        occupation: command.occupation,
        experienceLevel: command.experienceLevel,
        goals: command.goals,
        commitment: command.commitment,
        why: command.why,
        timing: command.timing,
        isScholarship: command.isScholarship,
        scholarshipVideoUrl: command.scholarshipVideoUrl,
        feeStatus: (command.feeStatus as any) || 'PENDING',
        paymentRef: command.paymentRef || null,
      })
      isAlreadyPaid = command.feeStatus === 'PAID'
    }

    const saved = await this.applicationRepo.save(application)

    // Send single email ONLY when explicitly requested (e.g. on checkout exit or payment completion)
    const shouldSendEmail = command.sendEmail === true || command.feeStatus === 'PAID'

    if (command.email && shouldSendEmail) {
      try {
        const firstName = command.name.trim().split(' ')[0] || 'there'
        const isPaidNow = saved.feeStatus === 'PAID'
        
        let contentHtml = ''
        let subjectText = ''
        let buttonText = ''
        let buttonUrl = ''

        if (isPaidNow) {
          subjectText = 'Application & Fee Confirmed — Upward University Cohort 2026'
          buttonText = 'Explore Upward University'
          buttonUrl = 'https://upward.goodtenants.io/university'
          contentHtml = `
            <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
            <p><strong>Thank you! Your Upward University Application & ₦5,000 Fee Payment have been received.</strong></p>
            <p>Your spot for the <strong>Founding Cohort 2026</strong> is now safely logged with our admissions team.</p>
            <p>Our admissions committee will review your responses and reach out via WhatsApp and email with your cohort orientation details and next steps.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward University Admissions Team</strong></p>
          `
        } else {
          subjectText = 'Complete Your ₦5,000 Application Payment — Upward University'
          buttonText = 'Complete ₦5,000 Payment →'
          buttonUrl = `https://upward.goodtenants.io/university/apply?email=${encodeURIComponent(command.email)}`
          contentHtml = `
            <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
            <p><strong>Your Upward University Application Profile Has Been Saved!</strong></p>
            <p>Thank you for starting your application for the <strong>Founding Cohort 2026</strong>.</p>
            <p>To complete your application for admissions review, please complete your ₦5,000 application fee payment below. (Note: The fee is credited toward your programme tuition if admitted, and fully refunded if you do not qualify).</p>
            <p>Click the button below anytime to reopen your application checkout and finish your payment.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward University Admissions Team</strong></p>
          `
        }

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: isPaidNow ? 'Application & Fee Payment Received' : 'Complete Your Application Payment',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'UNIVERSITY',
          buttonText,
          buttonUrl,
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: subjectText,
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send application email to ${command.email}`, err)
      }
    }

    // Admin System Alert
    try {
      const adminMessage = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #8A4A2A; margin-bottom: 12px;">Upward University Application ${isExisting ? 'Updated' : 'Submitted'}</h3>
          <p>Status: <strong>${saved.feeStatus === 'PAID' ? 'PAID (₦5,000 Verified)' : 'PENDING PAYMENT'}</strong></p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Fee Status:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee; color: ${saved.feeStatus === 'PAID' ? 'green' : 'orange'}; font-weight: bold;">${saved.feeStatus || 'PENDING'}</td></tr>
          </table>
        </div>
      `
      await this.emailService.sendSystemAlertToAdmins(
        `🎓 University Application ${isExisting ? 'Updated' : 'Submitted'}: ${command.name} (${saved.feeStatus === 'PAID' ? 'PAID' : 'PENDING'})`,
        adminMessage,
      )
    } catch (err) {
      this.logger.error('Failed to send university application admin alert', err)
    }

    return {
      application: saved,
      isAlreadyPaid,
      isExisting,
    }
  }
}
