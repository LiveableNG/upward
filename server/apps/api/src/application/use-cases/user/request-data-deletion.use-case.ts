import { Injectable, Inject } from '@nestjs/common'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { InteractionEvent } from '../../../application/events/definition/interaction.event'

@Injectable()
export class RequestDataDeletionUseCase {
  constructor(
    private readonly emailService: EmailService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(email: string): Promise<{ success: boolean }> {
    // Send confirmation email
    await this.emailService.sendDataDeletionRequestConfirmation(email)

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
