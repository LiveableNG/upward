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
          subject = 'Confirmed: Your spot for the Upward Academy Webinar (21st Nov, 9:00 AM WAT)'
          title = 'Your Webinar Spot is Confirmed'

          const whatsappCommunityUrl = 'https://chat.whatsapp.com/EVzHouLPtchBFxv2TOb3ra'
          const joinWebinarUrl = 'https://upward.goodtenants.io/webinar/join'
          const admissionsWhatsAppUrl = 'https://wa.me/2348104332040?text=Hi%20Upward%20Academy%2C%20I%20have%20a%20question%20about%20the%20webinar.'

          contentHtml = `
            <p style="margin-top: 0; font-size: 16px; color: #111827; line-height: 1.5;">Hi <strong>${firstName}</strong>,</p>
            <p style="font-size: 16px; color: #111827; line-height: 1.6; margin-bottom: 20px;">
              Your spot for the live <strong>Upward Academy Webinar</strong> is officially confirmed. We are excited to have you join us.
            </p>

            <!-- Event Details Card -->
            <div style="background: #fbf1ed; border: 1.5px solid rgba(217, 119, 87, 0.28); border-radius: 12px; padding: 20px 24px; margin: 24px 0;">
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14.5px; color: #1f2937;">
                <tr>
                  <td style="color: #6b7280; width: 85px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Topic:</td>
                  <td style="font-weight: 700; color: #111827;">Build a 6-Figure Career/Business in Tech-Driven Property Management &amp; Brokerage</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; width: 85px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Date:</td>
                  <td style="font-weight: 700; color: #111827;">Saturday, 21st November 2026</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; width: 85px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Time:</td>
                  <td style="font-weight: 700; color: #111827;">9:00 AM WAT (West Africa Time)</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; width: 85px; font-weight: 600; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">Location:</td>
                  <td style="font-weight: 700; color: #111827;">Online (Google Meet &amp; YouTube Live)</td>
                </tr>
              </table>
            </div>

            <!-- Early Login Notice (8:50 AM WAT) -->
            <div style="background: #ffffff; border-left: 4px solid #8A4A2A; border-top: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14.5px; font-weight: 700; color: #8A4A2A;">
                Please log in by 8:50 AM WAT
              </p>
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                To make sure you don’t miss a moment, please log in by <strong>8:50 a.m.</strong> That gives you time to settle in and sort out any audio or connection issues before we begin promptly at 9:00 a.m.
              </p>
            </div>

            <!-- Join Webinar Button -->
            <div style="text-align: center; margin: 30px 0 28px 0;">
              <a href="${joinWebinarUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #8A4A2A; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Join Webinar &amp; Add to Calendar &rarr;
              </a>
              <p style="font-size: 12.5px; color: #6b7280; margin: 8px 0 0 0;">
                Save this link to enter the live session on Saturday, 21st November. Both Google Meet and YouTube stream links unlock here.
              </p>
            </div>

            <!-- What you'll learn -->
            <div style="margin: 28px 0;">
              <h3 style="font-size: 15.5px; font-weight: 700; color: #111827; margin: 0 0 12px 0;">What we will cover during the session:</h3>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 20px;">
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.7;">
                  <li style="margin-bottom: 8px;"><strong>The 0-Capital Blueprint:</strong> How to secure property management mandates and brokerage deals without owning real estate first.</li>
                  <li style="margin-bottom: 8px;"><strong>Tech-Driven Operations:</strong> How to automate tenant vetting, rent collection, and property reports using modern software tools.</li>
                  <li style="margin-bottom: 0;"><strong>Predictable Income:</strong> Transitioning from erratic commission-only deals to steady, recurring monthly management retainers.</li>
                </ul>
              </div>
            </div>

            <!-- Attendees WhatsApp Community -->
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px; margin: 28px 0;">
              <h4 style="font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Join the WhatsApp Attendees Community</h4>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 1.5;">
                Connect with fellow participants, receive timely webinar updates, and access post-session notes:
              </p>
              <div>
                <a href="${whatsappCommunityUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #25D366; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                  Join WhatsApp Group &rarr;
                </a>
              </div>
            </div>

            <!-- Questions / Help -->
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 20px 0;">
              Have questions or need assistance joining? Feel free to reach out to our admissions team directly on WhatsApp at <a href="${admissionsWhatsAppUrl}" target="_blank" rel="noopener noreferrer" style="color: #8A4A2A; font-weight: 600; text-decoration: underline;">+234 810 433 2040</a>.
            </p>

            <p style="margin: 22px 0 8px 0; color: #374151; line-height: 1.6; font-size: 14.5px;">
              We look forward to hosting you on Saturday, 21st November.<br>
              <strong>The Upward Academy Team</strong>
            </p>

            <!-- Signature and Accreditations -->
            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px 0; color: #111827; font-weight: 700; font-size: 14.5px;">
                Upward by GoodTenants
              </p>
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-style: italic;">
                REDA Prop-Tech Company of the Year - 2026
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px; font-style: italic;">
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
        { roles: ['CUSTOMER_SUPPORT'] },
      )
    } catch (err) {
      this.logger.error('Failed to send student early access admin system alert', err)
    }

    return saved
  }
}
