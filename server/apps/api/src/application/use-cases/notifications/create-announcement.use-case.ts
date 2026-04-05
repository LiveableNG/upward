import { Inject, Injectable } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '@domains/notifications/notification.repository'

@Injectable()
export class CreateAnnouncementUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(data: { title: string; message: string; iconType: string }) {
    // 1. Deactivate all existing announcements
    await this.notificationRepository.deactivateAllAnnouncements()

    // 2. Create the new one
    return this.notificationRepository.createAnnouncement(data)
  }
}
