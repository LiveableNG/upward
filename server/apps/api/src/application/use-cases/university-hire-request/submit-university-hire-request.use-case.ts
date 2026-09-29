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
        <p>Thank you for registering your talent interest with <strong>Upward Academy</strong> on behalf of <strong>${command.companyName}</strong>. We are delighted to welcome you as a <strong>Founding Employer Partner</strong> for our upcoming inaugural cohort.</p>
        
        <div style="background: #FDFBF5; border-left: 4px solid #8A4A2A; padding: 18px 22px; margin: 24px 0; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; color: #15162B; font-size: 15px; font-weight: 700;">Your Talent Reservation Summary:</h4>
          <ul style="margin: 0; padding-left: 18px; color: #4B4B63; font-size: 14px; line-height: 1.6;">
            <li><strong>Company:</strong> ${command.companyName}</li>
            <li><strong>Placement Track:</strong> ${command.placementType} (${command.openingsCount || '1'} opening${command.openingsCount !== '1' ? 's' : ''})</li>
            <li><strong>Focus Areas & Skills:</strong> ${rolesList}</li>
            <li><strong>Location:</strong> ${command.city}</li>
            ${command.startDate ? `<li><strong>Target Timeline:</strong> ${command.startDate}</li>` : ''}
          </ul>
        </div>

        <p><strong>What Happens Next?</strong></p>
        <ol style="color: #4B4B63; line-height: 1.6; margin-bottom: 24px;">
          <li><strong>Placement Consultation (Within 24–48 Hours):</strong> An Upward industry placement advisor will reach out to discuss your role specifications, candidate criteria, and company workflows.</li>
          <li><strong>Curriculum & Capstone Alignment:</strong> As our inaugural cohort undertakes their intensive 10-week practical lab, we can align real case studies and mock portfolio exercises directly with the systems your team uses.</li>
          <li><strong>Priority Candidate Showcase & Interviews:</strong> Well ahead of graduation, you will receive exclusive first-look access to vetted candidate portfolios, practical evaluations, and direct interview scheduling.</li>
        </ol>

        <p>If you have specific job descriptions, JD attachments, or team requirements to share in advance, please feel free to reply directly to this email or reach our talent coordination desk on WhatsApp at <a href="https://wa.me/2348175437146" style="color: #8A4A2A; font-weight: 700; text-decoration: underline;">+234 817 543 7146</a>.</p>
        
        <p style="margin-bottom: 0;">We look forward to partnering with <strong>${command.companyName}</strong> to build the next generation of real estate leaders.</p>
      `

      const html = buildGlobalLayoutHtml({
        role: 'PM',
        title: `Talent Reservation Confirmed: Upward Academy × ${command.companyName}`,
        contentHtml,
        logoText: 'UPWARD',
        logoSub: 'ACADEMY',
        buttonText: 'Explore Academy Curriculum →',
        buttonUrl: 'https://upward.goodtenants.io/academy/programme',
      })

      await this.emailService.sendEmailWithRetry({
        email: normEmail,
        subject: `Talent Pipeline Reservation: Upward Academy × ${command.companyName}`,
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
