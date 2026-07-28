import { Controller, Get, Post, Query, Req, Res, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'
import {
  IWhatsappSequenceLogRepository,
  WHATSAPP_SEQUENCE_REPOSITORY,
} from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface'

@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name)

  constructor(
    private readonly configService: ConfigService,
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IWhatsappSequenceLogRepository,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified')
      return res.status(200).send(challenge)
    }
    this.logger.warn('WhatsApp webhook verification failed')
    return res.status(403).send('Forbidden')
  }

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    // Acknowledge immediately — Meta retries on slow/non-200 responses
    res.status(200).send('EVENT_RECEIVED')

    try {
      const body = req.body
      if (body?.object !== 'whatsapp_business_account') return

      const entries = Array.isArray(body.entry) ? body.entry : []
      for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : []
        for (const change of changes) {
          const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : []
          for (const statusEvent of statuses) {
            await this.processStatus(statusEvent)
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`WhatsApp webhook processing error: ${err?.message || err}`)
    }
  }

  private async processStatus(statusEvent: {
    id?: string
    status?: string
    timestamp?: string
  }) {
    const messageId = statusEvent?.id
    const status = statusEvent?.status
    if (!messageId || !status) return

    const at = statusEvent.timestamp
      ? new Date(Number(statusEvent.timestamp) * 1000)
      : new Date()

    if (status === 'delivered') {
      await this.sequenceRepository.markAsDelivered(messageId, at)
      this.logger.debug(`WhatsApp message ${messageId} marked delivered`)
    } else if (status === 'read') {
      await this.sequenceRepository.markAsRead(messageId, at)
      this.logger.debug(`WhatsApp message ${messageId} marked read`)
    }
  }
}
