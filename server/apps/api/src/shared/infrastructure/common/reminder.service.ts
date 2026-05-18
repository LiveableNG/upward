import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { EncryptionService } from './encryption.service';

@Injectable()
export class UnifiedReminderService {
  private readonly logger = new Logger(UnifiedReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  // Run every hour to check for pending reminders
  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders() {
    this.logger.log('[ReminderService] Checking for scheduled reminders...');
    
    // 1. Process PM Payment Request Reminders
    await this.processPmPaymentReminders();
    
    // You can add more reminder types here (e.g., Document signing reminders, etc.)
  }

  private async processPmPaymentReminders() {
    const now = new Date();
    
    const pendingReminders = await this.prisma.upward_pm_payment_request.findMany({
      where: {
        status: 'PENDING',
        reminderFrequency: { not: 'NONE' },
        nextReminderAt: { lte: now },
      },
      include: {
        tenant: true,
        pm: true,
        unit: { include: { property: true } },
        paymentRequest: true,
      }
    });

    for (const pr of pendingReminders) {
      try {
        await this.sendPmPaymentReminder(pr);
        await this.updateNextReminder(pr);
      } catch (error: any) {
        this.logger.error(`Failed to send reminder for PR ${pr.uuid}: ${error.message}`);
      }
    }
  }

  private async sendPmPaymentReminder(pr: any) {
    const tenantEmail = pr.tenant?.emailEncrypted ? this.encryption.decrypt(pr.tenant.emailEncrypted) : null;
    const tenantName = pr.tenant?.firstNameEncrypted ? this.encryption.decrypt(pr.tenant.firstNameEncrypted) : 'Tenant';
    const pmName = pr.pm.businessName || `${pr.pm.firstName} ${pr.pm.lastName}`;
    
    if (!tenantEmail) return;

    const amount = `${pr.currency} ${pr.amount.toLocaleString()}`;
    const unitName = pr.unit.unitName;
    const propertyName = pr.unit.property.name;
    const baseUrl = process.env.FRONTEND_URL || 'https://upward.goodtenants.io';
    const paymentUrl = `${baseUrl}/pay/${pr.paymentRequest?.uuid || pr.uuid}`;

    // 1. Send Email
    await this.emailService.sendEmailWithRetry({
      userId: pr.tenant.uuid,
      email: tenantEmail,
      subject: `Reminder: Rent Payment for ${unitName} (${propertyName})`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; padding: 24px;">
          <h2 style="color: #166534;">Payment Reminder</h2>
          <p>Dear ${tenantName},</p>
          <p>This is a friendly reminder from <strong>${pmName}</strong> regarding your outstanding payment for <strong>${unitName}</strong> at ${propertyName}.</p>
          
          <div style="background: #fdfcf6; padding: 20px; border-radius: 8px; border: 1px solid #f1f0e0; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Amount Due</p>
            <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 700; color: #166534;">${amount}</p>
          </div>

          <p>Kindly settle this at your earliest convenience to keep your records up to date.</p>
          
          <a href="${paymentUrl}" style="display: inline-block; background: #166534; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px;">Pay Now</a>
          
          <p style="font-size: 12px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            If you have already made this payment, please ignore this message.
          </p>
        </div>
      `,
      type: 'PAYMENT_REMINDER'
    });

    // 2. In-App Notification (if tenant is registered)
    if (pr.tenant.emailHash) {
        const user = await this.prisma.upward_user.findUnique({
            where: { emailHash: pr.tenant.emailHash }
        });
        
        if (user) {
            await this.notificationService.notifyUser(user.id, {
                title: `Rent Reminder: ${unitName}`,
                message: `Hi ${tenantName}, this is a reminder to pay ${amount} for ${unitName} at ${propertyName}.`,
                type: 'RENT_REMINDER',
                url: `/dashboard/pay/${pr.paymentRequest?.uuid || pr.uuid}`
            });
        }
    }
    
    this.logger.log(`[ReminderService] Sent ${pr.reminderFrequency} reminder to ${tenantEmail} for PR ${pr.uuid}`);
  }

  private async updateNextReminder(pr: any) {
    const nextDate = new Date();
    
    switch (pr.reminderFrequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'EVERY_2_DAYS':
        nextDate.setDate(nextDate.getDate() + 2);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      default:
        // If frequency is NONE or unknown, don't schedule next
        await this.prisma.upward_pm_payment_request.update({
          where: { id: pr.id },
          data: { nextReminderAt: null }
        });
        return;
    }

    nextDate.setHours(9, 0, 0, 0);

    await this.prisma.upward_pm_payment_request.update({
      where: { id: pr.id },
      data: {
        nextReminderAt: nextDate,
        reminderCount: { increment: 1 }
      }
    });
  }
}
