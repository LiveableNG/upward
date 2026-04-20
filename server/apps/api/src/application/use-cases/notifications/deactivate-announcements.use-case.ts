import { Inject, Injectable } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../../../domains/notifications/notification.repository'

@Injectable()
export class DeactivateAnnouncementsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute() {
    return this.notificationRepository.deactivateAllAnnouncements()
  }
}
