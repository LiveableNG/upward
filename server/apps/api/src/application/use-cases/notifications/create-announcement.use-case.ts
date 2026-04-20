import { Inject, Injectable } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../../../domains/notifications/notification.repository'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(data: { title: string; message: string; iconType: string; url?: string }) {
    // 1. Deactivate all existing announcements
    await this.notificationRepository.deactivateAllAnnouncements()

    // 2. Create the new one
    const announcement = await this.notificationRepository.createAnnouncement(data)

    // 3. Broadcast push notification
    await this.notificationService.broadcastPush({
      title: data.title,
      message: data.message,
      type: 'SYSTEM',
      url: data.url
    })

    return announcement
  }
}
