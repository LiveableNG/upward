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
  commitment?: string
  why?: string
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
        commitment: command.commitment ?? existingProps.commitment ?? 'Pending (Stage 1 Completed)',
        why: command.why ?? existingProps.why ?? 'Pending (Stage 1 Completed)',
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
        experienceLevel: command.experienceLevel ?? 'Stage 1 Completed',
        goals: command.goals,
        commitment: command.commitment ?? 'Pending (Stage 1 Completed)',
        why: command.why ?? 'Pending (Stage 1 Completed)',
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



    return {
      application: saved,
      isAlreadyPaid,
      isExisting,
    }
  }
}
