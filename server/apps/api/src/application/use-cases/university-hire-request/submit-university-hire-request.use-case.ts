import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  UNIVERSITY_HIRE_REQUEST_REPOSITORY,
  IUniversityHireRequestRepository,
} from '../../../domains/university-hire-request/university-hire-request.repository'
import { UniversityHireRequest } from '../../../domains/university-hire-request/university-hire-request.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'
import {
  normalizeEmail,
  normalizePhoneNumber,
} from '../../../shared/utils/phone-normalizer'

export interface SubmitUniversityHireRequestCommand {
  companyName: string
  contactName: string
  contactRole?: string
  email: string
  phone: string
  industry: string
  city: string
  placementType: string
  rolesNeeded?: string[]
  openingsCount?: string
  compensationType?: string
  startDate?: string
  jobDescription?: string
  sourceIdentifier?: string
  abVariant?: string
}

export interface SubmitUniversityHireRequestResult {
  hireRequest: UniversityHireRequest
  emailSent: boolean
}

@Injectable()
export class SubmitUniversityHireRequestUseCase {
  private readonly logger = new Logger(SubmitUniversityHireRequestUseCase.name)

  constructor(
    @Inject(UNIVERSITY_HIRE_REQUEST_REPOSITORY)
    private readonly hireRequestRepo: IUniversityHireRequestRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SubmitUniversityHireRequestCommand): Promise<SubmitUniversityHireRequestResult> {
    const normEmail = normalizeEmail(command.email) || command.email.trim().toLowerCase()
    const normPhone = normalizePhoneNumber(command.phone)
    const contactFirstName = command.contactName.trim().split(' ')[0] || command.contactName

    const hireRequest = UniversityHireRequest.create({
      companyName: command.companyName.trim(),
      contactName: command.contactName.trim(),
      contactRole: command.contactRole?.trim() || null,
      email: normEmail,
      phone: normPhone,
      industry: command.industry.trim(),
      city: command.city.trim(),
      placementType: command.placementType.trim(),
      rolesNeeded: command.rolesNeeded || [],
      openingsCount: command.openingsCount || '1',
      compensationType: command.compensationType?.trim() || null,
      startDate: command.startDate?.trim() || null,
      jobDescription: command.jobDescription?.trim() || null,
      sourceIdentifier: command.sourceIdentifier || null,
      abVariant: command.abVariant || 'A',
      status: 'PENDING',
    })

    const saved = await this.hireRequestRepo.save(hireRequest)

    // Send confirmation email to employer
    let emailSent = false
    try {
      const rolesList = (command.rolesNeeded && command.rolesNeeded.length > 0)
        ? command.rolesNeeded.join(', ')
        : 'Real Estate & Property Management'

      const contentHtml = `
        <p style="margin-top: 0;">Dear <strong>${contactFirstName}</strong>,</p>
        <p>Thank you for submitting your talent request with <strong>Upward Academy</strong> on behalf of <strong>${command.companyName}</strong>.</p>
        
        <div style="background: #FDFBF5; border-left: 4px solid #8A4A2A; padding: 18px 22px; margin: 24px 0; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; color: #15162B; font-size: 15px; font-weight: 700;">Your Hiring Request Summary:</h4>
          <ul style="margin: 0; padding-left: 18px; color: #4B4B63; font-size: 14px; line-height: 1.6;">
            <li><strong>Company:</strong> ${command.companyName}</li>
            <li><strong>Placement Track:</strong> ${command.placementType} (${command.openingsCount || '1'} open spot${command.openingsCount !== '1' ? 's' : ''})</li>
            <li><strong>Focus Areas & Skills:</strong> ${rolesList}</li>
            <li><strong>Location:</strong> ${command.city}</li>
            ${command.startDate ? `<li><strong>Timeline:</strong> ${command.startDate}</li>` : ''}
          </ul>
        </div>

        <p><strong>What Happens Next?</strong></p>
        <ol style="color: #4B4B63; line-height: 1.6; margin-bottom: 24px;">
          <li><strong>Talent Matching (Within 24–48 Hours):</strong> Our industry placement advisors will review your requirements against our current cohort fellows and recent graduates.</li>
          <li><strong>Candidate Portfolio Shortlist:</strong> We will send you vetted candidate portfolios, practical project capstones, and interview availability.</li>
          <li><strong>Direct Introductions:</strong> Schedule seamless virtual or in-person interviews directly with your shortlisted candidates.</li>
        </ol>

        <p>If you have urgent hiring needs or specific job specs to attach, feel free to reply directly to this email or reach our talent coordination desk on WhatsApp at <a href="https://wa.me/2347069008282" style="color: #8A4A2A; font-weight: 700; text-decoration: underline;">+234 706 900 8282</a>.</p>
        
        <p style="margin-bottom: 0;">We look forward to connecting you with outstanding real estate leaders.</p>
      `

      const html = buildGlobalLayoutHtml({
        role: 'PM',
        title: `We've received your talent request for ${command.companyName}`,
        contentHtml,
        logoText: 'UPWARD',
        logoSub: 'ACADEMY',
        buttonText: 'View Academy Curriculum & Fellows →',
        buttonUrl: 'https://upward.goodtenants.io/academy/programme',
      })

      await this.emailService.sendEmailWithRetry({
        email: normEmail,
        subject: `Talent Request Received: Upward Academy × ${command.companyName}`,
        html,
        type: 'UNIVERSITY_HIRE_REQUEST_CONFIRMATION',
      })

      emailSent = true
    } catch (err) {
      this.logger.error(`Failed to send hiring confirmation email to ${normEmail}`, err)
    }

    return {
      hireRequest: saved,
      emailSent,
    }
  }
}
