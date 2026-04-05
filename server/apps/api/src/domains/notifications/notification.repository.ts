export interface Announcement {
  id: string
  title: string
  message: string
  iconType: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TenantAnnouncementState {
  id: string
  tenantId: string
  announcementId: string
  seenPopup: boolean
  interactedPopup: boolean
  seenBanner: boolean
  interactedBanner: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  tenantId: string
  title: string
  message: string
  type: string
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
    tenantId: string,
    announcementId: string,
  ): Promise<TenantAnnouncementState | null>
  upsertAnnouncementState(data: {
    tenantId: string
    announcementId: string
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }): Promise<void>

  // Direct Notifications
  createNotification(data: {
    tenantId: string
    title: string
    message: string
    type: string
  }): Promise<Notification>
  findTenantNotifications(tenantId: string): Promise<Notification[]>
  markNotificationAsRead(notificationId: string): Promise<void>
  countUnreadNotifications(tenantId: string): Promise<number>
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY')
