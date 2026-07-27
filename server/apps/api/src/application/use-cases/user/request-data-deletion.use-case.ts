import { Injectable, Inject } from '@nestjs/common'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { InteractionEvent } from '../../../application/events/definition/interaction.event'

@Injectable()
export class RequestDataDeletionUseCase {
  constructor(
    private readonly emailService: EmailService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(email: string): Promise<{ success: boolean }> {
    // Send confirmation email/SMS/WhatsApp via Unified Communication Architecture
    await this.unifiedCommService.processCommunication({
      recipientEmail: email,
      recipientRole: 'TENANT',
      type: 'DATA_DELETION_REQUEST',
      context: { email },
    });

    // Log the interaction
    this.eventBus.publish(
      new InteractionEvent(
        `delete-req-${Date.now()}`,
        'CLICK',
        'DATA_DELETION_REQUEST',
        'PRIVACY',
        JSON.stringify({ email }),
      ),
    )

    return { success: true }
  }
}
