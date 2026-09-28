import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  UNIVERSITY_REFERRAL_REPOSITORY,
  IUniversityReferralRepository,
} from '../../../domains/university-referral/university-referral.repository'
import { UniversityReferral } from '../../../domains/university-referral/university-referral.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'
import {
  normalizeEmail,
  normalizePhoneNumber,
} from '../../../shared/utils/phone-normalizer'

export interface ReferredContactInput {
  name?: string
  phone?: string
  email?: string
}

export interface SubmitUniversityReferralsCommand {
  referrerEarlyAccessId?: string
  referrerName: string
  referrerPhone: string
  referrerEmail?: string
  referrals: ReferredContactInput[]
}

export interface ReferralResultItem {
  id?: string
  name?: string | null
  phone?: string | null
  email?: string | null
  isEligible: boolean
  status: string
  emailSent: boolean
  ineligibleReason?: string | null
  message: string
}

export interface SubmitUniversityReferralsResult {
  totalSubmitted: number
  eligibleCount: number
  ineligibleCount: number
  results: ReferralResultItem[]
}

@Injectable()
export class SubmitUniversityReferralsUseCase {
  private readonly logger = new Logger(SubmitUniversityReferralsUseCase.name)

  constructor(
    @Inject(UNIVERSITY_REFERRAL_REPOSITORY)
    private readonly referralRepo: IUniversityReferralRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: SubmitUniversityReferralsCommand): Promise<SubmitUniversityReferralsResult> {
    const normReferrerPhone = normalizePhoneNumber(command.referrerPhone)
    const normReferrerEmail = normalizeEmail(command.referrerEmail)
    const referrerFirstName = command.referrerName.trim().split(' ')[0] || command.referrerName

    const results: ReferralResultItem[] = []
    let eligibleCount = 0
    let ineligibleCount = 0

    // Limit to max 5 recommendations
    const itemsToProcess = (command.referrals || []).slice(0, 5)

    for (const item of itemsToProcess) {
      const rawName = item.name?.trim() || null
      const normPhone = item.phone ? normalizePhoneNumber(item.phone) : null
      const normEmail = item.email ? normalizeEmail(item.email) : null

      // If neither phone nor email provided, skip
      if (!normPhone && !normEmail) {
        continue
      }

      // 1. Self-referral check
      const isSelfReferral =
        (normPhone && normPhone === normReferrerPhone) ||
        (normEmail && normReferrerEmail && normEmail === normReferrerEmail)

      if (isSelfReferral) {
        ineligibleCount++
        results.push({
          name: rawName,
          phone: normPhone,
          email: normEmail,
          isEligible: false,
          status: 'INELIGIBLE',
          emailSent: false,
          ineligibleReason: 'SELF_REFERRAL',
          message: 'You cannot refer yourself.',
        })
        continue
      }

      // 2. Eligibility check: Someone counts as referred ONLY if they are NOT in the info list before
      const isAlreadyInList = await this.referralRepo.checkInInfoList(normEmail, normPhone)

      if (isAlreadyInList) {
        ineligibleCount++

        // Save record as INELIGIBLE for tracking & audit
        const ineligibleReferral = UniversityReferral.create({
          referrerEarlyAccessId: command.referrerEarlyAccessId,
          referrerName: command.referrerName,
          referrerEmail: normReferrerEmail,
          referrerPhone: normReferrerPhone,
          referredName: rawName,
          referredEmail: normEmail,
          referredPhone: normPhone,
          status: 'INELIGIBLE',
          rewardPercentage: 10.0,
          rewardStatus: 'PENDING',
          emailSent: false,
          ineligibleReason: 'ALREADY_IN_INFO_LIST',
          notes: 'Contact was already in the info session list or waitlist prior to recommendation',
        })
        await this.referralRepo.save(ineligibleReferral)

        results.push({
          name: rawName,
          phone: normPhone,
          email: normEmail,
          isEligible: false,
          status: 'INELIGIBLE',
          emailSent: false,
          ineligibleReason: 'ALREADY_IN_INFO_LIST',
          message: 'This contact was already on our information list or waitlist.',
        })
        continue
      }

      // 3. Eligible referral: Create record
      let emailSent = false

      const referral = UniversityReferral.create({
        referrerEarlyAccessId: command.referrerEarlyAccessId,
        referrerName: command.referrerName,
        referrerEmail: normReferrerEmail,
        referrerPhone: normReferrerPhone,
        referredName: rawName,
        referredEmail: normEmail,
        referredPhone: normPhone,
        status: 'PENDING',
        rewardPercentage: 10.0,
        rewardStatus: 'PENDING',
        emailSent: false,
      })

      // 4. Send automated email to referred person if email is provided
      if (normEmail) {
        try {
          const friendGreeting = rawName
            ? `Hi <strong>${rawName.trim().split(' ')[0]}</strong>,`
            : 'Hi there,'

          const contentHtml = `
            <p style="margin-top: 0;">${friendGreeting}</p>
            <p>Your friend <strong>${command.referrerName}</strong> recently registered for the <strong>Upward Academy</strong> Information Session and specifically recommended you for our upcoming <strong>Real Estate Executive Business Course</strong>.</p>
            
            <div style="background: #FDFBF5; border-left: 4px solid #8A4A2A; padding: 16px 20px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0 0 8px; font-weight: 700; color: #15162B; font-size: 15px;">Why ${referrerFirstName} thought of you:</p>
              <p style="margin: 0; color: #4B4B63; font-size: 14px; line-height: 1.5;">
                Upward Academy equips ambitious individuals to launch and scale a Tech-driven Property Management & Brokerage business in Nigeria — with systems built to reach <strong>₦10M+ a year</strong> in recurring income.
              </p>
            </div>

            <p><strong>What the 10-Week Cohort Offers:</strong></p>
            <ul style="color: #4B4B63; line-height: 1.6; margin-bottom: 20px;">
              <li><strong>Dual-Track Business:</strong> Learn both Property Management (steady 8–10% monthly retainers) and Brokerage (high-ticket deal fees).</li>
              <li><strong>Real Portfolio Placement:</strong> Top-performing graduates get placed as paid sub-managers on actual managed properties.</li>
              <li><strong>Technology & Landlord Contracts:</strong> Access to GoodTenants platform, automated rent collection, and legal management agreements.</li>
              <li><strong>Hybrid Schedule:</strong> Designed for working professionals (6–8 hours/week) with in-person mentoring and online sessions.</li>
            </ul>

            <p>We are hosting a free live Information Session with our founders and faculty where you can ask questions, explore the curriculum, and learn about scholarship opportunities.</p>
            
            <p style="margin-bottom: 0;">Reserve your free seat below:</p>
          `

          const html = buildGlobalLayoutHtml({
            role: 'TENANT',
            title: `${referrerFirstName} recommended you for Upward Academy`,
            contentHtml,
            logoText: 'UPWARD',
            logoSub: 'ACADEMY',
            buttonText: 'Reserve Your Free Seat →',
            buttonUrl: 'https://upward.goodtenants.io/academy/sessions',
          })

          await this.emailService.sendEmailWithRetry({
            email: normEmail,
            subject: `${referrerFirstName} recommended you for the Upward Academy Real Estate Programme`,
            html,
            type: 'UNIVERSITY_REFERRAL_INVITE',
          })

          referral.markEmailSent()
          emailSent = true
        } catch (emailErr) {
          this.logger.error(`Failed to send referral email to ${normEmail}`, emailErr)
        }
      }

      const saved = await this.referralRepo.save(referral)
      eligibleCount++

      results.push({
        id: saved.id,
        name: rawName,
        phone: normPhone,
        email: normEmail,
        isEligible: true,
        status: 'PENDING',
        emailSent,
        message: emailSent
          ? 'Invitation email sent successfully! You will earn 10% when they join.'
          : 'Recommendation registered! You will earn 10% when they join.',
      })
    }

    return {
      totalSubmitted: results.length,
      eligibleCount,
      ineligibleCount,
      results,
    }
  }
}
