import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { InteractionEvent } from '../../../application/events/definition/interaction.event'
import { Inject } from '@nestjs/common'

export interface TrackInteractionDto {
  visitorId: string
  type: string
  target: string
  abVariant?: string
  metadata?: string
}

@Injectable()
export class TrackInteractionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  async execute(dto: TrackInteractionDto, ip?: string, ua?: string): Promise<void> {
    this.eventBus.publish(
      new InteractionEvent(
        dto.visitorId,
        dto.type,
        dto.target,
        dto.abVariant ?? 'A',
        dto.metadata,
        ip,
        ua,
      ),
    )
  }
}
