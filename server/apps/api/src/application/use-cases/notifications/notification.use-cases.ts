import { Inject, Injectable } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '@domains/notifications/notification.repository'
import { USER_REPOSITORY, UserRepository } from '@domains/users/user.repository'

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
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(data: { userId: string; title: string; message: string; type: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new Error('User not found')

    return this.notificationRepository.createNotification({
      ...data,
      userId: user.id!,
    })
  }
}

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new Error('User not found')

    const numericUserId = user.id!

    // 1. Get active announcement
    const activeAnnouncement = await this.notificationRepository.findActiveAnnouncement()

    let activeAnnouncementWithState = null
    if (activeAnnouncement) {
      const state = await this.notificationRepository.getAnnouncementState(
        numericUserId,
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
      await this.notificationRepository.findUserNotifications(numericUserId)

    // 3. Get unread count
    const unreadCount = await this.notificationRepository.countUnreadNotifications(numericUserId)

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
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(data: {
    userId: string
    announcementId: string
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new Error('User not found')

    return this.notificationRepository.upsertAnnouncementState({
      ...data,
      userId: user.id!,
      announcementId: Number(data.announcementId),
    })
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(notificationId: string) {
    return this.notificationRepository.markNotificationAsRead(Number(notificationId))
  }
}
