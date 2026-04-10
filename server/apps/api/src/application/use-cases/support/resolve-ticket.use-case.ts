import { Injectable, Inject } from '@nestjs/common'
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../../domains/support/support.repository'
import { NotificationRepository, NOTIFICATION_REPOSITORY } from '../../../domains/notifications/notification.repository'

import { EmailService } from '../../../shared/infrastructure/email/email.service'

@Injectable()
export class ResolveTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly supportRepo: ISupportTicketRepository,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: NotificationRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(ticketId: number, responseMessage?: string) {
    const ticket = await this.supportRepo.update(ticketId, {
      status: 'RESOLVED',
      resolvedAt: new Date()
    })

    if (responseMessage) {
      await this.notificationRepo.createNotification({
        userId: ticket.userId,
        title: 'Support Ticket Resolved',
        message: responseMessage,
        type: 'SUPPORT'
      })

      if (ticket.user && ticket.user.email) {
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827; background-color: #f9fafb; padding: 40px; border-radius: 16px;">
            <div style="margin-bottom:32px;">
              <span style="color:#d97757;font-size:14px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Upward</span>
              <div style="color:#6B7280;font-size:12px;margin-top:4px;">by GoodTenants</div>
            </div>
            <h2 style="color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px; margin-top: 0;">Support Ticket Update</h2>
            <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">Hello ${ticket.user.firstName || ''},</p>
            <p style="font-size: 16px; color: #4b5563;">Your support ticket regarding <strong>"${ticket.message.substring(0, 50)}..."</strong> has been resolved with the following message from our team:</p>
            
            <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 12px; margin: 32px 0;">
              <p style="font-size: 15px; color: #111827; margin: 0; line-height: 1.6;">${responseMessage}</p>
            </div>

            <p style="font-size: 14px; color: #9ca3af; line-height: 1.5;">
              If you have any more issues, please don't hesitate to reach to the support hub again.
            </p>
          </div>
        `
        try {
          await this.emailService.sendGenericEmail(ticket.user.email, 'Update on your Support Ticket', html, ticket.userId.toString())
        } catch (e) {
          console.error('Failed to send support email', e)
        }
      }
    }
    return ticket
  }
}
