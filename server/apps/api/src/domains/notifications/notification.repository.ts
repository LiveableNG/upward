export interface Announcement {
  id: number
  uuid: string
  title: string
  message: string
  iconType: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserAnnouncementState {
  id: number
  uuid: string
  userId: number
  announcementId: number
  seenPopup: boolean
  interactedPopup: boolean
  seenBanner: boolean
  interactedBanner: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: number
  uuid: string
  userId: number
  title: string
  message: string
  type: string
  url?: string
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NotificationRepository {
  // Announcements
  createAnnouncement(data: {
    title: string
    message: string
    iconType: string
  }): Promise<Announcement>
  findActiveAnnouncement(): Promise<Announcement | null>
  findAllAnnouncements(): Promise<Announcement[]>
  deactivateAllAnnouncements(): Promise<void>

  // Announcement State (User interactions)
  getAnnouncementState(
    userId: number,
    announcementId: number,
  ): Promise<UserAnnouncementState | null>
  upsertAnnouncementState(data: {
    userId: number
    announcementId: number
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }): Promise<void>

  // Direct Notifications
  createNotification(data: {
    userId: number
    title: string
    message: string
    type: string
    url?: string
  }): Promise<Notification>
  findUserNotifications(userId: number): Promise<Notification[]>
  markNotificationAsRead(notificationId: number): Promise<void>
  countUnreadNotifications(userId: number): Promise<number>
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY')
