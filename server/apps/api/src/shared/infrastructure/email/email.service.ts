import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import { randomUUID } from 'crypto'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { BugsnagService } from '../../../shared/infrastructure/common/bugsnag/bugsnag.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { EmailSentEvent } from '../../../application/events/definition/email-sent.event'
import { Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { formatName } from '@upward/common-utils'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import {
  applyPmBranding,
  getPmTypeLabel,
  buildWaitlistConfirmationHtml,
  buildDailyAnalyticsHtml,
  buildOtpEmailHtml,
  buildTenantInviteHtml,
  buildPaymentRequestHtml,
  buildCredibilityRequestHtml,
  buildNewUserRecordsHtml,
  buildLandlordWelcomeHtml,
  buildLandlordNewPropertyAssignmentHtml,
  buildRecordAddedHtml,
  buildDataDeletionRequestConfirmationHtml,
  buildTeamInvitationHtml,
  buildJoinRequestRejectionHtml,
  buildCredibilityRequestRejectionHtml,
  buildSequenceWelcomeHtml,
  buildSequenceDay2Html,
  buildSequenceDay5Html,
  buildSequenceDay9Html,
  buildSequenceDay14Html,
} from './email.helper'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mg: any
  private readonly MAX_RETRIES = 3
  private readonly frontendUrl: string

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private bugsnag: BugsnagService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private s3Service: S3Service,
    private encryption: EncryptionService,
  ) {
    this.frontendUrl =
      (this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io')
        .split(',')[0]!
        .trim()
    const mailgun = new Mailgun(FormData)
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY')
    const domain = this.configService.get<string>('MAILGUN_DOMAIN')

    const mockEmails =
      this.configService.get<string>('MOCK_EMAILS') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'dev' ||
      !apiKey ||
      !domain

    if (mockEmails) {
      this.logger.log('EmailService: Mocking outgoing emails in development/local environment.')
      this.mg = {
        messages: {
          create: async (dom: string, data: any) => {
            const toStr = Array.isArray(data.to) ? data.to.join(', ') : data.to
            this.logger.log(`[MOCK EMAIL] To: ${toStr} | Subject: ${data.subject}`)
            try {
              const uuid = randomUUID()

              const htmlBuffer = Buffer.from(data.html || '')
              const htmlKey = `dev-emails/${uuid}/body.html`
              await this.s3Service.uploadBuffer(htmlBuffer, htmlKey, 'text/html')

              const attachmentsData = []
              if (data.attachment && Array.isArray(data.attachment)) {
                for (const att of data.attachment) {
                  const attKey = `dev-emails/${uuid}/attachments/${att.filename}`
                  const buffer = Buffer.isBuffer(att.data)
                    ? att.data
                    : typeof att.data === 'string'
                      ? Buffer.from(att.data)
                      : Buffer.from([])

                  await this.s3Service.uploadBuffer(buffer, attKey, 'application/octet-stream')
                  attachmentsData.push({
                    filename: att.filename,
                    s3Key: attKey,
                  })
                }
              }

              await this.prisma.upward_dev_email_preview.create({
                data: {
                  uuid,
                  to: toStr,
                  subject: data.subject || '',
                  html: htmlKey,
                  text: data.text || '',
                  attachments: attachmentsData,
                },
              })
            } catch (err) {
              this.logger.error('Failed to save dev email preview to database / S3:', err)
            }
            return { id: `mock-mailgun-id-${Date.now()}` }
          },
        },
      }
    } else {
      this.mg = mailgun.client({
        username: 'api',
        key: apiKey || '',
      })
    }
  }

  async sendWaitlistConfirmation(userId: string, email: string, firstName?: string) {
    const formattedName = firstName ? formatName(firstName) : 'there'
    const displayName = firstName ? `, ${formattedName}` : ''

    // Try to get template from DB
    const template = await this.prisma.upward_system_email.findUnique({
      where: { slug: 'SIGNUP_CONFIRMATION' },
    })

    let subject = template?.subject || 'Welcome to the Upward Waitlist — You’re In'
    let html =
      template?.htmlContent ||
      buildWaitlistConfirmationHtml({
        displayName,
        firstName,
        email,
        frontendUrl: this.frontendUrl,
      })

    const text =
      template?.textContent ||
      `Hello ${formattedName},\n\nYou're officially on the waitlist for Upward by GoodTenants.`

    // Replace variables
    html = html
      .replace(/{{firstName}}/g, displayName || (formattedName ? `, ${formattedName}` : ''))
      .replace(/{{email}}/g, email)
    subject = subject.replace(/{{firstName}}/g, formattedName)

    return await this.sendEmailWithRetry({
      userId,
      email,
      subject,
      html,
      text,
      type: 'CONFIRMATION',
    })
  }

  async sendEmailWithRetry(params: {
    userId?: string
    pmUuid?: string
    email: string
    subject: string
    text?: string
    html: string
    type: string
    sessionId?: string
    fromOverride?: string
    attachments?: Array<{ filename: string; content: Buffer }>
  }) {
    const { userId, pmUuid, email, subject, text, html, type, sessionId, fromOverride, attachments } = params
    let domain = this.configService.get<string>('MAILGUN_DOMAIN')
    if (!domain) {
      this.logger.error('MAILGUN_DOMAIN not configured')
      return { success: false, error: 'MAILGUN_DOMAIN not configured' }
    }

    let from =
      fromOverride || this.configService.get<string>('EMAIL_FROM') || `Upward by GoodTenants <hello@${domain}>`
    let brandedHtml = html

    const targetPmUuid = pmUuid || userId
    if (targetPmUuid) {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: targetPmUuid },
        include: { emailSetting: true },
      })
      if (pm?.emailSetting) {
        if (pm.emailSetting.isVerified && pm.emailSetting.domain) {
          domain = pm.emailSetting.domain
          from = `"${pm.emailSetting.senderName}" <${pm.emailSetting.senderEmail}>`
        }
        brandedHtml = applyPmBranding(html, pm.emailSetting)
      }
    }

    let retries = 0
    let success = false
    let lastError = ''
    let mailgunId = ''

    while (retries < this.MAX_RETRIES && !success) {
      try {
        const mailData: any = {
          from,
          to: [email],
          subject,
          text,
          html: brandedHtml,
          'h:List-Unsubscribe': `<${this.frontendUrl}/unsubscribe?email=${email}>`,
          'h:List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }

        if (attachments && attachments.length > 0) {
          mailData.attachment = attachments.map((a) => ({
            filename: a.filename,
            data: a.content,
          }))
        }

        const response = await this.mg.messages.create(domain, mailData)
        success = true
        mailgunId = response.id
        this.logger.log(`Email ${type} sent to ${email} (Attempt ${retries + 1})`)
      } catch (error: unknown) {
        retries++
        lastError = error instanceof Error ? error.message : 'Unknown error'
        this.logger.warn(
          `Failed to send email to ${email} (Attempt ${retries}/${this.MAX_RETRIES}): ${lastError}`,
        )
        if (retries < this.MAX_RETRIES) {
          // Exponential backoff: 2s, 4s, 8s...
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000))
        }
      }
    }

    // Resolve userId if not provided
    let resolvedUserId = userId
    if (!resolvedUserId && email) {
      const user = await this.prisma.upward_user.findFirst({
        where: { email },
        select: { id: true },
      })
      if (user) {
        resolvedUserId = String(user.id)
      } else {
        const waitlist = await this.prisma.upward_waitlist.findFirst({
          where: { email },
          select: { id: true },
        })
        if (waitlist) {
          resolvedUserId = waitlist.id
        }
      }
    }

    // Publish Sent Event for logging/other side effects
    this.eventBus.publish(
      new EmailSentEvent(
        resolvedUserId,
        email,
        subject,
        type,
        success ? 'SENT' : 'FAILED',
        mailgunId,
        success ? undefined : lastError,
        retries - 1 >= 0 ? retries - 1 : 0,
        sessionId,
        brandedHtml,
      ),
    )

    if (!success) {
      this.bugsnag.notify(new Error(`Failed to send ${type} email to ${email}: ${lastError}`), {
        userId: resolvedUserId,
        email,
        subject,
        type,
        retries,
      })
    }

    // If it's a confirmation email, also update the user record
    if (type === 'CONFIRMATION' && resolvedUserId) {
      try {
        await this.prisma.upward_waitlist.update({
          where: { id: resolvedUserId },
          data: {
            confirmationSent: success,
            confirmationEmailStatus: success ? 'SENT' : 'FAILED',
            confirmationEmailError: success ? null : lastError,
            confirmationEmailRetries: retries > 0 ? retries - 1 : 0,
          },
        })
      } catch (err) {
        this.logger.error('Failed to update waitlist confirmation:', err)
      }
    }

    return { success, mailgunId, error: lastError }
  }

  async sendGenericEmail(email: string, subject: string, content: string, userId?: string, pmUuid?: string, fromOverride?: string) {
    const result = await this.sendEmailWithRetry({
      userId,
      pmUuid,
      email,
      subject,
      html: content,
      type: 'BULK',
      fromOverride,
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send generic email')
    }
  }

  async sendDailyAnalyticsEmail(
    recipientEmail: string,
    stats: { completed: number; incomplete: number; total: number },
  ) {
    const date = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const html = buildDailyAnalyticsHtml(stats, date)

    await this.sendEmailWithRetry({
      email: recipientEmail,
      subject: `Upward Daily Report: ${date}`,
      html,
      type: 'DAILY_ANALYTICS',
    })
  }

  async sendPasswordResetOTP(
    email: string,
    fullName: string,
    otp: string,
    theme: 'CLAY' | 'FOREST' = 'CLAY',
  ) {
    const html = buildOtpEmailHtml({
      theme,
      brandName: 'Upward',
      brandSub: 'by GoodTenants',
      title: 'Password Reset Request',
      greeting: fullName,
      message: 'We received a request to reset your password. Use the code below to proceed. This code expires in 15 minutes.',
      otp,
      expiryText: "If you didn't request this, you can safely ignore this email. Someone may have typed your email address by mistake.",
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject: `Your Upward Password Reset Code: ${otp}`,
      html,
      type: 'PASSWORD_RESET',
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send password reset OTP')
    }
  }

  async sendPmPasswordResetOTP(
    email: string,
    fullName: string,
    otp: string,
  ) {
    const html = buildOtpEmailHtml({
      theme: 'PM',
      brandName: 'Upward PM',
      brandSub: 'Property Management Platform',
      title: 'Password Reset Request',
      greeting: fullName,
      message: 'We received a request to reset your password. Use the code below to proceed. This code expires in 15 minutes.',
      otp,
      expiryText: "If you didn't request this, you can safely ignore this email. Someone may have typed your email address by mistake.",
      isPm: true,
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject: `Your Upward PM Password Reset Code: ${otp}`,
      html,
      type: 'PM_PASSWORD_RESET',
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send PM password reset OTP')
    }
  }

  async sendAuthOTP(
    email: string,
    otp: string,
    context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' | 'WAITLIST',
    theme: 'CLAY' | 'FOREST' = 'CLAY',
  ) {
    const contexts = {
      SIGNUP: {
        title: 'Verify your email',
        message:
          'Welcome to Upward! Use the code below to verify your email address and complete your signup.',
        subject: `Verify your Upward account: ${otp}`,
      },
      LOGIN: {
        title: 'Login Verification',
        message: 'You requested to log in via verification code. Use the code below to proceed.',
        subject: `Your Upward Login Code: ${otp}`,
      },
      INVITE: {
        title: 'Accept Your Invite',
        message:
          'You have been invited to join Upward. Use the code below to verify your identity and accept the invite.',
        subject: `Your Upward Invite Verification Code: ${otp}`,
      },
      PAYMENT: {
        title: 'Verify Payment Access',
        message:
          'Use the code below to verify your access to this payment. This ensures your transaction is secure.',
        subject: `Your Upward Payment Verification Code: ${otp}`,
      },
      WAITLIST: {
        title: 'Claim Your Waitlist Spot',
        message:
          'Use the code below to verify your email and claim your spot on the Upward waitlist.',
        subject: `Your Upward Waitlist Verification Code: ${otp}`,
      },
    }

    const { title, message, subject } = contexts[context]

    const html = buildOtpEmailHtml({
      theme,
      brandName: 'Upward',
      brandSub: 'by GoodTenants',
      title,
      message,
      otp,
      expiryText: 'This code expires in 10 minutes.',
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject,
      html,
      type: `AUTH_OTP_${context}`,
    })
    if (!result.success) {
      throw new Error(result.error || `Failed to send ${context} OTP`)
    }
  }

  async sendTenantInvite(params: {
    email: string
    tenantName: string
    pmName: string
    inviteLink: string
    pmType?: string | null
    pmUuid?: string
  }): Promise<boolean> {
    const { email, tenantName, pmName, inviteLink, pmType, pmUuid } = params
    const pmRole = getPmTypeLabel(pmType)

    const html = buildTenantInviteHtml({
      tenantName,
      pmName,
      inviteLink,
      pmRole,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `Invitation to join Upward from ${pmName}`,
      html,
      type: 'TENANT_INVITE',
    })
    return result.success
  }

  async sendPaymentRequestEmail(params: {
    email: string
    tenantName: string
    pmName: string
    amount: number
    currency: string
    dueDate: string | Date
    description?: string
    paymentLink: string
    pmType?: string | null
    pmUuid?: string
  }): Promise<boolean> {
    const {
      email,
      tenantName,
      pmName,
      amount,
      currency,
      dueDate,
      description,
      paymentLink,
      pmType,
      pmUuid,
    } = params
    const pmRole = getPmTypeLabel(pmType)

    const html = buildPaymentRequestHtml({
      tenantName,
      pmName,
      amount,
      currency,
      dueDate,
      description,
      paymentLink,
      pmRole,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `New Payment Request: ${currency} ${amount.toLocaleString()} from ${pmName}`,
      html,
      type: 'PAYMENT_REQUEST',
    })
    return result.success
  }

  async sendCredibilityRequestEmail(params: {
    email: string
    tenantName: string
    propertyAddress: string
    requestLink: string
    isRegisteredPm?: boolean
  }): Promise<boolean> {
    const { email, tenantName, propertyAddress, requestLink, isRegisteredPm } = params

    const html = buildCredibilityRequestHtml({
      tenantName,
      propertyAddress,
      requestLink,
      isRegisteredPm,
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject: `Record Request from ${tenantName} for ${propertyAddress}`,
      html,
      type: 'CREDIBILITY_REQUEST',
    })
    return result.success
  }

  async sendNewUserRecordsEmail(params: {
    email: string
    pmName: string
    propertyAddress: string
    completeProfileLink: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, pmName, propertyAddress, completeProfileLink, pmUuid } = params

    const html = buildNewUserRecordsHtml({
      pmName,
      propertyAddress,
      completeProfileLink,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `Your past rent records have been added on Upward`,
      html,
      type: 'NEW_USER_RECORDS',
    })
    return result.success
  }

  async sendLandlordWelcome(params: {
    email: string
    landlordName: string
    tempPassword: string
    portalLink: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, landlordName, tempPassword, portalLink, pmUuid } = params

    const html = buildLandlordWelcomeHtml({
      landlordName,
      tempPassword,
      portalLink,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `Welcome to Upward Landlord Portal`,
      html,
      type: 'LANDLORD_WELCOME',
    })
    return result.success
  }

  async sendLandlordNewPropertyAssignment(params: {
    email: string
    landlordName: string
    portalLink: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, landlordName, portalLink, pmUuid } = params

    const html = buildLandlordNewPropertyAssignmentHtml({
      landlordName,
      portalLink,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `New Property Added to Your Upward Portfolio`,
      html,
      type: 'LANDLORD_NEW_PROPERTY_ASSIGNMENT',
    })
    return result.success
  }

  async sendRecordAddedEmail(params: {
    email: string
    pmName: string
    propertyAddress: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, pmName, propertyAddress, pmUuid } = params

    const html = buildRecordAddedHtml({
      pmName,
      propertyAddress,
      frontendUrl: this.frontendUrl,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `New rent records added by ${pmName} for ${propertyAddress}`,
      html,
      type: 'RECORD_ADDED',
    })
    return result.success
  }

  async sendDataDeletionRequestConfirmation(email: string) {
    const html = buildDataDeletionRequestConfirmationHtml()

    const result = await this.sendEmailWithRetry({
      email,
      subject: 'Confirm your data deletion request',
      html,
      type: 'DATA_DELETION_REQUEST',
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send data deletion confirmation')
    }
    return { success: true }
  }

  async sendTeamInvitation(params: {
    email: string
    name: string
    inviterName: string
    isNewAccount: boolean
    claimLink: string
  }) {
    const { email, name, inviterName, isNewAccount, claimLink } = params

    const html = buildTeamInvitationHtml({
      name,
      inviterName,
      isNewAccount,
      claimLink,
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject: `Collaboration Invite from ${inviterName}`,
      html,
      type: 'TEAM_INVITATION',
    })
    if (!result.success) {
      throw new Error(result.error || 'Failed to send team invitation')
    }
  }

  async sendPmAuthOTP(email: string, otp: string, context: 'SIGNUP' | 'LOGIN') {
    const contexts = {
      SIGNUP: {
        title: 'Create Your PM Account',
        message:
          'Welcome to the Upward Property Management platform. Use the code below to verify your email and start managing your properties.',
        subject: `Verify your Upward PM account: ${otp}`,
      },
      LOGIN: {
        title: 'Secure Portal Login',
        message:
          'A login attempt was made for your Upward PM account. Use the verification code below to securely access your dashboard.',
        subject: `Your Upward PM Login Code: ${otp}`,
      },
    }

    const { title, message, subject } = contexts[context]

    const html = buildOtpEmailHtml({
      theme: 'PM',
      brandName: 'Upward PM',
      brandSub: 'Property Management Platform',
      title,
      message,
      otp,
      expiryText: 'This code expires in 10 minutes. If you did not request this, please ignore this email.',
      isPm: true,
    })

    const result = await this.sendEmailWithRetry({
      email,
      subject,
      html,
      type: `PM_${context}`,
    })
    if (!result.success) {
      throw new Error(result.error || `Failed to send PM ${context} OTP`)
    }
  }

  async sendJoinRequestRejection(params: {
    email: string
    tenantName: string
    pmName: string
    propertyAddress: string
    reason?: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, tenantName, pmName, propertyAddress, reason, pmUuid } = params

    const html = buildJoinRequestRejectionHtml({
      tenantName,
      pmName,
      propertyAddress,
      reason,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `Update on your connection request for ${propertyAddress}`,
      html,
      type: 'JOIN_REQUEST_REJECTION',
    })
    return result.success
  }

  async sendCredibilityRequestRejection(params: {
    email: string
    tenantName: string
    pmName: string
    propertyAddress: string
    reason?: string
    pmUuid?: string
  }): Promise<boolean> {
    const { email, tenantName, pmName, propertyAddress, reason, pmUuid } = params

    const html = buildCredibilityRequestRejectionHtml({
      tenantName,
      propertyAddress,
      reason,
    })

    const result = await this.sendEmailWithRetry({
      pmUuid,
      email,
      subject: `Update on your record request for ${propertyAddress}`,
      html,
      type: 'CREDIBILITY_REQUEST_REJECTION',
    })
    return result.success
  }

  async sendCustomerSupportNotification(type: 'USER' | 'PM', relatedUserId?: string) {
    const csAdmins = await this.prisma.upward_admin.findMany({
      where: {
        OR: [
          { receivesSystemAlerts: true },
          { role: 'DEVELOPER' }
        ]
      },
      select: { email: true }
    });

    if (csAdmins.length === 0) return;

    const emails = csAdmins.map(admin => admin.email.includes(':') ? this.encryption.decrypt(admin.email) : admin.email);
    const subject = type === 'USER' ? 'A new user just joined UpwardPay' : 'A new PM just joined UpwardPM';
    const text = type === 'USER' 
      ? 'A new user just joined UpwardPay. Login to see their details and take action.'
      : 'A new PM just joined UpwardPM. Login to see their details and take action.';
    
    for (const email of emails) {
      await this.sendEmailWithRetry({
        userId: relatedUserId,
        email,
        subject,
        html: `<p>${text}</p>`,
        text,
        type: 'CUSTOMER_SUPPORT_NOTIFICATION',
        fromOverride: 'Upward Admin <admin@upward.com>'
      });
    }
  }

  async sendSystemAlertToAdmins(subject: string, text: string, relatedId?: string) {
    const csAdmins = await this.prisma.upward_admin.findMany({
      where: {
        OR: [
          { receivesSystemAlerts: true },
          { role: 'DEVELOPER' }
        ]
      },
      select: { email: true }
    });

    if (csAdmins.length === 0) return;

    const emails = csAdmins.map(admin => admin.email.includes(':') ? this.encryption.decrypt(admin.email) : admin.email);
    
    for (const email of emails) {
      await this.sendEmailWithRetry({
        userId: relatedId,
        email,
        subject,
        html: `<p>${text}</p>`,
        text,
        type: 'SYSTEM_ALERT',
        fromOverride: 'Upward System <admin@upward.com>'
      });
    }
  }

  async sendOnboardingSequenceEmail(params: {
    email: string
    firstName: string
    stage: 'WELCOME' | 'DAY_2' | 'DAY_5' | 'DAY_9' | 'DAY_14'
    userId?: string
  }): Promise<boolean> {
    const { email, firstName, stage, userId } = params
    
    let html = ''
    let subject = ''
    const appLink = `${this.frontendUrl}/signup?mode=login`
    const scoreLink = `${this.frontendUrl}/signup?mode=login`
    const guideLink = `${this.frontendUrl}/signup?mode=login`
    const formattedFirstName = formatName(firstName)

    switch (stage) {
      case 'WELCOME':
        html = buildSequenceWelcomeHtml({ firstName: formattedFirstName, loginLink: `${this.frontendUrl}/signup?mode=login` })
        subject = 'Welcome to Upward! 🎉'
        break
      case 'DAY_2':
        html = buildSequenceDay2Html({ firstName: formattedFirstName, scoreLink })
        subject = "See what's building your rental reputation"
        break
      case 'DAY_5':
        html = buildSequenceDay5Html({ firstName: formattedFirstName, guideLink })
        subject = "Most tenants don't realize this..."
        break
      case 'DAY_9':
        html = buildSequenceDay9Html({ firstName: formattedFirstName, appLink })
        subject = "I didn't expect to enjoy paying rent."
        break
      case 'DAY_14':
        html = buildSequenceDay14Html({ firstName: formattedFirstName, appLink })
        subject = "You're just getting started with Upward 🎉"
        break
    }

    const result = await this.sendEmailWithRetry({
      userId,
      email,
      subject,
      html,
      type: `ONBOARDING_SEQUENCE_${stage}`,
    })
    
    return result.success
  }
}
