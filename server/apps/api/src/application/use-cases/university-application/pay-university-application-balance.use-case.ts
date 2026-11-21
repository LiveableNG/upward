import { BadRequestException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import { UniversityApplication } from '../../../domains/university-application/university-application.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'

export interface PayUniversityApplicationBalanceCommand {
  paymentRef?: string
  email?: string
  balancePaymentRef: string
  amountPaid: number
}

export interface PayUniversityApplicationBalanceResult {
  id: string
  email: string
  name: string
  track: string
  balancePaymentRef: string
  amountPaid: number
  isFullyCleared: boolean
}

@Injectable()
export class PayUniversityApplicationBalanceUseCase {
  private readonly logger = new Logger(PayUniversityApplicationBalanceUseCase.name)

  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(
    command: PayUniversityApplicationBalanceCommand,
  ): Promise<PayUniversityApplicationBalanceResult> {
    const balanceRef = (command.balancePaymentRef || '').trim()
    const amount = command.amountPaid || 80000

    if (!balanceRef) {
      throw new BadRequestException('Balance payment reference is required')
    }

    let application: UniversityApplication | null = null

    if (command.paymentRef && command.paymentRef.trim().length > 0) {
      application = await this.applicationRepo.findByPaymentRef(command.paymentRef.trim())
    }

    if (!application && command.email && command.email.trim().length > 0) {
      application = await this.applicationRepo.findByEmail(command.email.trim().toLowerCase())
    }

    if (!application) {
      throw new NotFoundException('Application not found by payment reference or email')
    }

    const existingProps = application.toObject()
    const currentNotes = existingProps.notes || ''
    const trackName = existingProps.track || 'Track C - Practical Experience'

    // Prevent double counting if already cleared
    if (currentNotes.includes('FULLY CLEARED')) {
      return {
        id: existingProps.id || '',
        email: existingProps.email,
        name: existingProps.name,
        track: trackName,
        balancePaymentRef: balanceRef,
        amountPaid: amount,
        isFullyCleared: true,
      }
    }

    // Safeguard: If initial deposit has not been marked PAID yet, treat this payment as the initial deposit rather than balance clearance
    if (existingProps.feeStatus !== 'PAID') {
      const initialPaid = UniversityApplication.restore({
        ...existingProps,
        feeStatus: 'PAID',
        status: existingProps.status === 'SUBMITTED' ? 'FEE_PAID' : existingProps.status,
        paymentRef: existingProps.paymentRef || balanceRef,
        updatedAt: new Date(),
      })
      const savedInitial = await this.applicationRepo.save(initialPaid)
      return {
        id: savedInitial.id || '',
        email: savedInitial.email,
        name: savedInitial.name,
        track: trackName,
        balancePaymentRef: balanceRef,
        amountPaid: amount,
        isFullyCleared: false,
      }
    }

    const balanceNote = `[Balance Paid: ₦${amount.toLocaleString()} via ref ${balanceRef}] [Tuition Status: FULLY CLEARED]`
    const updatedNotes = `${currentNotes} ${balanceNote}`.trim()

    const updated = UniversityApplication.restore({
      ...existingProps,
      feeStatus: 'PAID',
      status: existingProps.status === 'SUBMITTED' ? 'FEE_PAID' : existingProps.status,
      notes: updatedNotes,
      updatedAt: new Date(),
    })

    const saved = await this.applicationRepo.save(updated)

    // Send Balance Cleared Confirmation Email
    if (existingProps.email) {
      try {
        const firstName = existingProps.name.trim().split(' ')[0] || 'there'
        const videoSubmitUrl = existingProps.paymentRef
          ? `https://upward.goodtenants.io/academy/thank-you?ref=${encodeURIComponent(existingProps.paymentRef)}`
          : 'https://upward.goodtenants.io/academy'

        const contentHtml = `
          <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
          <p><strong>Congratulations! Your remaining balance of ₦${amount.toLocaleString()} for ${trackName} has been successfully received and verified.</strong></p>
          <p>Your tuition is now <strong>FULLY CLEARED</strong> for the Founding Cohort 2026!</p>
          <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 12px 14px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13.5px; color: #166534;"><strong>Track:</strong> ${trackName}</p>
            <p style="margin: 4px 0 0 0; font-size: 13.5px; color: #166534;"><strong>Tuition Status:</strong> FULLY CLEARED</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;"><strong>Balance Payment Reference:</strong> ${balanceRef}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;"><strong>Cohort Kickoff:</strong> Saturday, December 5, 2026</p>
          </div>
          <p><strong>Next Step — Submit Your Intro Video:</strong> If you haven't yet submitted your short 1–2 minute intro video, please submit it using the button below.</p>
          <p>Our admissions team will reach out via WhatsApp with your orientation schedule and curriculum access before classes commence.</p>
          <p style="margin-bottom: 0;">Warm regards,<br><strong>The Upward Academy Admissions Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: 'Tuition Balance Cleared — Upward Academy',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'ACADEMY',
          buttonText: 'Submit Your Intro Video →',
          buttonUrl: videoSubmitUrl,
        })

        await this.emailService.sendEmailWithRetry({
          email: existingProps.email,
          subject: 'Tuition Balance Cleared — Upward Academy Founding Cohort 2026',
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send balance cleared email to ${existingProps.email}`, err)
      }
    }

    return {
      id: saved.id || existingProps.id || '',
      email: existingProps.email,
      name: existingProps.name,
      track: existingProps.track || 'Track C - Practical Experience',
      balancePaymentRef: balanceRef,
      amountPaid: amount,
      isFullyCleared: true,
    }
  }
}
