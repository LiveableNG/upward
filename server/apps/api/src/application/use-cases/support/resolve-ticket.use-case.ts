import { Injectable, Inject } from '@nestjs/common'
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../../domains/support/support.repository'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class ResolveTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly supportRepo: ISupportTicketRepository,
    private readonly notificationService: NotificationService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(ticketId: number, responseMessage?: string) {
    const ticket = await this.supportRepo.update(ticketId, {
      status: 'RESOLVED',
      resolvedAt: new Date()
    })

    if (responseMessage) {
      await this.notificationService.notifyUser(ticket.userId, {
        title: 'Support Ticket Resolved',
        message: responseMessage,
        type: 'SUPPORT',
        url: '/dashboard/support'
      })

      if (ticket.user && ticket.user.email) {
        try {
          await this.unifiedCommService.processCommunication({
            recipientEmail: ticket.user.email,
            recipientName: ticket.user.firstName || 'User',
            recipientRole: 'TENANT',
            registeredUserId: ticket.userId,
            type: 'SUPPORT_TICKET',
            context: {
              displayName: ticket.user.firstName || 'User',
              message: ticket.message.substring(0, 50),
              responseMessage,
            }
          })
        } catch (e) {
          console.error('Failed to send support email', e)
        }
      }
    }
    return ticket
  }
}
