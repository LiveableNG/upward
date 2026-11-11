import { Inject, Injectable, Logger } from '@nestjs/common'
import { PushNotificationService } from './push-notification.service'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../../../domains/notifications/notification.repository'
import { PrismaDeviceTokenRepository } from '../prisma/repositories/prisma-device-token.repository'

export type NotificationType =
  | 'SYSTEM'
  | 'SUPPORT'
  | 'PAYMENT'
  | 'RENT_REMINDER'
  | 'VAULT_DOCUMENT'
  | 'CREDIBILITY'
  | (string & {})

export interface NotificationPayload {
  title: string
  message: string
  type: NotificationType
  url?: string
  data?: Record<string, string>
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    private readonly pushService: PushNotificationService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepository,
    private readonly deviceTokenRepo: PrismaDeviceTokenRepository,
  ) {}

  async notifyUser(userId: number, payload: NotificationPayload): Promise<void> {
    try {
      const inApp = await this.notificationRepo.createNotification({
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        url: payload.url,
      })

      const tokens = await this.deviceTokenRepo.findTokensByUserId(userId)

      if (tokens.length > 0) {
        await this.pushService.sendToTokens(tokens, {
          title: payload.title,
          body: payload.message,
          data: {
            notification_uuid: inApp.uuid,
            type: payload.type,
            url: payload.url || '',
            ...(payload.data || {}),
          },
        })
      }
    } catch (error) {
      this.logger.error(`Failed to notify user ${userId}`, error)
    }
  }

  async broadcastPush(payload: Omit<NotificationPayload, 'type'> & { type?: string }): Promise<{ totalRecipients: number; sent: number; failed: number }> {
    const tokens = await this.deviceTokenRepo.findAllTokens()
    if (tokens.length === 0) {
      return { totalRecipients: 0, sent: 0, failed: 0 }
    }
    const result = await this.pushService.sendToTokens(tokens, {
      title: payload.title,
      body: payload.message,
      data: {
        type: payload.type || 'SYSTEM',
        url: payload.url || '',
        ...(payload.data || {}),
      },
    })
    return { totalRecipients: tokens.length, ...result }
  }

  async markAsRead(notificationUuid: string): Promise<void> {
    await this.notificationRepo.markNotificationAsReadByUuid(notificationUuid)
  }
}
