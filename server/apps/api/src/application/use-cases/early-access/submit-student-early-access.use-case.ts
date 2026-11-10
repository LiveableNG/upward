import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  EARLY_ACCESS_REPOSITORY,
  IEarlyAccessRepository,
} from '../../../domains/early-access/early-access.repository'
import {
  UNIVERSITY_TRAFFIC_REPOSITORY,
  IUniversityTrafficRepository,
} from '../../../domains/university-traffic/university-traffic.repository'
import { EarlyAccessEntry } from '../../../domains/early-access/early-access.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'
import { normalizePhoneNumber, normalizeEmail } from '../../../shared/utils/phone-normalizer'

export interface SubmitStudentEarlyAccessCommand {
  name: string
  whatsapp: string
  email: string
  city: string
  ageBracket: string
  experienceLevel: string
  track?: string
  occupation?: string
  interest?: string
  sessionTime?: string
  sourceIdentifier?: string
  abVariant?: string
}

@Injectable()
export class SubmitStudentEarlyAccessUseCase {
  private readonly logger = new Logger(SubmitStudentEarlyAccessUseCase.name)

  constructor(
    @Inject(EARLY_ACCESS_REPOSITORY)
    private readonly earlyAccessRepo: IEarlyAccessRepository,
    private readonly emailService: EmailService,
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(command: SubmitStudentEarlyAccessCommand): Promise<EarlyAccessEntry> {
    const normalizedPhone = normalizePhoneNumber(command.whatsapp)
    const normalizedEmail = normalizeEmail(command.email) || command.email

    const interestParts: string[] = []
    if (command.track) {
      interestParts.push(`[Track: ${command.track}]`)
    }
    if (command.sessionTime) {
      interestParts.push(`[Session: ${command.sessionTime}]`)
    }
    if (command.interest) {
      interestParts.push(command.interest)
    }
    const combinedInterest = interestParts.length > 0 ? interestParts.join(' ').trim() : undefined

    const entry = EarlyAccessEntry.create({
      type: 'STUDENT',
      name: command.name.trim(),
      whatsapp: normalizedPhone || command.whatsapp,
      email: normalizedEmail,
      city: command.city,
      ageBracket: command.ageBracket,
      experienceLevel: command.experienceLevel,
      sourceIdentifier: command.sourceIdentifier || null,
      abVariant: command.abVariant || 'A',
      interest: combinedInterest,
    })

    const saved = await this.earlyAccessRepo.save(entry)

    if (command.sourceIdentifier) {
      this.trafficRepo.incrementConversion(command.sourceIdentifier).catch((err: any) => {
        this.logger.warn(`Failed to increment early access conversion for ${command.sourceIdentifier}: ${err?.message || err}`)
      })
    }

    // 1. Send applicant confirmation email
    if (command.email) {
      try {
        const firstName = command.name.trim().split(' ')[0] || 'there'
        const isWebinar = Boolean(
          (command.track && command.track.toLowerCase().includes('webinar')) ||
          (command.sessionTime && command.sessionTime.toLowerCase().includes('webinar')) ||
          (command.interest && command.interest.toLowerCase().includes('webinar'))
        )

        let subject: string
        let title: string
        let contentHtml: string

        if (isWebinar) {
          subject = 'You’re in! The Tech-Driven Property Management Model: Go from Commission-Only to Predictable Income in 90 Days'
          title = 'You’re in! The Tech-Driven Property Management Model: Go from Commission-Only to Predictable Income in 90 Days'

          const whatsappCommunityUrl = 'https://chat.whatsapp.com/LcFwiekT2UQLUSzrm2zGER?s=cl&p=a&mlu=4&ilr=4&iam=2'

          contentHtml = `
            <p style="margin-top: 0; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
            <p style="font-size: 16px; color: #111827; font-weight: 600; line-height: 1.5;">Your spot at the Upward Webinar is confirmed.</p>

            <!-- Event Details Card (No Emojis) -->
            <div style="background: #fbf1ed; border: 1.5px solid rgba(217, 119, 87, 0.25); border-radius: 12px; padding: 18px 24px; margin: 24px 0;">
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14.5px; color: #1f2937;">
                <tr>
                  <td style="color: #6b7280; width: 75px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Date:</td>
                  <td style="font-weight: 700; color: #111827;">21st November 2026</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; width: 75px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Time:</td>
                  <td style="font-weight: 700; color: #111827;">9:00 AM WAT</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; width: 75px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Where:</td>
                  <td style="font-weight: 700; color: #111827;">Virtual (Live Online Session)</td>
                </tr>
              </table>
            </div>

            <!-- What you'll learn -->
            <div style="margin: 28px 0;">
              <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">What you’ll learn</h3>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px;">
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14.5px; line-height: 1.65;">
                  <li style="margin-bottom: 10px;">How to build a tech-driven property management career from scratch, even with no prior experience</li>
                  <li style="margin-bottom: 10px;">How to use technology to manage properties efficiently and boost your productivity</li>
                  <li style="margin-bottom: 0;">How to build this alongside your existing commitments, without giving up all your time</li>
                </ul>
              </div>
            </div>

            <!-- Upward Academy Context -->
            <p style="line-height: 1.65; color: #4b5563; margin: 16px 0;">
              Upward Academy aims to equip people for a career in technology-driven property management, facilitated by leading industry experts.
            </p>
            <p style="line-height: 1.65; color: #4b5563; margin: 16px 0;">
              Through GoodTenants, our parent company, we’ve served leading property management firms and earned industry recognition over the years;
            </p>
            <p style="line-height: 1.65; color: #4b5563; margin: 16px 0;">
              In this webinar, we’ll show you how to tap into Nigeria’s property management and real estate market and build a lucrative career/business.
            </p>

            <!-- Next Steps Card -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px; margin: 28px 0;">
              <h4 style="font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">Next Steps:</h4>
              <p style="margin: 0 0 14px 0; font-size: 14.5px; color: #374151; line-height: 1.5;">
                <strong>Join our WhatsApp group</strong> for updates, tips, and exclusive perks before the webinar:
              </p>
              <div style="margin: 16px 0 22px 0;">
                <a href="${whatsappCommunityUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25D366; color: #ffffff !important; font-weight: 700; font-size: 14.5px; padding: 13px 26px; border-radius: 8px; text-decoration: none;">
                  Join WhatsApp Attendees Group &rarr;
                </a>
              </div>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 13.5px; color: #4b5563;">
                <p style="margin: 0 0 6px 0;">
                  <strong>Share with your friends:</strong> Know someone who’d benefit from this? Invite them:
                </p>
                <a href="${whatsappCommunityUrl}" target="_blank" rel="noopener noreferrer" style="color: #d97757; font-weight: 600; text-decoration: underline; word-break: break-all;">
                  ${whatsappCommunityUrl}
                </a>
              </div>
            </div>

            <p style="margin: 22px 0 8px 0; color: #4b5563; line-height: 1.6;">
              Thank you once again for registering.<br>
              See you inside.
            </p>

            <!-- Signature and Accreditations -->
            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px 0; color: #111827; font-weight: 700; font-size: 15px;">
                Upward by GoodTenants
              </p>
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12.5px; font-style: italic;">
                REDA Prop-Tech Company of the Year - 2026
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12.5px; font-style: italic;">
                NIESV Lagos Prop-Tech Company of the Period - 2025
              </p>
            </div>
          `
        } else {
          subject = "You're on the list — here's what happens next"
          title = 'Welcome to the Upward Academy Waitlist'
          contentHtml = `
            <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
            <p><strong>Welcome to the Upward Academy Waitlist!</strong></p>
            <p>Thank you for signing up and taking the first step toward building a ₦10M+ property management business.</p>
            <p>Upward helps responsible tenants build a verifiable rental reputation by tracking rent payments and other relevant rental information. This can help tenants access benefits such as rent financing, rewards, discounts, and exclusive homes.</p>
            <p>For landlords and property managers, Upward provides reliable tenant information, including tenant verification, rental history, payment behaviour, and Tenant Scores to help them make smarter rental decisions.</p>
            <p>We have a record of supported reputable firms, including <strong>Diya Fatimilehin & Co.</strong>, <strong>Estatelinks</strong>, and many others, with their property management operations.</p>
            <p>We’re excited to have you on the waitlist. Stay tuned as we share more information about the programme, what to expect, and how you can begin your journey toward building a ₦10M+ property management business.</p>
            <p><strong>Welcome to Upward Academy.</strong></p>
            <p style="margin-bottom: 0;">Best regards,<br><strong>The Upward Team</strong></p>
          `
        }

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title,
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'ACADEMY',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject,
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send student early access email to ${command.email}`, err)
      }
    }

    // 2. Send Admin System Notification
    try {
      const isInfoSession = Boolean(
        command.sessionTime &&
        command.sessionTime !== "I don't need an info session" &&
        command.sessionTime.trim().length > 0
      )

      const adminSubject = isInfoSession
        ? `📅 [Info Session RSVP] ${command.name} (${command.city})${command.sessionTime ? ` — ${command.sessionTime}` : ''}`
        : `🎓 New Student Early Access: ${command.name} (${command.city})`

      const adminTitle = isInfoSession
        ? '📅 Upward Academy Info & Q&A Session RSVP'
        : '🎓 New Student Early Access Waitlist'

      const adminSubtitle = isInfoSession
        ? `A new applicant has RSVP'd for an <strong>Upward Academy Information &amp; Q&amp;A Session</strong>.`
        : `A new student applicant has joined the <strong>Upward Academy Founding Cohort 2026</strong> early access list.`

      const sessionCallout = isInfoSession
        ? `
          <div style="background: #fdf6ec; border-left: 4px solid #8A4A2A; padding: 10px 14px; margin: 14px 0 16px 0; border-radius: 4px;">
            <div style="font-size: 11px; font-weight: bold; color: #8A4A2A; text-transform: uppercase; letter-spacing: 0.5px;">Reserved Information Session</div>
            <div style="font-size: 15px; font-weight: bold; color: #111; margin-top: 2px;">${command.sessionTime}</div>
          </div>
        `
        : ''

      const adminMessage = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
          <h3 style="color: #8A4A2A; margin-bottom: 6px;">${adminTitle}</h3>
          <p style="margin-top: 0; color: #555;">${adminSubtitle}</p>
          ${sessionCallout}
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.email || 'None'}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">WhatsApp:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.whatsapp}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">City:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.city}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Age Bracket:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.ageBracket}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Experience:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.experienceLevel}</td></tr>
            ${command.track ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Track:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;"><strong>${command.track}</strong></td></tr>` : ''}
            ${command.occupation ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Occupation:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.occupation}</td></tr>` : ''}
            ${command.interest ? `<tr><td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #eee;">Interest:</td><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${command.interest}</td></tr>` : ''}
          </table>
        </div>
      `
      await this.emailService.sendSystemAlertToAdmins(
        adminSubject,
        adminMessage,
      )
    } catch (err) {
      this.logger.error('Failed to send student early access admin system alert', err)
    }

    return saved
  }
}
