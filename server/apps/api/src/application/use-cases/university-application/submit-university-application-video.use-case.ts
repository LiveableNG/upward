import { BadRequestException, Inject, Injectable, NotFoundException, Logger } from '@nestjs/common'
import {
  UNIVERSITY_APPLICATION_REPOSITORY,
  IUniversityApplicationRepository,
} from '../../../domains/university-application/university-application.repository'
import { UniversityApplication } from '../../../domains/university-application/university-application.entity'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { buildGlobalLayoutHtml } from '../../../shared/infrastructure/email/email.helper'

export interface SubmitUniversityApplicationVideoCommand {
  paymentRef: string
  videoUrl: string
}

export interface SubmitUniversityApplicationVideoResult {
  id: string
  paymentRef: string
  videoUrl: string
}

@Injectable()
export class SubmitUniversityApplicationVideoUseCase {
  private readonly logger = new Logger(SubmitUniversityApplicationVideoUseCase.name)

  constructor(
    @Inject(UNIVERSITY_APPLICATION_REPOSITORY)
    private readonly applicationRepo: IUniversityApplicationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(
    command: SubmitUniversityApplicationVideoCommand,
  ): Promise<SubmitUniversityApplicationVideoResult> {
    const ref = command.paymentRef.trim()
    const videoUrl = command.videoUrl.trim()

    if (!ref) {
      throw new BadRequestException('Payment reference is required')
    }

    if (!/^https?:\/\/.+/i.test(videoUrl)) {
      throw new BadRequestException('Please provide a valid video link starting with http:// or https://')
    }

    const existing = await this.applicationRepo.findByPaymentRef(ref)
    if (!existing) {
      throw new NotFoundException('Application payment reference not found')
    }

    const existingProps = existing.toObject()
    if (existingProps.feeStatus !== 'PAID') {
      throw new BadRequestException('Payment must be confirmed before submitting an intro video')
    }

    const updated = UniversityApplication.restore({
      ...existingProps,
      scholarshipVideoUrl: videoUrl,
      updatedAt: new Date(),
    })

    const saved = await this.applicationRepo.save(updated)

    // Send video submission confirmation email to the student
    if (existingProps.email) {
      try {
        const firstName = existingProps.name.trim().split(' ')[0] || 'there'
        const contentHtml = `
          <p style="margin-top: 0;">Hi <strong>${firstName}</strong>,</p>
          <p><strong>Great news! Your 1–2 minute intro video has been successfully received by our admissions team.</strong></p>
          <div style="background: #f0fdf4; border-left: 4px solid #166534; padding: 12px 14px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #166534;"><strong>Submitted Video:</strong> <a href="${videoUrl}" target="_blank" style="color: #166534; text-decoration: underline;">${videoUrl}</a></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;"><strong>Track:</strong> ${existingProps.track || 'Upward Academy'}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;"><strong>Classes Commence:</strong> Saturday, December 5, 2026</p>
          </div>
          <p><strong>What happens next?</strong></p>
          <p>Our academic advisors will review your submission. You will receive an onboarding package via email and WhatsApp prior to December 5 with access to the learning community, curriculum schedule, and live session links.</p>
          <p style="margin-bottom: 0;">Welcome aboard,<br><strong>The Upward Academy Admissions Team</strong></p>
        `

        const html = buildGlobalLayoutHtml({
          role: 'TENANT',
          title: 'Intro Video Received — Upward Academy',
          contentHtml,
          logoText: 'UPWARD',
          logoSub: 'ACADEMY',
          buttonText: 'Visit Upward Academy →',
          buttonUrl: 'https://upward.goodtenants.io/academy',
        })

        await this.emailService.sendEmailWithRetry({
          email: existingProps.email,
          subject: 'Intro Video Received — Upward Academy Founding Cohort 2026',
          html,
          type: 'STUDENT_EARLY_ACCESS',
        })
      } catch (err) {
        this.logger.error(`Failed to send video confirmation email to ${existingProps.email}`, err)
      }
    }

    return {
      id: saved.id || existingProps.id || '',
      paymentRef: ref,
      videoUrl,
    }
  }
}
