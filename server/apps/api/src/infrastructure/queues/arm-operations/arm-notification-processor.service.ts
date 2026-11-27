import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ArmNotificationJobData } from '../../../domains/rent-savings/arm-job.interface'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'

export interface ArmNotificationProcessResult {
  status: 'sent' | 'already_notified' | 'not_found' | 'skipped'
  kind: ArmNotificationJobData['kind']
}

/**
 * Independent notification delivery processor running on the `arm-notifications` queue.
 *
 * Guarantees:
 * - Decoupled completely from the `arm-operations` financial queue (email outages NEVER re-run ARM).
 * - Stamps `notifiedUserAt` / `notifiedAdminAt` ONLY AFTER delivery actually succeeds.
 * - Throws on transient email delivery failure so BullMQ retries automatically over ~30+ minutes
 *   with exponential backoff (30s -> 1m -> 2m -> 4m -> 8m -> 16m).
 * - Deduplicates in-app notifications on retry so retrying a failed email never creates duplicate
 *   in-app / push alerts.
 */
@Injectable()
export class ArmNotificationProcessorService {
  private readonly logger = new Logger(ArmNotificationProcessorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Optional() private readonly notificationService?: NotificationService,
  ) {}

  private formatNaira(amountKobo?: bigint | null): string {
    const naira = Number(amountKobo || 0n) / 100
    return `₦${naira.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  private safeDecrypt(value?: string | null): string {
    if (!value) return ''
    try {
      return this.encryption.decrypt(value)
    } catch {
      return value
    }
  }

  private getAdminArmUrl(): string {
    const base = (
      this.configService.get<string>('ADMIN_SITE_URL') || 'https://admin.upward.goodtenants.io'
    )
      .split(',')[0]!
      .trim()
      .replace(/\/$/, '')
    return `${base}/arm-portfolio`
  }

  private getPaySavingsUrl(): string {
    const base = (
      this.configService.get<string>('PAY_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'https://upward.goodtenants.io'
    )
      .split(',')[0]!
      .trim()
      .replace(/\/$/, '')
    return `${base}/dashboard/savings`
  }

  async processNotification(data: ArmNotificationJobData): Promise<ArmNotificationProcessResult> {
    const job = await this.prisma.upward_arm_job.findUnique({
      where: { id: data.armJobId },
    })

    if (!job) {
      this.logger.warn(`ARM job ID ${data.armJobId} not found for notification [${data.kind}]`)
      return { status: 'not_found', kind: data.kind }
    }

    if (data.kind === 'USER_SUCCESS') {
      return this.handleUserSuccess(job)
    }
    if (data.kind === 'ADMIN_SUCCESS') {
      return this.handleAdminSuccess(job)
    }
    if (data.kind === 'ADMIN_FAILURE') {
      return this.handleAdminFailure(job, data.errorMessage, data.attemptCount)
    }

    return { status: 'skipped', kind: data.kind }
  }

  private async handleUserSuccess(job: any): Promise<ArmNotificationProcessResult> {
    if (job.notifiedUserAt) {
      return { status: 'already_notified', kind: 'USER_SUCCESS' }
    }

    if (job.status !== 'COMPLETED') {
      return { status: 'skipped', kind: 'USER_SUCCESS' }
    }

    // ONBOARD jobs don't send user funding emails; stamp and exit cleanly
    if (!job.userId || (job.jobType !== 'SUBSCRIBE' && job.jobType !== 'REDEEM')) {
      await this.prisma.upward_arm_job.updateMany({
        where: { id: job.id, notifiedUserAt: null },
        data: { notifiedUserAt: new Date() },
      })
      return { status: 'skipped', kind: 'USER_SUCCESS' }
    }

    const userContext = await this.loadUserContext(job.userId, job.vaultId)
    const formattedAmount = this.formatNaira(job.amountKobo)
    const userSavingsUrl = this.getPaySavingsUrl()
    const isSubscribe = job.jobType === 'SUBSCRIBE'
    const title = isSubscribe
      ? 'Rent Savings Funded & Invested'
      : 'Rent Savings Redemption Confirmed'
    const message = isSubscribe
      ? `Your deposit of ${formattedAmount} has been confirmed and invested in the ARM Money Market Fund (16% p.a.). Reference: ${job.reference}.`
      : `Your ARM Money Market Fund redemption of ${formattedAmount} has been processed. Reference: ${job.reference}.`

    // 1. In-app + Push notification (deduplicated on email retry so user never gets duplicate bell/push alerts)
    if (this.notificationService) {
      const existingInApp = this.prisma?.upward_notification
        ? await this.prisma.upward_notification
            .findFirst({
              where: { userId: job.userId, message: { contains: job.reference } },
              select: { id: true },
            })
            .catch(() => null)
        : null

      if (!existingInApp) {
        await this.notificationService.notifyUser(job.userId, {
          title,
          message,
          type: 'PAYMENT',
          url: '/dashboard/savings',
          data: {
            reference: job.reference,
            armInstructionId: job.armInstructionId || '',
            jobType: job.jobType,
          },
        })
      }
    }

    // 2. Email confirmation — throws on failure so BullMQ retries until Mailgun/SMTP delivers!
    if (userContext.email) {
      const emailSubject = isSubscribe
        ? `Deposit Confirmed: ${formattedAmount} Invested in Your Rent Vault`
        : `Redemption Confirmed: ${formattedAmount} Processed from Your Rent Vault`
      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #059669; margin: 0 0 12px;">${title}</h2>
          <p style="font-size: 15px; line-height: 1.6;">Hi ${userContext.firstName || 'there'},</p>
          <p style="font-size: 15px; line-height: 1.6;">${message}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #64748b;">Amount</td><td style="padding: 6px 0; font-weight: 700; text-align: right;">${formattedAmount}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Payment Reference</td><td style="padding: 6px 0; font-family: monospace; text-align: right;">${job.reference}</td></tr>
              ${
                job.armInstructionId
                  ? `<tr><td style="padding: 6px 0; color: #64748b;">ARM Instruction ID</td><td style="padding: 6px 0; font-family: monospace; text-align: right;">${job.armInstructionId}</td></tr>`
                  : ''
              }
            </table>
          </div>
          <p style="margin-top: 20px;">
            <a href="${userSavingsUrl}" style="background: #c2501f; color: #ffffff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">View Your Rent Vault</a>
          </p>
        </div>
      `
      const emailRes = await this.emailService.sendEmailWithRetry({
        userId: String(job.userId),
        email: userContext.email,
        subject: emailSubject,
        html,
        text: `${title}\n\n${message}\nARM Instruction ID: ${job.armInstructionId || 'N/A'}\nView vault: ${userSavingsUrl}`,
        type: isSubscribe ? 'SAVINGS_FUNDED' : 'SAVINGS_REDEEMED',
      })

      if (!emailRes?.success) {
        throw new Error(
          `User confirmation email delivery failed for ARM job ${job.uuid}: ${emailRes?.error || 'unknown email error'}`,
        )
      }
    }

    // Stamp ONLY after delivery succeeded
    await this.prisma.upward_arm_job.updateMany({
      where: { id: job.id, notifiedUserAt: null },
      data: { notifiedUserAt: new Date() },
    })

    return { status: 'sent', kind: 'USER_SUCCESS' }
  }

  private async handleAdminSuccess(job: any): Promise<ArmNotificationProcessResult> {
    if (job.notifiedAdminAt) {
      return { status: 'already_notified', kind: 'ADMIN_SUCCESS' }
    }

    if (job.status !== 'COMPLETED') {
      return { status: 'skipped', kind: 'ADMIN_SUCCESS' }
    }

    const userContext = await this.loadUserContext(job.userId, job.vaultId)
    const formattedAmount = this.formatNaira(job.amountKobo)
    const adminUrl = this.getAdminArmUrl()
    const actionLabel =
      job.jobType === 'SUBSCRIBE'
        ? 'Subscription Funded'
        : job.jobType === 'REDEEM'
          ? 'Redemption Processed'
          : 'Investor Onboarded'
    const subject = `[ARM Success] ${actionLabel}${job.amountKobo ? ` — ${formattedAmount}` : ''} (${userContext.fullName})`
    const text = `ARM job ${job.uuid} [${job.jobType}] succeeded.\nCustomer: ${userContext.fullName} (${userContext.email || 'N/A'})\nAmount: ${formattedAmount}\nReference: ${job.reference}\nARM Instruction ID: ${job.armInstructionId || 'N/A'}\nARM Tx ID: ${job.armTransactionId}\nVault UUID: ${userContext.vaultUuid || 'N/A'}\nAdmin Portal: ${adminUrl}`
    const htmlOverride = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #d1fae5; border-radius: 12px;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; text-transform: uppercase;">ARM ${job.jobType} SUCCEEDED</span>
        <h2 style="margin: 12px 0 8px; color: #0f172a;">${actionLabel}${job.amountKobo ? ` (${formattedAmount})` : ''}</h2>
        <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">The background ARM Connect operation completed atomically and the customer has been notified.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; background: #f8fafc; border-radius: 8px;">
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Customer</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${userContext.fullName} (${userContext.email || 'N/A'})</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Amount</td><td style="padding: 8px 12px; font-weight: 700; color: #059669; border-bottom: 1px solid #e2e8f0;">${formattedAmount}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reference</td><td style="padding: 8px 12px; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${job.reference}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">ARM Instruction ID</td><td style="padding: 8px 12px; font-family: monospace; color: #059669; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${job.armInstructionId || 'N/A'}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">ARM Transaction ID</td><td style="padding: 8px 12px; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${job.armTransactionId}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b;">Vault / Job UUID</td><td style="padding: 8px 12px; font-family: monospace;">${userContext.vaultUuid || 'N/A'} / ${job.uuid}</td></tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="${adminUrl}" style="background: #059669; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Inspect in ARM Portfolio</a>
        </p>
      </div>
    `

    const adminRes = await this.emailService.sendSystemAlertToAdmins(subject, text, {
      htmlOverride,
      type: 'ARM_FUNDING_SUCCESS',
    })

    if (adminRes && adminRes.attempted > 0 && adminRes.sent === 0) {
      throw new Error(
        `Admin success alert delivery failed for all ${adminRes.attempted} recipients on ARM job ${job.uuid}`,
      )
    }

    await this.prisma.upward_arm_job.updateMany({
      where: { id: job.id, notifiedAdminAt: null },
      data: { notifiedAdminAt: new Date() },
    })

    return { status: 'sent', kind: 'ADMIN_SUCCESS' }
  }

  private async handleAdminFailure(
    job: any,
    errorOverride?: string,
    attemptOverride?: number,
  ): Promise<ArmNotificationProcessResult> {
    if (job.notifiedAdminAt) {
      return { status: 'already_notified', kind: 'ADMIN_FAILURE' }
    }

    if (job.status !== 'FAILED') {
      return { status: 'skipped', kind: 'ADMIN_FAILURE' }
    }

    const userContext = await this.loadUserContext(job.userId, job.vaultId)
    const formattedAmount = this.formatNaira(job.amountKobo)
    const adminUrl = this.getAdminArmUrl()
    const errorMessage = errorOverride || job.lastError || 'Unknown ARM error'
    const attemptCount = attemptOverride ?? job.attempts

    const subject = `[ACTION REQUIRED] ARM ${job.jobType} Job Failed — ${formattedAmount} (${job.reference})`
    const text = `ARM background job FAILED and requires admin troubleshooting.\nJob UUID: ${job.uuid}\nIdempotency Key: ${job.idempotencyKey}\nJob Type: ${job.jobType}\nCustomer: ${userContext.fullName} (${userContext.email || 'N/A'})\nAmount: ${formattedAmount}\nReference: ${job.reference}\nARM Transaction ID: ${job.armTransactionId}\nAttempts: ${attemptCount}/${job.maxAttempts}\nError: ${errorMessage}\nNote: The user was NOT notified. Retry safely from Admin -> ARM Portfolio -> Background Jobs (${adminUrl}).`
    const htmlOverride = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #fecaca; border-radius: 12px;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 700; text-transform: uppercase;">ADMIN-ONLY ALERT • ARM ${job.jobType} FAILED</span>
        <h2 style="margin: 12px 0 8px; color: #991b1b;">ARM Background Execution Failed (${formattedAmount})</h2>
        <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">The customer was <strong>not</strong> notified. Please review the error below and retry from the ARM Portfolio Background Jobs queue once resolved.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; background: #f8fafc; border-radius: 8px;">
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Customer</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${userContext.fullName} (${userContext.email || 'N/A'})</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Amount</td><td style="padding: 8px 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${formattedAmount}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Reference</td><td style="padding: 8px 12px; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${job.reference}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Job UUID / Key</td><td style="padding: 8px 12px; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${job.uuid}<br/>${job.idempotencyKey}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">ARM Transaction ID</td><td style="padding: 8px 12px; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${job.armTransactionId}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0;">Attempts</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${attemptCount} / ${job.maxAttempts}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: 600; color: #dc2626; vertical-align: top;">Error Details</td><td style="padding: 8px 12px; font-family: monospace; color: #991b1b; word-break: break-word;">${errorMessage}</td></tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="${adminUrl}" style="background: #dc2626; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Open ARM Jobs Queue to Troubleshoot</a>
        </p>
      </div>
    `

    const adminRes = await this.emailService.sendSystemAlertToAdmins(subject, text, {
      htmlOverride,
      type: 'ARM_JOB_FAILED',
    })

    if (adminRes && adminRes.attempted > 0 && adminRes.sent === 0) {
      throw new Error(
        `Admin failure alert delivery failed for all ${adminRes.attempted} recipients on ARM job ${job.uuid}`,
      )
    }

    await this.prisma.upward_arm_job.updateMany({
      where: { id: job.id, notifiedAdminAt: null },
      data: { notifiedAdminAt: new Date() },
    })

    return { status: 'sent', kind: 'ADMIN_FAILURE' }
  }

  private async loadUserContext(userId: number | null, vaultId: number | null) {
    let firstName = ''
    let lastName = ''
    let email = ''
    let vaultUuid: string | null = null

    if (userId) {
      const user = await this.prisma.upward_user
        .findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, email: true },
        })
        .catch(() => null)
      if (user) {
        firstName = this.safeDecrypt(user.firstName)
        lastName = this.safeDecrypt(user.lastName)
        email = this.safeDecrypt(user.email)
      }
    }

    if (vaultId) {
      const vault = await this.prisma.upward_rent_vault
        .findUnique({
          where: { id: vaultId },
          select: { uuid: true },
        })
        .catch(() => null)
      vaultUuid = vault?.uuid || null
    }

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || (userId ? `User #${userId}` : 'Unknown User'),
      email,
      vaultUuid,
    }
  }
}
