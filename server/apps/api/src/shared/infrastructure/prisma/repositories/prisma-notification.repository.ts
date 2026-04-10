import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Announcement,
  Notification,
  NotificationRepository,
  UserAnnouncementState,
} from '../../../../domains/notifications/notification.repository'

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Announcements
  async createAnnouncement(data: {
    title: string
    message: string
    iconType: string
    url?: string
  }): Promise<Announcement> {
    const record = await this.prisma.upward_announcement.create({
      data: {
        title: data.title,
        message: data.message,
        iconType: data.iconType,
        url: data.url,
        isActive: true,
      },
    })
    return record as unknown as Announcement
  }

  async findActiveAnnouncement(): Promise<Announcement | null> {
    const record = await this.prisma.upward_announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return record as unknown as Announcement | null
  }

  async findAllAnnouncements(): Promise<Announcement[]> {
    const records = await this.prisma.upward_announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return records as unknown as Announcement[]
  }

  async deactivateAllAnnouncements(): Promise<void> {
    await this.prisma.upward_announcement.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })
  }

  // Announcement State
  async getAnnouncementState(
    userId: number,
    announcementId: number,
  ): Promise<UserAnnouncementState | null> {
    const record = await this.prisma.upward_user_announcement_state.findUnique({
      where: {
        userId_announcementId: {
          userId,
          announcementId,
        },
      },
    })
    return record as unknown as UserAnnouncementState | null
  }

  async upsertAnnouncementState(data: {
    userId: number
    announcementId: number
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }): Promise<void> {
    await this.prisma.upward_user_announcement_state.upsert({
      where: {
        userId_announcementId: {
          userId: data.userId,
          announcementId: data.announcementId,
        },
      },
      update: {
        seenPopup: data.seenPopup,
        interactedPopup: data.interactedPopup,
        seenBanner: data.seenBanner,
        interactedBanner: data.interactedBanner,
      },
      create: {
        userId: data.userId,
        announcementId: data.announcementId,
        seenPopup: data.seenPopup ?? false,
        interactedPopup: data.interactedPopup ?? false,
        seenBanner: data.seenBanner ?? false,
        interactedBanner: data.interactedBanner ?? false,
      },
    })
  }

  // Direct Notifications
  async createNotification(data: {
    userId: number
    title: string
    message: string
    type: string
    url?: string
  }): Promise<Notification> {
    const record = await this.prisma.upward_notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        url: data.url,
      },
    })
    return record as unknown as Notification
  }

  async findUserNotifications(userId: number): Promise<Notification[]> {
    const records = await this.prisma.upward_notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return records as unknown as Notification[]
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await this.prisma.upward_notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async countUnreadNotifications(userId: number): Promise<number> {
    return this.prisma.upward_notification.count({
      where: { userId, isRead: false },
    })
  }
}
