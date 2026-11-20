import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import {
  UNIVERSITY_TRAFFIC_REPOSITORY,
  IUniversityTrafficRepository,
} from '../../../domains/university-traffic/university-traffic.repository'
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
  track?: string
  experienceLevel?: string
  goals?: string
  commitment?: string
  why?: string
  timing?: string
  isScholarship?: boolean
  scholarshipVideoUrl?: string
  sessionTime?: string
  sourceIdentifier?: string
  abVariant?: string
  feeStatus?: string
  paymentRef?: string
  paymentPlan?: string
  amountPaid?: number
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
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
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

      const notes = existingProps.notes || ''
      const isDeposit =
        notes.toLowerCase().includes('deposit') ||
        notes.toLowerCase().includes('down payment') ||
        notes.includes('Lock-In') ||
        notes.includes('25,000') ||
        notes.includes('30,000') ||
        notes.includes('50,000') ||
        notes.includes('70,000')
      const isFullyCleared = notes.includes('FULLY CLEARED')

      // Disallow track switching for active deposit holders on new tracks
      // Note: Applicants on legacy Track 1 or Track 2 have not chosen among the 3 new tracks yet and can freely choose.
      const isLegacyTrack = existingProps.track && (existingProps.track.includes('Track 1') || existingProps.track.includes('Track 2'))
      let resolvedTrack = command.track ?? existingProps.track
      if (isDeposit && !isFullyCleared && existingProps.track && !isLegacyTrack) {
        if (command.track && command.track !== existingProps.track) {
          throw new BadRequestException(
            `Track switching is not permitted for active deposit holders. Your active deposit is for ${existingProps.track}. Please complete your tuition balance for this track.`,
          )
        }
        resolvedTrack = existingProps.track
      }

      const newFeeStatus = isAlreadyPaid ? 'PAID' : ((command.feeStatus as any) || existingProps.feeStatus || 'PENDING')
      const newPaymentRef = command.paymentRef || existingProps.paymentRef || null

      const trackNote = resolvedTrack ? `[Track: ${resolvedTrack}]` : ''
      const paymentNote = command.paymentPlan
        ? `[Payment: ${command.paymentPlan}]`
        : command.amountPaid
          ? `[Payment: ₦${command.amountPaid.toLocaleString()}]`
          : ''
      let updatedNotes = existingProps.notes || ''
      if (trackNote && !updatedNotes.includes(trackNote)) {
        updatedNotes = `${trackNote} ${updatedNotes}`.trim()
      }
      if (paymentNote && !updatedNotes.includes(paymentNote)) {
        updatedNotes = `${updatedNotes} ${paymentNote}`.trim()
      }

      const isMaskedPhone = command.whatsapp && (command.whatsapp.includes('•') || command.whatsapp.includes('*'))
      const resolvedWhatsapp = isMaskedPhone && existingProps.whatsapp ? existingProps.whatsapp : command.whatsapp

      application = UniversityApplication.restore({
        ...existingProps,
        name: command.name,
        whatsapp: resolvedWhatsapp,
        city: command.city,
        ageBracket: command.ageBracket,
        occupation: command.occupation ?? existingProps.occupation,
        track: resolvedTrack,
        experienceLevel: command.experienceLevel ?? existingProps.experienceLevel,
        goals: command.goals ?? existingProps.goals,
        commitment: command.commitment ?? existingProps.commitment ?? 'Pending (Stage 1 Completed)',
        why: command.why ?? existingProps.why ?? 'Pending (Stage 1 Completed)',
        timing: command.timing ?? existingProps.timing,
        isScholarship: command.isScholarship ?? existingProps.isScholarship,
        scholarshipVideoUrl: command.scholarshipVideoUrl ?? existingProps.scholarshipVideoUrl,
        sessionTime: command.sessionTime ?? existingProps.sessionTime,
        sourceIdentifier: command.sourceIdentifier ?? existingProps.sourceIdentifier,
        abVariant: command.abVariant ?? existingProps.abVariant ?? 'A',
        feeStatus: newFeeStatus,
        paymentRef: newPaymentRef,
        notes: updatedNotes || null,
        updatedAt: new Date(),
      })
    } else {
      const noteParts: string[] = []
      if (command.track) noteParts.push(`[Track: ${command.track}]`)
      if (command.paymentPlan) {
        noteParts.push(`[Payment: ${command.paymentPlan}]`)
      } else if (command.amountPaid) {
        noteParts.push(`[Payment: ₦${command.amountPaid.toLocaleString()}]`)
      }
      const initialNotes = noteParts.length > 0 ? noteParts.join(' ') : null

      application = UniversityApplication.create({
        name: command.name,
        whatsapp: command.whatsapp,
        email: command.email.trim().toLowerCase(),
        city: command.city,
        ageBracket: command.ageBracket,
        occupation: command.occupation,
        track: command.track,
        experienceLevel: command.experienceLevel ?? (command.track ? `[${command.track}] Stage 1 Completed` : 'Stage 1 Completed'),
        goals: command.goals ?? (command.track ? `Track: ${command.track}` : undefined),
        commitment: command.commitment ?? 'Pending (Stage 1 Completed)',
        why: command.why ?? 'Pending (Stage 1 Completed)',
        timing: command.timing,
        isScholarship: command.isScholarship,
        scholarshipVideoUrl: command.scholarshipVideoUrl,
        sessionTime: command.sessionTime,
        sourceIdentifier: command.sourceIdentifier,
        abVariant: command.abVariant || 'A',
        feeStatus: (command.feeStatus as any) || 'PENDING',
        paymentRef: command.paymentRef || null,
        notes: initialNotes,
      })
      isAlreadyPaid = command.feeStatus === 'PAID'
    }

    const saved = await this.applicationRepo.save(application)

    // Attribution: increment conversion count if sourceIdentifier was provided and it is a new application or first-time attribution
    const isNewAttribution = !existing || !existing.toObject().sourceIdentifier
    if (command.sourceIdentifier && isNewAttribution) {
      this.trafficRepo.incrementConversion(command.sourceIdentifier).catch((err: any) => {
        this.logger.warn(`Failed to increment traffic conversion for ${command.sourceIdentifier}: ${err?.message || err}`)
      })
    }

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

        const sessionInfo =
          saved.sessionTime && saved.sessionTime !== "I don't need an info session"
            ? `<p style="background: #fdf6ec; border-left: 4px solid #8A4A2A; padding: 8px 12px; margin: 14px 0;"><strong>Information &amp; Q&amp;A Session:</strong> ${saved.sessionTime}</p>`
            : ''

        const amountLabel = command.amountPaid
          ? `₦${command.amountPaid.toLocaleString()}`
          : 'Track Fee'
        const paymentPlanLine = command.paymentPlan
          ? `<p style="background: #f0fdf4; border-left: 4px solid #166534; padding: 8px 12px; margin: 14px 0;"><strong>Selected Payment:</strong> ${command.paymentPlan}</p>`
          : ''

        if (isPaidNow) {
          const videoSubmitUrl = saved.paymentRef
            ? `https://upward.goodtenants.io/academy/thank-you?ref=${encodeURIComponent(saved.paymentRef)}`
            : 'https://upward.goodtenants.io/academy'
          
          const isDepositPlan =
            (command.paymentPlan && command.paymentPlan.toLowerCase().includes('lock-in')) ||
            command.amountPaid === 25000

          const balancePayUrl = saved.paymentRef
            ? `https://upward.goodtenants.io/academy/apply?action=balance&ref=${encodeURIComponent(saved.paymentRef)}`
            : `https://upward.goodtenants.io/academy/apply?action=balance&email=${encodeURIComponent(command.email)}`

          const balanceSection = isDepositPlan
            ? `
              <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 14px; margin: 16px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13.5px; color: #9a3412;"><strong>Locked-In Discount:</strong> ₦50,000 Off Track C (Tuition: ₦150,000)</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #9a3412;"><strong>Deposit Paid Today:</strong> ₦25,000 (Verified)</p>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #9a3412;"><strong>Remaining Balance:</strong> ₦125,000 (Due before Dec 5, 2026)</p>
                <p style="margin: 8px 0 0 0; font-size: 12.5px;"><a href="${balancePayUrl}" style="color: #ea580c; font-weight: 700; text-decoration: underline;">Pay Remaining ₦125,000 Balance Anytime →</a></p>
              </div>
            `
            : ''

          subjectText = isDepositPlan
            ? 'Spot Secured (₦25k Deposit Received) — Upward Academy Cohort 2026'
            : 'Payment Confirmed — Upward Academy Cohort 2026'
          buttonText = 'Submit Your Intro Video (Required) →'
          buttonUrl = videoSubmitUrl
          contentHtml = `
            <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
            <p><strong>Thank you! Your Upward Academy registration and ${amountLabel} payment have been received.</strong></p>
            <p>Your spot for the <strong>Founding Cohort 2026 (starting December 5, 2026)</strong> is now safely secured with our admissions team.</p>
            ${paymentPlanLine}
            ${balanceSection}
            ${sessionInfo}
            <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; padding: 14px 16px; border-radius: 8px; margin: 18px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #1e293b;">Next Step: Submit Your 1–2 Minute Intro Video</p>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; line-height: 1.45;">
                Every applicant across all tracks is asked to submit a short video sharing:
                <br>• Your full name
                <br>• A brief intro about your background
                <br>• Why you're excited to join Upward Academy
              </p>
              <p style="margin: 0; font-size: 12.5px;">Click the button below to upload your video link (YouTube, Loom, Google Drive, or Vimeo) right away or whenever you're ready.</p>
            </div>
            <p>Our admissions team will also reach out via WhatsApp with your cohort orientation package.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward Academy Admissions Team</strong></p>
          `
        } else {
          subjectText = 'Complete Your Track Payment — Upward Academy'
          buttonText = 'Complete Payment →'
          buttonUrl = `https://upward.goodtenants.io/academy/apply?email=${encodeURIComponent(command.email)}`
          contentHtml = `
            <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
            <p><strong>Your Upward Academy Registration Profile Has Been Saved!</strong></p>
            <p>Thank you for starting your registration for the <strong>Founding Cohort 2026</strong>.</p>
            ${paymentPlanLine}
            ${sessionInfo}
            <p>Click the button below anytime to return to checkout and complete your track payment.</p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward Academy Admissions Team</strong></p>
          `
        }

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: isPaidNow ? 'Application & Fee Payment Received' : 'Complete Your Application Payment',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'ACADEMY',
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

    // Send distinct admin notification for Academy Application Form submission or fee payment
    try {
      const isFeePaidNow = command.feeStatus === 'PAID' && !isAlreadyPaid
      const existingObj = existing?.toObject()
      const isFullSubmissionNow =
        Boolean(command.why && command.why !== 'Pending (Stage 1 Completed)') &&
        (!existingObj || existingObj.why === 'Pending (Stage 1 Completed)' || !existingObj.why)

      if (isFeePaidNow || isFullSubmissionNow) {
        const isPaid = saved.feeStatus === 'PAID'
        const paidAmountDisplay = command.amountPaid
          ? `₦${command.amountPaid.toLocaleString()}`
          : 'PAID'
        const adminSubject = isPaid
          ? `🎓 [Paid ${paidAmountDisplay}] Upward Academy Registration: ${command.name} (${command.city})`
          : `📝 New Academy Application Submitted: ${command.name} (${command.city})`

        const feeBadge = isPaid
          ? `<span style="display:inline-block; padding: 3px 8px; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; border-radius:12px; font-weight:bold; font-size:12px;">PAID (${paidAmountDisplay})</span>`
          : '<span style="display:inline-block; padding: 3px 8px; background:#fef3c7; color:#92400e; border:1px solid #fde68a; border-radius:12px; font-weight:bold; font-size:12px;">PENDING PAYMENT</span>'

        const adminMessage = `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
            <h3 style="color: #8A4A2A; margin-bottom: 6px;">${isPaid ? '🎓 Academy Registration & Payment Confirmed' : '📝 New Upward Academy Registration'}</h3>
            <p style="margin-top: 0; color: #555;">An applicant has ${isPaid ? `completed their registration and paid ${paidAmountDisplay}` : 'submitted their registration profile'}.</p>
            
            <div style="background: #fdf6ec; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px 16px; margin: 14px 0;">
              <div><strong>Application Status:</strong> ${saved.status} &nbsp;|&nbsp; <strong>Fee Status:</strong> ${feeBadge}</div>
              ${command.paymentPlan ? `<div style="font-size:13px; color:#333; margin-top:4px;"><strong>Payment Option:</strong> ${command.paymentPlan}</div>` : ''}
              ${saved.paymentRef ? `<div style="font-size:13px; color:#555; margin-top:4px;"><strong>Payment Ref:</strong> <code>${saved.paymentRef}</code></div>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
              <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Applicant Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Age Bracket:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.ageBracket}</td></tr>
              ${command.track ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Track:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;"><strong>${command.track}</strong></td></tr>` : ''}
              ${command.occupation ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Occupation:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.occupation}</td></tr>` : ''}
              ${command.experienceLevel ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Experience:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.experienceLevel}</td></tr>` : ''}
              ${command.goals ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Goals:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.goals}</td></tr>` : ''}
              ${command.why && command.why !== 'Pending (Stage 1 Completed)' ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Why Upward:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.why}</td></tr>` : ''}
              ${command.commitment && command.commitment !== 'Pending (Stage 1 Completed)' ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Commitment:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.commitment}</td></tr>` : ''}
              ${command.sessionTime && command.sessionTime !== "I don't need an info session" ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Info Session:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.sessionTime}</td></tr>` : ''}
              ${command.isScholarship ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Scholarship:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee; color:#b45309; font-weight:bold;">Yes ${command.scholarshipVideoUrl ? `(<a href="${command.scholarshipVideoUrl}">Video Link</a>)` : ''}</td></tr>` : ''}
            </table>
          </div>
        `

        await this.emailService.sendSystemAlertToAdmins(adminSubject, adminMessage)
      }
    } catch (err) {
      this.logger.error('Failed to send university application admin system alert', err)
    }

    return {
      application: saved,
      isAlreadyPaid,
      isExisting,
    }
  }
}
