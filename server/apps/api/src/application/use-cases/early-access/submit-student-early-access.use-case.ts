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
        const contentHtml = `
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

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: 'Welcome to the Upward Academy Waitlist',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'ACADEMY',
          buttonText: 'Explore Upward Academy',
          buttonUrl: 'https://upward.goodtenants.io/academy',
        })

        await this.emailService.sendEmailWithRetry({
          email: command.email,
          subject: "You're on the list — here's what happens next",
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
