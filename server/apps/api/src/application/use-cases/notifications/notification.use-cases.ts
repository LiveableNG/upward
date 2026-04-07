import { Inject, Injectable } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '@domains/notifications/notification.repository'

@Injectable()
export class GetAdminAnnouncementsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute() {
    return this.notificationRepository.findAllAnnouncements()
  }
}

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(data: { userId: string; title: string; message: string; type: string }) {
    return this.notificationRepository.createNotification(data)
  }
}

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(userId: string) {
    // 1. Get active announcement
    const activeAnnouncement = await this.notificationRepository.findActiveAnnouncement()

    let activeAnnouncementWithState = null
    if (activeAnnouncement) {
      const state = await this.notificationRepository.getAnnouncementState(
        userId,
        activeAnnouncement.id,
      )
      activeAnnouncementWithState = {
        ...activeAnnouncement,
        state: state || {
          seenPopup: false,
          interactedPopup: false,
          seenBanner: false,
          interactedBanner: false,
        },
      }
    }

    // 2. Get personal notifications
    const personalNotifications =
      await this.notificationRepository.findUserNotifications(userId)

    // 3. Get unread count
    const unreadCount = await this.notificationRepository.countUnreadNotifications(userId)

    // Calculate un-interacted announcement count (if active and not interacted)
    const announcementUnread =
      activeAnnouncementWithState && !activeAnnouncementWithState.state.interactedBanner ? 1 : 0

    return {
      activeAnnouncement: activeAnnouncementWithState,
      notifications: personalNotifications,
      unreadCount: unreadCount + announcementUnread,
    }
  }
}

@Injectable()
export class UpdateAnnouncementStateUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(data: {
    userId: string
    announcementId: string
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }) {
    return this.notificationRepository.upsertAnnouncementState(data)
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(notificationId: string) {
    return this.notificationRepository.markNotificationAsRead(notificationId)
  }
}
