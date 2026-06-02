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

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders() {
    this.logger.log('[ReminderService] Checking for scheduled reminders...');
    
    await this.processPmPaymentReminders();
    
    const now = new Date();
    if (now.getHours() === 9) {
      await this.processPmDailyCrons();
    }
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
    
    const decryptedBusinessName = pr.pm?.businessName ? this.encryption.decrypt(pr.pm.businessName) : '';
    const decryptedFirstName = pr.pm?.firstName ? this.encryption.decrypt(pr.pm.firstName) : '';
    const decryptedLastName = pr.pm?.lastName ? this.encryption.decrypt(pr.pm.lastName) : '';
    const pmName = decryptedBusinessName || `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Property Manager';
    
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

  async processPmDailyCrons() {
    this.logger.log('[ReminderService] Processing daily Property Manager rent digests...');
    const now = new Date();
    
    // Normalizing today to start of day local time
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Fetch all property managers
    const managers = await this.prisma.upward_property_manager.findMany();

    for (const pm of managers) {
      try {
        const pmEmail = pm.email ? this.encryption.decrypt(pm.email) : null;
        if (!pmEmail) continue;

        const pmFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName) : '';
        const pmLastName = pm.lastName ? this.encryption.decrypt(pm.lastName) : '';
        const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : '';
        const pmName = decryptedBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager';

        // Fetch all occupied units for this PM
        const units = await this.prisma.upward_pm_unit.findMany({
          where: {
            property: { pmId: pm.id },
            status: 'OCCUPIED',
            tenantId: { not: null },
            rentDueDate: { not: null }
          },
          include: {
            tenant: true,
            property: true
          }
        });

        const upcomingDigestItems: any[] = [];
        const overdueDigestItems: any[] = [];

        for (const unit of units) {
          const tenantName = unit.tenant 
            ? `${unit.tenant.firstNameEncrypted ? this.encryption.decrypt(unit.tenant.firstNameEncrypted) : ''} ${unit.tenant.lastNameEncrypted ? this.encryption.decrypt(unit.tenant.lastNameEncrypted) : ''}`.trim()
            : 'Tenant';

          const dueDate = new Date(unit.rentDueDate!);
          const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

          const diffTime = dueStart.getTime() - today.getTime();
          const daysDifference = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          // 1. Upcoming due date (3 days or 1 day left)
          if (daysDifference === 3 || daysDifference === 1) {
            const label = daysDifference === 1 ? 'tomorrow' : 'in 3 days';
            
            // Create PM in-app notification
            await this.prisma.upward_pm_notification.create({
              data: {
                pmId: pm.id,
                title: 'Upcoming Rent Due',
                message: `Rent for ${tenantName} in Unit ${unit.unitName} is due ${label} (NGN ${unit.rentAmount.toLocaleString()}).`,
                type: 'PAYMENT_DUE',
                isPopup: false,
                url: '/dashboard',
              }
            });

            upcomingDigestItems.push({
              tenantName,
              unitName: unit.unitName,
              propertyName: unit.property?.name || 'N/A',
              amount: unit.rentAmount,
              dueLabel: label,
              dueDate: unit.rentDueDate!.toDateString(),
            });
          }

          // 2. Overdue payments (1 day, 7 days, 14 days overdue)
          if (daysDifference < 0) {
            const daysOverdue = Math.abs(daysDifference);
            
            if (daysOverdue === 1 || daysOverdue === 7 || daysOverdue === 14) {
              const label = daysOverdue === 1 ? '1 day overdue' : `${daysOverdue} days overdue`;
              
              // Create PM in-app notification
              await this.prisma.upward_pm_notification.create({
                data: {
                  pmId: pm.id,
                  title: 'Rent Overdue ⚠️',
                  message: `Rent for ${tenantName} in Unit ${unit.unitName} is ${label} (NGN ${unit.rentAmount.toLocaleString()}).`,
                  type: 'PAYMENT_OVERDUE',
                  isPopup: daysOverdue === 7 || daysOverdue === 14, // Pop up modal for critical overdue milestones
                  url: '/dashboard',
                }
              });

              overdueDigestItems.push({
                tenantName,
                unitName: unit.unitName,
                propertyName: unit.property?.name || 'N/A',
                amount: unit.rentAmount,
                dueLabel: label,
                dueDate: unit.rentDueDate!.toDateString(),
              });
            }
          }
        }

        // 3. Send email if there are items in the digest
        if (upcomingDigestItems.length > 0 || overdueDigestItems.length > 0) {
          let emailHtml = `
            <div style="background-color: #fafae6; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #fffffb; border: 1px solid #e3e2cf; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 67, 50, 0.05);">
                <!-- Header Banner -->
                <div style="background-color: #1b4332; padding: 32px 24px; text-align: center;">
                  <h1 style="color: #fffff0; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Daily Rent Digest</h1>
                  <p style="color: #a3b899; font-size: 14px; margin: 8px 0 0 0;">Upward Property Management</p>
                </div>
                
                <!-- Content Area -->
                <div style="padding: 32px 24px;">
                  <p style="font-size: 16px; color: #2f3e35; margin-top: 0; line-height: 1.5;">Dear <strong>${pmName}</strong>,</p>
                  <p style="font-size: 14px; color: #506256; line-height: 1.5; margin-bottom: 24px;">Here is your daily summary of rent payment activities and outstanding records for your properties.</p>
          `;

          if (overdueDigestItems.length > 0) {
            emailHtml += `
              <div style="margin-top: 24px; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background-color: #fffafb;">
                <div style="background-color: #fde8e8; padding: 14px 18px; border-bottom: 1px solid #fee2e2;">
                  <h3 style="color: #991b1b; margin: 0; font-size: 15px; font-weight: 700;">
                    Overdue Rent Payments
                  </h3>
                </div>
                <div style="padding: 12px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid #fee2e2; text-align: left; font-size: 12px; color: #991b1b;">
                        <th style="padding: 10px; font-weight: 700;">Tenant & Unit</th>
                        <th style="padding: 10px; font-weight: 700;">Overdue By</th>
                        <th style="padding: 10px; font-weight: 700; text-align: right;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of overdueDigestItems) {
              emailHtml += `
                <tr style="border-bottom: 1px solid #f9ecec; font-size: 13px;">
                  <td style="padding: 10px;">
                    <strong style="color: #2f3e35;">${item.tenantName}</strong><br/>
                    <span style="font-size: 11px; color: #607366;">Unit ${item.unitName} &bull; ${item.propertyName}</span>
                  </td>
                  <td style="padding: 10px; color: #b91c1c; font-weight: 600;">${item.dueLabel}</td>
                  <td style="padding: 10px; text-align: right; font-weight: 700; color: #991b1b;">NGN ${item.amount.toLocaleString()}</td>
                </tr>
              `;
            }

            emailHtml += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }

          if (upcomingDigestItems.length > 0) {
            emailHtml += `
              <div style="margin-top: 28px; border: 1px solid #fdf6e2; border-radius: 12px; overflow: hidden; background-color: #fffdf9;">
                <div style="background-color: #fef3c7; padding: 14px 18px; border-bottom: 1px solid #fdf6e2;">
                  <h3 style="color: #92400e; margin: 0; font-size: 15px; font-weight: 700;">
                    Upcoming Due Dates
                  </h3>
                </div>
                <div style="padding: 12px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="border-bottom: 1px solid #fdf6e2; text-align: left; font-size: 12px; color: #92400e;">
                        <th style="padding: 10px; font-weight: 700;">Tenant & Unit</th>
                        <th style="padding: 10px; font-weight: 700;">Due In</th>
                        <th style="padding: 10px; font-weight: 700; text-align: right;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of upcomingDigestItems) {
              emailHtml += `
                <tr style="border-bottom: 1px solid #fdf6e2; font-size: 13px;">
                  <td style="padding: 10px;">
                    <strong style="color: #2f3e35;">${item.tenantName}</strong><br/>
                    <span style="font-size: 11px; color: #607366;">Unit ${item.unitName} &bull; ${item.propertyName}</span>
                  </td>
                  <td style="padding: 10px; color: #d97706; font-weight: 600;">Due ${item.dueLabel}</td>
                  <td style="padding: 10px; text-align: right; font-weight: 700; color: #92400e;">NGN ${item.amount.toLocaleString()}</td>
                </tr>
              `;
            }

            emailHtml += `
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }

          emailHtml += `
                  <div style="margin-top: 36px; padding: 20px; background-color: #fafae6; border-radius: 12px; border: 1px solid #e3e2cf; text-align: center;">
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #506256; line-height: 1.5;">You can view and manage all properties, payments, and notifications directly from your Upward dashboard.</p>
                    <a href="https://upward.ng/portal/dashboard" style="display: inline-block; background-color: #1b4332; color: #fffff0; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">Open PM Dashboard</a>
                  </div>
                  
                  <p style="margin-top: 32px; font-size: 11px; color: #88998e; text-align: center; border-top: 1px solid #e3e2cf; padding-top: 16px;">
                    This is an automated digest sent by Upward. Please do not reply directly to this email.
                  </p>
                </div>
              </div>
            </div>
          `;

          await this.emailService.sendEmailWithRetry({
            userId: pm.uuid,
            email: pmEmail,
            subject: `[Upward] Daily Rent Digest: ${upcomingDigestItems.length + overdueDigestItems.length} alerts`,
            html: emailHtml,
            type: 'PM_RENT_DIGEST'
          }).catch((err) => {
            this.logger.error(`Failed to send daily digest email to PM ${pmEmail}:`, err);
          });
        }
      } catch (err) {
        this.logger.error(`Failed to run daily rent digest for PM ${pm.id}:`, err);
      }
    }
  }
}
